import type { Icon } from "@phosphor-icons/react";
import {
  ChatsCircle,
  Globe,
  Megaphone,
  MagnifyingGlass,
  Newspaper,
  Question,
  ShareNetwork,
} from "@phosphor-icons/react";

/** UI metadata for each research provider - labels, icons, ordering. */
export interface ProviderMeta {
  name: string;
  label: string;
  blurb: string;
  icon: Icon;
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  competitor_ads: { name: "competitor_ads", label: "Competitor Ads", blurb: "Active creatives + hooks", icon: Megaphone },
  search_intent: { name: "search_intent", label: "Search Intent", blurb: "Rising demand + questions", icon: MagnifyingGlass },
  reddit_community: { name: "reddit_community", label: "Reddit & Community", blurb: "Pain in their own words", icon: ChatsCircle },
  news_industry: { name: "news_industry", label: "News & Industry", blurb: "Market shifts + headlines", icon: Newspaper },
  social_listening: { name: "social_listening", label: "Social Listening", blurb: "Formats + share of voice", icon: ShareNetwork },
  web_intel: { name: "web_intel", label: "Web Intelligence", blurb: "Positioning + funnels", icon: Globe },
};

export const PROVIDER_ORDER = [
  "competitor_ads",
  "search_intent",
  "reddit_community",
  "news_industry",
  "social_listening",
  "web_intel",
];

export function getProviderMeta(name: string): ProviderMeta {
  return PROVIDER_META[name] ?? { name, label: prettify(name), blurb: "", icon: Question };
}

function prettify(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Platform badge label/tone for source platforms. */
export function platformLabel(platform: string | undefined): string {
  if (!platform) return "web";
  const map: Record<string, string> = {
    meta: "Meta",
    google: "Google",
    tiktok: "TikTok",
    youtube: "YouTube",
    x: "X",
    linkedin: "LinkedIn",
    reddit: "Reddit",
    taboola: "Taboola",
    quora: "Quora",
    news: "News",
    web: "Web",
  };
  return map[platform] ?? platform;
}
