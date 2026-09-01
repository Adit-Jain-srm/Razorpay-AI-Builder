import { beforeEach, describe, expect, it } from "vitest";

import { createBuiltinTools, registerBuiltinTools } from "./tools";
import { ToolRegistry, type AgentTool, type ToolExecutionContext } from "./types";

const ctx: ToolExecutionContext = { userId: "user-1" };

function freshRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registerBuiltinTools(registry);
  return registry;
}

function getTool(registry: ToolRegistry, name: string): AgentTool {
  const tool = registry.get(name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool;
}

describe("built-in tool registration", () => {
  it("registers the three built-ins and exposes them by category", () => {
    const registry = freshRegistry();
    expect(registry.list()).toHaveLength(3);
    expect(registry.has("navigate")).toBe(true);
    expect(registry.has("list_capabilities")).toBe(true);
    expect(registry.has("summarize_context")).toBe(true);
    expect(registry.byCategory("platform").map((t) => t.name).sort()).toEqual(["list_capabilities", "summarize_context"]);
    expect(registry.byCategory("navigation").map((t) => t.name)).toEqual(["navigate"]);
  });

  it("is idempotent - re-registering does not throw or duplicate", () => {
    const registry = freshRegistry();
    expect(() => registerBuiltinTools(registry)).not.toThrow();
    expect(registry.list()).toHaveLength(3);
  });

  it("createBuiltinTools returns tools bound to the given registry", () => {
    const registry = new ToolRegistry();
    const tools = createBuiltinTools(registry);
    expect(tools.map((t) => t.name).sort()).toEqual(["list_capabilities", "navigate", "summarize_context"]);
  });
});

describe("navigate", () => {
  let registry: ToolRegistry;
  beforeEach(() => {
    registry = freshRegistry();
  });

  it("resolves a known route to a navigation artifact", async () => {
    const result = await getTool(registry, "navigate").execute({ route: "/research" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("navigation");
    expect(result.data).toMatchObject({ href: "/research", label: "Research" });
  });

  it("normalizes a trailing slash", async () => {
    const result = await getTool(registry, "navigate").execute({ route: "/research/" }, ctx);
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ href: "/research" });
  });

  it("fails safe on an unknown route", async () => {
    const result = await getTool(registry, "navigate").execute({ route: "/nope" }, ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown route/);
  });

  it("rejects invalid arguments via the zod boundary", async () => {
    const result = await getTool(registry, "navigate").execute({}, ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid arguments/);
  });
});

describe("list_capabilities", () => {
  it("reports every registered tool grouped by category", async () => {
    const registry = freshRegistry();
    const result = await getTool(registry, "list_capabilities").execute({}, ctx);
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("capabilities");
    const data = result.data as { total: number; categories: { name: string }[] };
    expect(data.total).toBe(3);
    expect(data.categories.map((c) => c.name).sort()).toEqual(["navigation", "platform"]);
  });
});

describe("summarize_context", () => {
  it("summarizes the execution context and echoes the focus", async () => {
    const registry = freshRegistry();
    const result = await getTool(registry, "summarize_context").execute(
      { focus: "inflation" },
      { userId: "user-1", campaignId: "c1", conversationId: "v1" },
    );
    expect(result.ok).toBe(true);
    expect(result.artifact?.type).toBe("context-summary");
    const data = result.data as { campaignId?: string; focus?: string; note: string };
    expect(data.campaignId).toBe("c1");
    expect(data.focus).toBe("inflation");
    expect(data.note).toContain("c1");
  });
});
