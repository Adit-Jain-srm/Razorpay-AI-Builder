/**
 * Built-in research providers + registry bootstrap.
 *
 * `ensureProvidersRegistered()` is idempotent so it is safe to call from any
 * entry point (server action, API route) without risking the registry's
 * duplicate-name guard. Adding a provider = create the class and add it here.
 */

import { ResearchProviderRegistry, researchRegistry } from "../registry";
import type { ResearchProvider } from "../provider";
import { CompetitorAdsProvider } from "./competitor-ads";
import { SearchIntentProvider } from "./search-intent";
import { RedditCommunityProvider } from "./reddit";
import { NewsIndustryProvider } from "./news";
import { SocialListeningProvider } from "./social";
import { WebIntelligenceProvider } from "./web-intel";

export { CompetitorAdsProvider } from "./competitor-ads";
export { SearchIntentProvider } from "./search-intent";
export { RedditCommunityProvider } from "./reddit";
export { NewsIndustryProvider } from "./news";
export { SocialListeningProvider } from "./social";
export { WebIntelligenceProvider } from "./web-intel";

/** Fresh instances of every built-in provider (order = display order). */
export function createBuiltInProviders(): ResearchProvider[] {
  return [
    new CompetitorAdsProvider(),
    new SearchIntentProvider(),
    new RedditCommunityProvider(),
    new NewsIndustryProvider(),
    new SocialListeningProvider(),
    new WebIntelligenceProvider(),
  ];
}

/** Names of the built-in providers, in display order. */
export const BUILT_IN_PROVIDER_NAMES = createBuiltInProviders().map((p) => p.name);

/**
 * Registers every built-in provider into the given registry if not already
 * present. Idempotent and safe to call repeatedly (e.g. per request).
 */
export function ensureProvidersRegistered(registry: ResearchProviderRegistry = researchRegistry): ResearchProviderRegistry {
  for (const provider of createBuiltInProviders()) {
    if (!registry.has(provider.name)) registry.register(provider);
  }
  return registry;
}
