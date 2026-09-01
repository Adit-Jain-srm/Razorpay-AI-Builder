/**
 * Seeded fixtures barrel. The engine uses these for credential-free demos
 * (live-call fallback) and for deterministic, offline tests.
 */

export {
  FIXTURE_FETCHED_AT,
  FINANCIAL_NEWSLETTER_KEYWORDS,
  competitorAdsFixture,
  communityInsightsFixture,
  painPointsFixture,
  trendSignalsFixture,
  buyingTriggersFixture,
  personasFixture,
  opportunitiesFixture,
} from "./financial-newsletter";

export { brightDataFixtures, matchFixtureSearch, matchFixtureScrape } from "./brightdata-fixtures";

export { buildSeededReport, DEFAULT_SEED_QUERY } from "./report";
