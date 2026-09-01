import { describe, expect, it } from "vitest";

import {
  buildPlanningPrompt,
  buildSuggestedActions,
  deriveConversationTitle,
  fallbackPlan,
  parsePlan,
  pickPendingStepForTool,
  summarizePlan,
} from "./plan";
import type { AgentPlanStep } from "./types";

describe("parsePlan", () => {
  it("parses a clean JSON plan and normalizes steps", () => {
    const text = '{"steps":[{"title":"Research","tool":"list_capabilities"},{"title":"Recommend"}]}';
    const plan = parsePlan(text, "my goal");

    expect(plan).not.toBeNull();
    expect(plan?.goal).toBe("my goal");
    expect(plan?.steps).toHaveLength(2);
    expect(plan?.steps[0]).toMatchObject({ id: "step-1", title: "Research", tool: "list_capabilities", status: "pending" });
    expect(plan?.steps[1]).toMatchObject({ id: "step-2", title: "Recommend", status: "pending" });
  });

  it("extracts JSON from a fenced code block", () => {
    const text = "Here is the plan:\n```json\n{\"steps\":[{\"title\":\"Only step\"}]}\n```\nThanks";
    const plan = parsePlan(text, "g");
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0].title).toBe("Only step");
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const text = 'Sure thing! {"steps":[{"title":"A"},{"title":"B"}]} Done.';
    const plan = parsePlan(text, "g");
    expect(plan?.steps.map((s) => s.title)).toEqual(["A", "B"]);
  });

  it("returns null for non-JSON, empty, or wrong-shape input", () => {
    expect(parsePlan("no json here", "g")).toBeNull();
    expect(parsePlan('{"steps":[]}', "g")).toBeNull(); // min 1 step
    expect(parsePlan('{"notSteps":1}', "g")).toBeNull();
  });
});

describe("fallbackPlan", () => {
  it("wires steps to the built-in tools that are available", () => {
    const plan = fallbackPlan("goal", ["list_capabilities", "summarize_context"]);
    const tools = plan.steps.map((s) => s.tool).filter(Boolean);
    expect(tools).toContain("list_capabilities");
    expect(tools).toContain("summarize_context");
    expect(plan.steps.every((s) => s.status === "pending")).toBe(true);
    expect(plan.goal).toBe("goal");
    expect(plan.steps[0].title).toMatch(/interpret/i);
  });

  it("degrades to interpret + recommend when no tools are available", () => {
    const plan = fallbackPlan("goal", []);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps.some((s) => s.tool)).toBe(false);
  });
});

describe("pickPendingStepForTool", () => {
  const steps: AgentPlanStep[] = [
    { id: "s1", title: "A", status: "pending" },
    { id: "s2", title: "B", tool: "x", status: "pending" },
  ];

  it("prefers a pending step that targets the tool", () => {
    expect(pickPendingStepForTool(steps, "x", new Set())?.id).toBe("s2");
  });

  it("falls back to the first untargeted pending step, respecting consumed ids", () => {
    expect(pickPendingStepForTool(steps, "y", new Set(["s2"]))?.id).toBe("s1");
  });

  it("returns undefined when nothing is left", () => {
    expect(pickPendingStepForTool(steps, "y", new Set(["s1", "s2"]))).toBeUndefined();
  });
});

describe("summarizePlan", () => {
  it("counts completed and skipped steps as done", () => {
    const result = summarizePlan({
      goal: "g",
      steps: [
        { id: "1", title: "a", status: "completed" },
        { id: "2", title: "b", status: "skipped" },
        { id: "3", title: "c", status: "running" },
      ],
    });
    expect(result).toEqual({ done: 2, total: 3 });
  });
});

describe("buildSuggestedActions", () => {
  it("returns at most 4 actionable, identified chips", () => {
    const actions = buildSuggestedActions({ goal: "sell newsletters", toolNames: ["list_capabilities"], mode: "demo" });
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.length).toBeLessThanOrEqual(4);
    for (const action of actions) {
      expect(action.id).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.prompt).toBeTruthy();
    }
    expect(actions.some((a) => a.id === "capabilities")).toBe(true);
    expect(actions.some((a) => a.id === "configure")).toBe(true); // demo mode hint
  });
});

describe("misc helpers", () => {
  it("buildPlanningPrompt includes the goal and tool names", () => {
    const prompt = buildPlanningPrompt("launch a campaign", [{ name: "research_audience", description: "d" }]);
    expect(prompt).toContain("launch a campaign");
    expect(prompt).toContain("research_audience");
  });

  it("deriveConversationTitle trims and truncates", () => {
    expect(deriveConversationTitle("  hello world  ")).toBe("hello world");
    expect(deriveConversationTitle("")).toBe("New conversation");
    expect(deriveConversationTitle("x".repeat(100))).toHaveLength(60);
  });
});
