import type { ResearchProvider } from "./provider";

/**
 * Provider registry. Feature teams register a provider once and the orchestrator
 * discovers it - the "connect once, consume everywhere" pattern.
 */
export class ResearchProviderRegistry {
  private readonly providers = new Map<string, ResearchProvider>();

  register(provider: ResearchProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`Research provider already registered: ${provider.name}`);
    }
    this.providers.set(provider.name, provider);
  }

  registerMany(providers: ResearchProvider[]): void {
    for (const provider of providers) this.register(provider);
  }

  get(name: string): ResearchProvider | undefined {
    return this.providers.get(name);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  /** All registered providers. */
  list(): ResearchProvider[] {
    return [...this.providers.values()];
  }

  /** Providers that can run right now (respects Pro-tier availability). */
  available(): ResearchProvider[] {
    return this.list().filter((provider) => provider.isAvailable());
  }

  clear(): void {
    this.providers.clear();
  }
}

/** Shared singleton the providers + orchestrator use. */
export const researchRegistry = new ResearchProviderRegistry();
