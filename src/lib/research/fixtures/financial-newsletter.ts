/**
 * Seeded fixtures for the financial-newsletter vertical -
 * "a retirement income newsletter targeting near-retirees worried about inflation."
 *
 * These power two things:
 * 1. The live-call fallback: when Bright Data or Azure are unconfigured (or fail),
 *    the engine still returns compelling, realistic, citation-rich intelligence so
 *    the product demos with zero credentials.
 * 2. Deterministic tests: providers, the orchestrator merge, and the analyzer are
 *    all exercised against this data with no network.
 *
 * Everything here is hand-authored to read like real audience research: competitor
 * ad copy in DR style, Reddit pain points in the audience's own words, rising
 * search trends, and synthesized personas - each with source citations.
 */

import type {
  AudienceSegment,
  BuyingTrigger,
  CommunityInsight,
  CompetitorAd,
  Opportunity,
  PainPoint,
  SourceCitation,
  TrendSignal,
} from "../standard-models";

/** Stable timestamp so fixture-derived citations are deterministic in tests. */
export const FIXTURE_FETCHED_AT = "2026-06-20T12:00:00.000Z";

/** Keywords that mark a query/topic as belonging to this vertical. */
export const FINANCIAL_NEWSLETTER_KEYWORDS = [
  "retire",
  "retirement",
  "near-retiree",
  "pre-retiree",
  "inflation",
  "income",
  "dividend",
  "pension",
  "401k",
  "ira",
  "annuit",
  "nest egg",
  "savings",
  "newsletter",
  "social security",
  "bond",
];

function cite(partial: Omit<SourceCitation, "fetchedAt"> & { fetchedAt?: string }): SourceCitation {
  return { fetchedAt: FIXTURE_FETCHED_AT, ...partial };
}

/* -------------------------------------------------------------------------- */
/* Competitor ads (DR-style financial newsletter creatives)                   */
/* -------------------------------------------------------------------------- */

