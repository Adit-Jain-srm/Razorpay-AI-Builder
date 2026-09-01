import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { agentToolRegistry, defineTool, ToolRegistry, type ToolExecutionContext } from ".";

const ctx: ToolExecutionContext = { userId: "user-1" };

function makeEchoTool() {
  return defineTool({
    name: "echo",
    description: "Echoes the provided text",
    category: "test",
    parameters: z.object({ text: z.string() }),
    execute: async (params) => ({ ok: true, data: params.text }),
  });
}

describe("ToolRegistry + defineTool", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it("registers, finds, and lists tools by category", () => {
    registry.register(makeEchoTool());

    expect(registry.has("echo")).toBe(true);
    expect(registry.get("echo")?.description).toContain("Echoes");
    expect(registry.list()).toHaveLength(1);
    expect(registry.byCategory("test").map((t) => t.name)).toEqual(["echo"]);
    expect(registry.byCategory("other")).toHaveLength(0);
  });

  it("throws when registering a duplicate tool name", () => {
    registry.register(makeEchoTool());
    expect(() => registry.register(makeEchoTool())).toThrow(/already registered/);
  });

  it("validates arguments before executing", async () => {
    const tool = makeEchoTool();

    const ok = await tool.execute({ text: "hello" }, ctx);
    expect(ok).toEqual({ ok: true, data: "hello" });

    const bad = await tool.execute({ text: 123 }, ctx);
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/Invalid arguments/);
  });

  it("unregisters and clears tools", () => {
    registry.registerMany([makeEchoTool()]);
    registry.unregister("echo");
    expect(registry.has("echo")).toBe(false);

    registry.register(makeEchoTool());
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it("exposes a shared singleton instance", () => {
    expect(agentToolRegistry).toBeInstanceOf(ToolRegistry);
  });
});
