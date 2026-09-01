"use client";

import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion";

/**
 * Dashboard template wrapping all pages in a cross-fade + slide page transition.
 * `template.tsx` re-renders on every navigation (unlike layout.tsx) making it
 * the correct place for per-route enter/exit animations.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
