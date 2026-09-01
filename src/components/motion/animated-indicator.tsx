"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedIndicatorProps {
  /** Unique layout ID shared across all instances in the group. */
  layoutId: string;
  className?: string;
}

/**
 * A motion `layoutId` indicator bar that smoothly slides between positions
 * (e.g., sidebar active item, tab indicators). GPU-composited.
 * Reduced-motion: instant position without animation.
 */
export function AnimatedIndicator({ layoutId, className }: AnimatedIndicatorProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      layoutId={layoutId}
      className={cn("absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary", className)}
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 350, damping: 25 }
      }
    />
  );
}
