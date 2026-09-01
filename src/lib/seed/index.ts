/**
 * MediaOS seeders. The Performance Intelligence analytics seeder + canonical
 * demo seed identity used by all modules.
 *
 * - `constants` is PURE (canonical demo ids, client-safe).
 * - `analytics-generator` is PURE (deterministic, test-safe).
 * - `targets` is PURE (builds seed targets from the credential-free fixtures).
 * - `analytics` (`seedAnalytics`) is SERVER ONLY: it reads real campaign/creative
 *   ids via the services and persists through `analyticsService`.
 */

export {
  DEMO_CAMPAIGN_ID,
  DEMO_CAMPAIGN_NAME,
  DEMO_CREATIVE_IDS,
  DEMO_LANDING_IDS,
  DEMO_LANDING_SLUG,
  DEMO_PAIN_POINTS,
  DEMO_RESEARCH_PROJECT_ID,
  DEMO_USER_ID,
  DEMO_VOCAB,
} from "./constants";
export { makeRng, type Rng } from "./rng";
export {
  generateMetrics,
  totalSpend,
  type GenerateOptions,
  type GeneratedDataset,
  type InjectedAnomaly,
  type MetricSeed,
  type SeedCampaignTarget,
  type SeedCreativeTarget,
} from "./analytics-generator";
export {
  ANALYTICS_DEMO_CAMPAIGN_ID,
  buildDemoCreativeMeta,
  buildDemoSeedTargets,
  demoPlatforms,
  labelFromContent,
} from "./targets";
export { collectSeedTargets, seedAnalytics, type SeedAnalyticsOptions, type SeedAnalyticsResult } from "./analytics";
