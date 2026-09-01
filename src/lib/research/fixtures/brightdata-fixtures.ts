/**
 * Bright Data SERP + scrape fixtures for the financial-newsletter vertical.
 *
 * These mimic the *shape* of real Bright Data output (`BrightDataSearchResponse`
 * with `results` / `relatedSearches` / `peopleAlsoAsk`, and `BrightDataScrapeResponse`
 * markdown) so that the providers' `transformData` runs the exact same code path on
 * fixtures as it does on live data. The fixture Bright Data client routes a query or
 * URL to the right fixture by intent keywords.
 */

import type {
  BrightDataScrapeResponse,
  BrightDataSearchResponse,
  SearchEngineInput,
} from "../brightdata";

const ENGINE = "google" as const;

function search(
  query: string,
  results: BrightDataSearchResponse["results"],
  extra: Partial<Pick<BrightDataSearchResponse, "relatedSearches" | "peopleAlsoAsk">> = {},
): BrightDataSearchResponse {
  return { query, engine: ENGINE, results, ...extra };
}

/* -------------------------------------------------------------------------- */
/* Competitor ads SERP (Meta Ad Library + Google + native)                    */
/* -------------------------------------------------------------------------- */

const serpCompetitorAds = search("retirement income newsletter ads", [
  {
    title: "Motley Fool - Retirement | Meta Ad Library",
    url: "https://www.facebook.com/ads/library/?q=motley%20fool%20retirement",
    snippet:
      "The #1 Retirement Stock for 2026 (It's Not What You Think). Thousands of near-retirees are quietly moving money into this one position before the next inflation wave.",
    position: 1,
  },
  {
    title: "Stansberry Research | Meta Ad Library",
    url: "https://www.facebook.com/ads/library/?q=stansberry%20inflation",
    snippet:
      "Inflation is quietly destroying your nest egg. Here's the 3-fund fix our analysts use to generate income that keeps up with rising prices - without gambling on crypto.",
    position: 2,
  },
  {
    title: "Palm Beach Research Group - Retirement Income",
    url: "https://www.google.com/search?q=retirement+income+newsletter",
    snippet:
      "How to Generate $5,000/Month in Retirement Income Without Touching Your Principal. Free 2026 Income Blueprint - download instantly.",
    position: 3,
  },
  {
    title: "The Oxford Club via Taboola - Sponsored",
    url: "https://www.taboola.com/oxford-club-4-percent-rule",
    snippet:
      "Warning: The 'Safe' 4% Rule Could Leave You Broke by 75. A former Wall Street insider reveals what near-retirees should do instead.",
    position: 4,
  },
  {
    title: "Retirement Watch | Meta Ad Library",
    url: "https://www.facebook.com/ads/library/?q=retirement%20watch",
    snippet:
      "Forget CDs. This income strategy pays up to 8% - and it's IRA-approved. Get the plain-English guide built for people who hate Wall Street jargon.",
    position: 5,
  },
]);

/* -------------------------------------------------------------------------- */
/* Search intent SERP (related searches + people also ask)                    */
/* -------------------------------------------------------------------------- */

const serpSearchIntent = search(
  "retirement income for near-retirees worried about inflation",
  [
    {
      title: "How to Protect Your Retirement Savings From Inflation - 2026 Guide",
      url: "https://www.investopedia.com/protect-retirement-from-inflation",
      snippet:
        "Inflation is the silent risk to fixed-income retirees. Strategies include TIPS, I bonds, dividend growth, and delaying Social Security.",
      position: 1,
    },
    {
      title: "Best Dividend Stocks for Retirement Income in 2026",
      url: "https://www.fool.com/dividend-stocks-retirement-2026",
      snippet: "Dividend growth stocks can provide rising income that helps offset inflation over a 30-year retirement.",
      position: 2,
    },
  ],
  {
    relatedSearches: [
      "how to protect retirement savings from inflation",
      "best dividend stocks for retirement income 2026",
      "TIPS vs I bonds for retirees",
      "safe withdrawal rate 2026",
      "annuities vs dividend investing for retirees",
      "sequence of returns risk explained",
    ],
    peopleAlsoAsk: [
      { question: "How do I protect my retirement income from inflation?", answer: "Diversify into inflation-linked assets like TIPS and I bonds, plus dividend growth." },
      { question: "Is the 4% rule still safe in 2026?", answer: "Many advisors now suggest 3.3%-3.7% given higher inflation and valuations." },
      { question: "What is the best newsletter for retirement income?", answer: "Look for transparent, education-first publishers over hype-driven stock pickers." },
      { question: "How much do I need to retire with inflation?", answer: "A common heuristic is 25x annual spending, adjusted upward for sustained inflation." },
    ],
  },
);

/* -------------------------------------------------------------------------- */
/* Reddit / community SERP                                                     */
/* -------------------------------------------------------------------------- */

