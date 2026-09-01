import {
  Binoculars,
  Browsers,
  ChartLineUp,
  MagicWand,
  Megaphone,
  Plus,
  Robot,
} from "@phosphor-icons/react/dist/ssr";

import { registerCommandActions, type CommandAction } from "@/lib/command-actions";
import { DEMO_CAMPAIGN_ID } from "@/lib/seed/constants";

/**
 * Pre-registers all cross-module command actions so they appear in the Cmd+K
 * palette. Call once at app bootstrap (imported in the palette component or a
 * top-level initializer).
 */

const MODULE_ACTIONS: CommandAction[] = [
  {
    id: "new-campaign",
    type: "navigate",
    label: "New Campaign",
    group: "Campaigns",
    href: "/campaigns/new",
    keywords: ["create", "campaign", "brief"],
    icon: Plus,
  },
  {
    id: "new-research",
    type: "navigate",
    label: "New Research Project",
    group: "Research",
    href: "/research",
    keywords: ["audience", "persona", "research"],
    icon: Binoculars,
  },
  {
    id: "open-operator",
    type: "navigate",
    label: "Open Operator",
    group: "Agent",
    href: "/operator",
    keywords: ["agent", "ai", "chat", "operator"],
    icon: Robot,
  },
  {
    id: "view-creatives",
    type: "navigate",
    label: "View Creatives",
    group: "Creative Studio",
    href: `/creatives?campaign=${DEMO_CAMPAIGN_ID}`,
    keywords: ["creative", "ad", "copy", "generate"],
    icon: MagicWand,
  },
  {
    id: "view-landing-pages",
    type: "navigate",
    label: "View Landing Pages",
    group: "Landing Pages",
    href: `/landing-pages?campaign=${DEMO_CAMPAIGN_ID}`,
    keywords: ["landing", "page", "deploy", "lead"],
    icon: Browsers,
  },
  {
    id: "view-analytics",
    type: "navigate",
    label: "View Analytics",
    group: "Analytics",
    href: `/analytics/${DEMO_CAMPAIGN_ID}`,
    keywords: ["analytics", "performance", "metrics", "spend"],
    icon: ChartLineUp,
  },
  {
    id: "all-campaigns",
    type: "navigate",
    label: "All Campaigns",
    group: "Campaigns",
    href: "/campaigns",
    keywords: ["campaigns", "list", "hub"],
    icon: Megaphone,
  },
];

registerCommandActions(MODULE_ACTIONS);
