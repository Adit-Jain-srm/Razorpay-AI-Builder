import type { Icon } from "@phosphor-icons/react";
import {
  Binoculars,
  Browsers,
  ChartLineUp,
  Gauge,
  ImagesSquare,
  Megaphone,
  Robot,
} from "@phosphor-icons/react/dist/ssr";

export interface NavRoute {
  href: string;
  label: string;
  description: string;
  icon: Icon;
}

/**
 * Primary navigation. Command Center and Operator lead because the agent is the
 * product; the rest are the secondary control surfaces. Consumed by the sidebar
 * and the command palette so they never drift out of sync.
 */
export const NAV_ROUTES: NavRoute[] = [
  { href: "/", label: "Command Center", description: "Your campaigns, live performance, and the agent's daily brief", icon: Gauge },
  { href: "/operator", label: "Operator", description: "Hire the AI media buyer to plan and execute end to end", icon: Robot },
  { href: "/research", label: "Research", description: "Audience research intelligence from live web data", icon: Binoculars },
  { href: "/campaigns", label: "Campaigns", description: "Briefs, budgets, and the lifecycle of every campaign", icon: Megaphone },
  { href: "/creatives", label: "Creatives", description: "Platform-ready ad copy and visuals", icon: ImagesSquare },
  { href: "/landing-pages", label: "Landing Pages", description: "Generate, deploy, and capture leads", icon: Browsers },
  { href: "/analytics", label: "Analytics", description: "Cross-platform performance and AI insights", icon: ChartLineUp },
];

/** Resolves the active route for a given pathname (longest-prefix match). */
export function getActiveRoute(pathname: string): NavRoute | undefined {
  if (pathname === "/") return NAV_ROUTES[0];
  return NAV_ROUTES.filter((route) => route.href !== "/")
    .filter((route) => pathname === route.href || pathname.startsWith(`${route.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
