import { beforeEach, describe, expect, it } from "vitest";

import type { NormalizedOutput } from "./provider";
import { ResearchProvider } from "./provider";
import { ResearchProviderRegistry, researchRegistry } from "./registry";
import type { StandardModel, StandardModelKind } from "./standard-models";

/** Minimal concrete provider for registry behavior tests. */
class FakeProvider extends ResearchProvider {
  constructor(
    readonly name: string,
    private readonly availability = true,
  ) {
    super();
  }

  readonly title = "Fake Provider";
  readonly description = "A no-op provider used only in tests";
  readonly produces: ReadonlyArray<StandardModelKind> = ["pain_point"];

  override isAvailable(): boolean {
    return this.availability;
  }

  transformQuery(): Record<string, unknown> {
    return {};
  }

  async extractData(): Promise<Record<string, unknown>> {
    return {};
  }

  transformData(): NormalizedOutput {
    return { items: [] as StandardModel[], sources: [] };
  }
}

describe("ResearchProviderRegistry", () => {
  let registry: ResearchProviderRegistry;

  beforeEach(() => {
    registry = new ResearchProviderRegistry();
  });

  it("registers, finds, and lists providers", () => {
    registry.register(new FakeProvider("alpha"));
    registry.register(new FakeProvider("beta"));

    expect(registry.has("alpha")).toBe(true);
    expect(registry.get("beta")?.name).toBe("beta");
    expect(registry.list().map((p) => p.name).sort()).toEqual(["alpha", "beta"]);
  });

  it("throws when registering a duplicate provider name", () => {
    registry.register(new FakeProvider("dup"));
    expect(() => registry.register(new FakeProvider("dup"))).toThrow(/already registered/);
  });

  it("excludes unavailable providers from available()", () => {
    registry.register(new FakeProvider("on", true));
    registry.register(new FakeProvider("off", false));

    expect(registry.available().map((p) => p.name)).toEqual(["on"]);
    expect(registry.list()).toHaveLength(2);
  });

  it("clears all registered providers", () => {
    registry.registerMany([new FakeProvider("a"), new FakeProvider("b")]);
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it("exposes a shared singleton instance", () => {
    expect(researchRegistry).toBeInstanceOf(ResearchProviderRegistry);
  });
});