const serpReddit = search("site:reddit.com near-retirees inflation savings", [
  {
    title: "I'm terrified inflation will eat my savings before I retire : r/retirement",
    url: "https://www.reddit.com/r/retirement/comments/inflation_fear/",
    snippet:
      "I'm 61 and honestly terrified inflation is going to eat my savings before I even get to retire. My grocery bill goes up every year and my 401k just sits there.",
    position: 1,
  },
  {
    title: "Every retirement newsletter just wants to upsell me : r/Bogleheads",
    url: "https://www.reddit.com/r/Bogleheads/comments/newsletter_upsell/",
    snippet:
      "Every retirement newsletter I subscribe to just wants to upsell me into some 'secret' stock pick. I just want a plan I can actually trust and understand.",
    position: 2,
  },
  {
    title: "Don't know if I can afford to retire at 65 anymore : r/personalfinance",
    url: "https://www.reddit.com/r/personalfinance/comments/cant_afford_65/",
    snippet:
      "My 401k took a big hit and now I genuinely don't know if I can afford to stop working at 65. I feel like I did everything right and I'm still behind.",
    position: 3,
  },
  {
    title: "Annuities feel like a scam but bonds barely keep up : r/financialindependence",
    url: "https://www.reddit.com/r/financialindependence/comments/annuities_scam/",
    snippet:
      "Annuities feel like a scam but bonds barely keep up with inflation. What are actual near-retirees doing for income that won't blow up if the market drops?",
    position: 4,
  },
  {
    title: "Why can't anyone explain retirement in plain English : r/retirement",
    url: "https://www.reddit.com/r/retirement/comments/plain_english/",
    snippet:
      "Why can't anyone explain this stuff in plain English? Every advisor talks in jargon. Just tell me what to do with my money so I can sleep at night.",
    position: 5,
  },
]);

/* -------------------------------------------------------------------------- */
/* News / industry SERP                                                        */
/* -------------------------------------------------------------------------- */

const serpNews = search("retirement inflation news 2026", [
  {
    title: "Inflation ticks up to 3.4%, squeezing fixed-income retirees",
    url: "https://www.cnbc.com/2026/inflation-retirees-3-4-percent",
    snippet:
      "The latest CPI print showed prices rising faster than expected, renewing pressure on retirees who depend on fixed income.",
    position: 1,
  },
  {
    title: "Social Security COLA for 2026 announced amid inflation concerns",
    url: "https://www.marketwatch.com/social-security-cola-2026",
    snippet:
      "The cost-of-living adjustment aims to help beneficiaries keep pace, but advocates warn it understates real senior inflation.",
    position: 2,
  },
  {
    title: "Bond yields rise as Fed signals higher-for-longer rates",
    url: "https://www.bloomberg.com/fed-higher-for-longer-2026",
    snippet:
      "Rising yields create both risk and opportunity for near-retirees rethinking their fixed-income allocations.",
    position: 3,
  },
  {
    title: "Why near-retirees are rethinking the 4% rule in 2026",
    url: "https://www.wsj.com/four-percent-rule-2026",
    snippet:
      "Higher inflation and stretched valuations have advisors revisiting safe withdrawal assumptions for new retirees.",
    position: 4,
  },
]);

/* -------------------------------------------------------------------------- */
/* Social listening SERP (TikTok / X / YouTube)                                */
/* -------------------------------------------------------------------------- */

const serpSocial = search("retirement income inflation tiktok youtube", [
  {
    title: "3 ways to inflation-proof your retirement #retirementplanning - TikTok",
    url: "https://www.tiktok.com/@retirewithconfidence/video/inflation-proof",
    snippet:
      "Near-retirees are saving this 60-second breakdown of TIPS, I bonds, and dividend growth. 412K views, 38K likes.",
    position: 1,
  },
  {
    title: "The 4% rule is dead. Here's what I tell my parents - YouTube",
    url: "https://www.youtube.com/watch?v=four-percent-dead",
    snippet:
      "Short explainer reframing safe withdrawal for 2026. Comments full of 'finally someone explains it simply.'",
    position: 2,
  },
  {
    title: "Dividends vs annuities for income - thread - X",
    url: "https://x.com/dividendgrowthguy/status/dividends-vs-annuities",
    snippet:
      "Why I'd rather build a dividend ladder than buy an annuity at today's rates. 1.2K reposts, lots of near-retiree replies.",
    position: 3,
  },
]);

/* -------------------------------------------------------------------------- */
/* Web intelligence SERP (competitor positioning / funnels)                    */
/* -------------------------------------------------------------------------- */