export const competitorAdsFixture: CompetitorAd[] = [
  {
    platform: "meta",
    advertiser: "Motley Fool",
    creativeType: "image",
    copy: "The #1 Retirement Stock for 2026 (It's Not What You Think). 1,000s of near-retirees are quietly moving money into this one position before the next inflation wave.",
    hooksUsed: ["curiosity", "fomo", "social_proof"],
    estimatedSpend: "$25k-$50k/mo",
    dateRange: "Active since Apr 2026",
    engagementSignals: { reactions: 2143, comments: 318, shares: 196 },
    sources: [
      cite({
        provider: "competitor_ads",
        url: "https://www.facebook.com/ads/library/?q=motley%20fool%20retirement",
        title: "Meta Ad Library - Motley Fool retirement ads",
        snippet: "The #1 Retirement Stock for 2026 (It's Not What You Think)...",
        confidence: 0.82,
      }),
    ],
  },
  {
    platform: "meta",
    advertiser: "Stansberry Research",
    creativeType: "video",
    copy: "Inflation is quietly destroying your nest egg. Here's the 3-fund fix our analysts use to generate income that keeps up with rising prices - without gambling on crypto.",
    hooksUsed: ["fear", "urgency", "authority"],
    estimatedSpend: "$50k-$100k/mo",
    dateRange: "Active since Feb 2026",
    engagementSignals: { reactions: 3890, comments: 642, shares: 511 },
    sources: [
      cite({
        provider: "competitor_ads",
        url: "https://www.facebook.com/ads/library/?q=stansberry%20inflation",
        title: "Meta Ad Library - Stansberry Research inflation ads",
        snippet: "Inflation is quietly destroying your nest egg...",
        confidence: 0.8,
      }),
    ],
  },
  {
    platform: "google",
    advertiser: "Palm Beach Research Group",
    creativeType: "search",
    copy: "How to Generate $5,000/Month in Retirement Income Without Touching Your Principal. Free 2026 Income Blueprint - download instantly.",
    hooksUsed: ["specificity", "benefit", "lead_magnet"],
    estimatedSpend: "$10k-$25k/mo",
    dateRange: "Active since May 2026",
    engagementSignals: { ctr_estimate: 4 },
    sources: [
      cite({
        provider: "competitor_ads",
        url: "https://www.google.com/search?q=retirement+income+newsletter",
        title: "Google Ads - Palm Beach Research retirement income",
        snippet: "Generate $5,000/Month in Retirement Income Without Touching Your Principal...",
        confidence: 0.74,
      }),
    ],
  },
  {
    platform: "taboola",
    advertiser: "Banyan Hill / The Oxford Club",
    creativeType: "native",
    copy: "Warning: The 'Safe' 4% Rule Could Leave You Broke by 75. A former Wall Street insider reveals what near-retirees should do instead.",
    hooksUsed: ["fear", "contrarian", "authority"],
    estimatedSpend: "$25k-$50k/mo",
    dateRange: "Active since Mar 2026",
    engagementSignals: { ctr_estimate: 3 },
    sources: [
      cite({
        provider: "competitor_ads",
        url: "https://www.taboola.com/",
        title: "Taboola native - Oxford Club 4% rule",
        snippet: "The 'Safe' 4% Rule Could Leave You Broke by 75...",
        confidence: 0.68,
      }),
    ],
  },
  {
    platform: "meta",
    advertiser: "Retirement Watch",
    creativeType: "image",
    copy: "Forget CDs. This income strategy pays up to 8% - and it's IRA-approved. Get the plain-English guide built for people who hate Wall Street jargon.",
    hooksUsed: ["contrarian", "greed", "trust"],
    estimatedSpend: "$10k-$25k/mo",
    dateRange: "Active since Jan 2026",
    engagementSignals: { reactions: 1502, comments: 207, shares: 88 },
    sources: [
      cite({
        provider: "competitor_ads",
        url: "https://www.facebook.com/ads/library/?q=retirement%20watch",
        title: "Meta Ad Library - Retirement Watch income strategy",
        snippet: "Forget CDs. This income strategy pays up to 8%...",
        confidence: 0.7,
      }),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Community insights + pain points (audience's own words)                    */
/* -------------------------------------------------------------------------- */

export const communityInsightsFixture: CommunityInsight[] = [
  {
    sourceUrl: "https://www.reddit.com/r/retirement/comments/inflation_fear/",
    platform: "reddit",
    content:
      "I'm 61 and honestly terrified inflation is going to eat my savings before I even get to retire. Every year my grocery bill goes up and my 401k just sits there. I don't know who to trust anymore.",
    painPointExtracted: "Fear that inflation erodes savings before retirement begins",
    sentiment: -0.7,
    upvotes: 482,
    postedAt: "2026-05-14T09:12:00.000Z",
    sources: [
      cite({
        provider: "reddit_community",
        url: "https://www.reddit.com/r/retirement/comments/inflation_fear/",
        title: "r/retirement - terrified inflation eats my savings",
        snippet: "I'm 61 and honestly terrified inflation is going to eat my savings...",
        confidence: 0.78,
      }),
    ],
  },
  {
    sourceUrl: "https://www.reddit.com/r/Bogleheads/comments/newsletter_upsell/",
    platform: "reddit",
    content:
      "Every retirement newsletter I subscribe to just wants to upsell me into some 'secret' stock pick. I just want a plan I can actually trust and understand. Is that too much to ask?",
    painPointExtracted: "Distrust of upsell-heavy newsletters; wants a trustworthy, simple plan",
    sentiment: -0.5,
    upvotes: 391,
    postedAt: "2026-04-28T16:40:00.000Z",
    sources: [
      cite({
        provider: "reddit_community",
        url: "https://www.reddit.com/r/Bogleheads/comments/newsletter_upsell/",
        title: "r/Bogleheads - newsletters just want to upsell me",
        snippet: "Every retirement newsletter just wants to upsell me into some 'secret' stock...",
        confidence: 0.81,
      }),
    ],
  },
  {
    sourceUrl: "https://www.reddit.com/r/personalfinance/comments/cant_afford_65/",
    platform: "reddit",
    content:
      "My 401k took a big hit and now I genuinely don't know if I can afford to stop working at 65. I feel like I did everything right and I'm still behind. The anxiety is constant.",
    painPointExtracted: "Anxiety about not being able to afford to retire on time",
    sentiment: -0.75,
    upvotes: 644,
    postedAt: "2026-05-02T21:05:00.000Z",
    sources: [
      cite({
        provider: "reddit_community",
        url: "https://www.reddit.com/r/personalfinance/comments/cant_afford_65/",
        title: "r/personalfinance - can't afford to retire at 65",
        snippet: "My 401k took a big hit and now I don't know if I can afford to stop working at 65...",
        confidence: 0.79,
      }),
    ],
  },
  {
    sourceUrl: "https://www.reddit.com/r/financialindependence/comments/annuities_scam/",
    platform: "reddit",
    content:
      "Annuities feel like a scam but bonds barely keep up with inflation. What are actual near-retirees doing for income that won't blow up if the market drops the year I retire?",
    painPointExtracted: "Confusion over income vehicles (annuities vs bonds vs dividends) and sequence risk",
    sentiment: -0.4,
    upvotes: 287,
    postedAt: "2026-06-01T13:22:00.000Z",
    sources: [
      cite({
        provider: "reddit_community",
        url: "https://www.reddit.com/r/financialindependence/comments/annuities_scam/",
        title: "r/financialindependence - annuities vs bonds for retirees",
        snippet: "Annuities feel like a scam but bonds barely keep up with inflation...",
        confidence: 0.72,
      }),
    ],
  },
  {
    sourceUrl: "https://www.reddit.com/r/retirement/comments/plain_english/",
    platform: "reddit",
    content:
      "Why can't anyone explain this stuff in plain English? Every advisor talks in jargon - 'sequence of returns', 'tax-efficient drawdown' - just tell me what to do with my money so I can sleep at night.",
    painPointExtracted: "Frustration with financial jargon; wants plain-English guidance",
    sentiment: -0.45,
    upvotes: 358,
    postedAt: "2026-05-21T08:55:00.000Z",
    sources: [
      cite({
        provider: "reddit_community",
        url: "https://www.reddit.com/r/retirement/comments/plain_english/",
        title: "r/retirement - explain it in plain English",
        snippet: "Why can't anyone explain this stuff in plain English?...",
        confidence: 0.76,
      }),
    ],
  },
];

export const painPointsFixture: PainPoint[] = [
  {
    summary: "Inflation will erode savings faster than the nest egg can grow",
    quote: "I'm 61 and terrified inflation is going to eat my savings before I even get to retire.",
    intensity: 0.9,
    frequency: 0.85,
    sources: communityInsightsFixture[0].sources,
  },
  {
    summary: "Deep distrust of newsletters that bait with 'secret' picks and upsell relentlessly",
    quote: "Every retirement newsletter just wants to upsell me into some 'secret' stock pick.",
    intensity: 0.75,
    frequency: 0.8,
    sources: communityInsightsFixture[1].sources,
  },
  {
    summary: "Fear of not being able to afford to retire on schedule",
    quote: "I don't know if I can afford to stop working at 65. I did everything right and I'm still behind.",
    intensity: 0.85,
    frequency: 0.7,
    sources: communityInsightsFixture[2].sources,
  },
  {
    summary: "Paralyzed by conflicting income options and sequence-of-returns risk",
    quote: "Annuities feel like a scam but bonds barely keep up with inflation.",
    intensity: 0.65,
    frequency: 0.6,
    sources: communityInsightsFixture[3].sources,
  },
  {
    summary: "Overwhelmed by financial jargon; craves plain-English, actionable guidance",
    quote: "Just tell me what to do with my money so I can sleep at night.",
    intensity: 0.6,
    frequency: 0.75,
    sources: communityInsightsFixture[4].sources,
  },
];

/* -------------------------------------------------------------------------- */
/* Trend signals (rising search + topic demand)                               */
/* -------------------------------------------------------------------------- */

function series(base: number, points: number, growth: number): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const start = new Date("2026-01-01T00:00:00.000Z").getTime();
  const month = 1000 * 60 * 60 * 24 * 30;
  for (let i = 0; i < points; i++) {
    out.push({
      date: new Date(start + i * month).toISOString().slice(0, 10),
      value: Math.round(base * (1 + growth * i)),
    });
  }
  return out;
}

export const trendSignalsFixture: TrendSignal[] = [
  {
    topic: "how to protect retirement savings from inflation",
    velocity: 0.42,
    volume: 74000,
    sentiment: -0.3,
    source: "google_trends",
    timeSeries: series(40000, 6, 0.14),
    sources: [
      cite({
        provider: "search_intent",
        url: "https://www.google.com/search?q=how+to+protect+retirement+savings+from+inflation",
        title: "Rising: protect retirement savings from inflation",
        confidence: 0.7,
      }),
    ],
  },
  {
    topic: "best dividend stocks for retirement income 2026",
    velocity: 0.31,
    volume: 121000,
    sentiment: 0.2,
    source: "google_trends",
    timeSeries: series(90000, 6, 0.06),
    sources: [
      cite({
        provider: "search_intent",
        url: "https://www.google.com/search?q=best+dividend+stocks+for+retirement+income+2026",
        title: "Rising: dividend stocks for retirement income",
        confidence: 0.68,
      }),
    ],
  },
  {
    topic: "TIPS vs I bonds for retirees",
    velocity: 0.55,
    volume: 28000,
    sentiment: 0.1,
    source: "google_trends",
    timeSeries: series(12000, 6, 0.22),
    sources: [
      cite({
        provider: "search_intent",
        url: "https://www.google.com/search?q=TIPS+vs+I+bonds+for+retirees",
        title: "Breakout: TIPS vs I bonds for retirees",
        confidence: 0.66,
      }),
    ],
  },
  {
    topic: "safe withdrawal rate 2026",
    velocity: 0.18,
    volume: 49000,
    sentiment: -0.1,
    source: "google_trends",
    timeSeries: series(42000, 6, 0.03),
    sources: [
      cite({
        provider: "search_intent",
        url: "https://www.google.com/search?q=safe+withdrawal+rate+2026",
        title: "Steady: safe withdrawal rate",
        confidence: 0.62,
      }),
    ],
  },
  {
    topic: "Social Security COLA 2026 inflation",
    velocity: 0.48,
    volume: 203000,
    sentiment: -0.2,
    source: "news",
    timeSeries: series(80000, 6, 0.18),
    sources: [
      cite({
        provider: "news_industry",
        url: "https://www.cnbc.com/social-security-cola-2026/",
        title: "Social Security COLA for 2026 amid inflation",
        confidence: 0.71,
      }),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Buying triggers                                                            */
/* -------------------------------------------------------------------------- */

export const buyingTriggersFixture: BuyingTrigger[] = [
  {
    trigger: "A fresh inflation/CPI report makes rising prices feel personal",
    context: "Near-retirees notice grocery and healthcare costs climbing and search for protection.",
    urgency: "high",
    sources: trendSignalsFixture[0].sources,
  },
  {
    trigger: "A market drop or 401k statement shock near the retirement date",
    context: "Sequence-of-returns fear spikes right before or after retiring.",
    urgency: "high",
    sources: painPointsFixture[2].sources,
  },
  {
    trigger: "The annual Social Security COLA announcement",
    context: "COLA news reframes whether fixed income will keep pace with inflation.",
    urgency: "medium",
    sources: trendSignalsFixture[4].sources,
  },
  {
    trigger: "Crossing a milestone birthday (60, 62, 65)",
    context: "Eligibility and 'time is running out' framing drive planning urgency.",
    urgency: "medium",
    sources: painPointsFixture[2].sources,
  },
];

/* -------------------------------------------------------------------------- */
/* Personas (synthesized audience segments)                                   */
/* -------------------------------------------------------------------------- */

export const personasFixture: AudienceSegment[] = [
  {
    name: "Inflation-Anxious Pre-Retiree",
    demographics: {
      ageRange: "58-64",
      genderSplit: "52% female / 48% male",
      incomeBracket: "$75k-$150k household",
      education: "College-educated",
      location: "US suburban / Sun Belt",
    },
    psychographics: {
      values: ["security", "self-reliance", "honesty", "family legacy"],
      interests: ["personal finance", "travel planning", "health", "grandkids"],
      painPoints: [
        "Inflation eroding savings before retirement",
        "Distrust of upsell-heavy newsletters",
        "Financial jargon overwhelm",
      ],
      aspirations: ["Retire on time without fear", "A simple plan they can trust", "Sleep at night"],
    },
    behaviors: {
      platforms: ["facebook", "youtube", "email"],
      contentConsumption: ["long-form explainers", "free guides", "email newsletters"],
      purchasePatterns: ["researches heavily", "wary of hype", "responds to free lead magnets"],
    },
    sizeEstimate: { range: "4.2M-5.8M US near-retirees", confidence: 0.55 },
    sources: [communityInsightsFixture[0].sources[0], communityInsightsFixture[4].sources[0]],
  },
  {
    name: "Self-Directed Dividend Seeker",
    demographics: {
      ageRange: "55-68",
      genderSplit: "63% male / 37% female",
      incomeBracket: "$120k-$250k investable assets",
      education: "College / post-grad",
      location: "US nationwide",
    },
    psychographics: {
      values: ["transparency", "data over hype", "independence", "control"],
      interests: ["dividend investing", "Bogleheads", "index funds", "tax optimization"],
      painPoints: [
        "Income without drawing down principal",
        "Skeptical of annuities",
        "Sequence-of-returns risk",
      ],
      aspirations: ["Durable passive income", "Beat inflation safely", "DIY a credible plan"],
    },
    behaviors: {
      platforms: ["reddit", "youtube", "email", "x"],
      contentConsumption: ["data-rich analysis", "spreadsheets", "community threads"],
      purchasePatterns: ["values free proof first", "converts on transparency", "low tolerance for fluff"],
    },
    sizeEstimate: { range: "1.6M-2.4M self-directed near-retirees", confidence: 0.5 },
    sources: [communityInsightsFixture[1].sources[0], communityInsightsFixture[3].sources[0]],
  },
];

/* -------------------------------------------------------------------------- */
/* Opportunities (AI-detected openings)                                       */
/* -------------------------------------------------------------------------- */

export const opportunitiesFixture: Opportunity[] = [
  {
    title: "Own the 'plain-English, no-upsell' position",
    rationale:
      "The loudest, most repeated complaint is distrust of newsletters that bait-and-upsell. Competitors all lead with 'secret picks.' A transparent, jargon-free, education-first brand directly answers the highest-frequency pain with low competition.",
    type: "high_pain_low_competition",
    confidence: 0.72,
    sources: [painPointsFixture[1].sources[0], painPointsFixture[4].sources[0]],
  },
  {
    title: "Lead with inflation-protection (TIPS / I-bonds) before it saturates",
    rationale:
      "'TIPS vs I bonds for retirees' is a breakout query (velocity 0.55) with comparatively low ad coverage. Capturing this rising intent now positions the newsletter ahead of competitors still fixated on dividend picks.",
    type: "pre_saturation_trend",
    confidence: 0.64,
    sources: [trendSignalsFixture[2].sources[0]],
  },
  {
    title: "Message on security and trust, not greed",
    rationale:
      "Competitor hooks skew to greed/curiosity ('#1 stock', '8% yield'). The audience's language is fear and distrust. A security-and-trust angle is an open messaging lane that matches how near-retirees actually talk.",
    type: "messaging_gap",
    confidence: 0.68,
    sources: [competitorAdsFixture[0].sources[0], painPointsFixture[0].sources[0]],
  },
];