const serpWebIntel = search("retirement income newsletter positioning pricing", [
  {
    title: "Retirement Watch - Official Site",
    url: "https://www.retirementwatch.com/",
    snippet: "Plain-English retirement income strategies. Free report, then $99/yr premium.",
    position: 1,
  },
  {
    title: "Motley Fool Rule Your Retirement",
    url: "https://www.fool.com/rule-your-retirement/",
    snippet: "Model portfolios and step-by-step plans. $149/yr, frequent upsells to higher tiers.",
    position: 2,
  },
]);

/* -------------------------------------------------------------------------- */
/* Scrape (markdown) fixtures                                                  */
/* -------------------------------------------------------------------------- */

const scrapeRedditThread: BrightDataScrapeResponse = {
  url: "https://www.reddit.com/r/retirement/comments/inflation_fear/",
  markdown: `# I'm terrified inflation will eat my savings before I retire

I'm 61 and honestly terrified inflation is going to eat my savings before I even get to retire. My grocery bill goes up every single year and my 401k just sits there.

## Top comments

- "Same boat. I keep running the numbers and inflation makes them worse every time." (312 upvotes)
- "Every newsletter I try just wants to upsell me a 'secret' pick. I just want a plan I can trust." (288 upvotes)
- "Look into TIPS and I bonds - at least they're indexed to inflation." (164 upvotes)
- "Talk to a fee-only fiduciary, not a newsletter selling you something." (97 upvotes)
`,
};

const scrapeCompetitorHome: BrightDataScrapeResponse = {
  url: "https://www.retirementwatch.com/",
  markdown: `# Retirement Watch

## Plain-English retirement income strategies for people who hate Wall Street jargon

Get our free 2026 Retirement Income Blueprint. No hype. No secret picks.

- Free weekly newsletter (lead magnet)
- Premium membership: $99/yr
- "Lifetime" tier: $1,000+

Join 250,000+ readers protecting their nest egg from inflation.
`,
};

const scrapeNewsArticle: BrightDataScrapeResponse = {
  url: "https://www.cnbc.com/2026/inflation-retirees-3-4-percent",
  markdown: `# Inflation ticks up to 3.4%, squeezing fixed-income retirees

The latest CPI print showed prices rising faster than expected, renewing pressure on retirees who depend on fixed income. Analysts say near-retirees are increasingly searching for inflation protection such as TIPS, I bonds, and dividend growth strategies.
`,
};

const scrapeAdLibrary: BrightDataScrapeResponse = {
  url: "https://www.facebook.com/ads/library/?q=stansberry%20inflation",
  markdown: `# Stansberry Research - Active Ads

**Headline:** Inflation is quietly destroying your nest egg.

**Body:** Here's the 3-fund fix our analysts use to generate income that keeps up with rising prices - without gambling on crypto.

Active since Feb 2026. Estimated reach: 1M-5M.
`,
};

/* -------------------------------------------------------------------------- */
/* Matchers                                                                    */
/* -------------------------------------------------------------------------- */

/** Routes a search query to the most relevant fixture SERP by intent keywords. */
export function matchFixtureSearch(input: SearchEngineInput): BrightDataSearchResponse {
  const q = input.query.toLowerCase();
  if (/reddit|\br\/|quora|forum|community/.test(q)) return { ...serpReddit, query: input.query, engine: input.engine ?? ENGINE };
  if (/\bads?\b|ad library|ad-library|adlibrary|creatives?\b|competitor ad/.test(q))
    return { ...serpCompetitorAds, query: input.query, engine: input.engine ?? ENGINE };
  if (/\bnews\b|cpi|federal reserve|\bfed\b|\bcola\b|headline|market shift/.test(q))
    return { ...serpNews, query: input.query, engine: input.engine ?? ENGINE };
  if (/tiktok|youtube|twitter|x\.com|instagram|social|#\w+/.test(q))
    return { ...serpSocial, query: input.query, engine: input.engine ?? ENGINE };
  if (/positioning|pricing|funnel|landing|homepage|official site|review/.test(q))
    return { ...serpWebIntel, query: input.query, engine: input.engine ?? ENGINE };
  return { ...serpSearchIntent, query: input.query, engine: input.engine ?? ENGINE };
}

/** Routes a URL to the most relevant fixture scrape by domain. */
export function matchFixtureScrape(url: string): BrightDataScrapeResponse {
  const u = url.toLowerCase();
  if (u.includes("reddit.com")) return { ...scrapeRedditThread, url };
  if (u.includes("ads/library") || u.includes("facebook.com/ads")) return { ...scrapeAdLibrary, url };
  if (/cnbc|bloomberg|marketwatch|wsj|reuters|cnn|forbes/.test(u)) return { ...scrapeNewsArticle, url };
  return { ...scrapeCompetitorHome, url };
}

export const brightDataFixtures = {
  serpCompetitorAds,
  serpSearchIntent,
  serpReddit,
  serpNews,
  serpSocial,
  serpWebIntel,
  scrapeRedditThread,
  scrapeCompetitorHome,
  scrapeNewsArticle,
  scrapeAdLibrary,
};
