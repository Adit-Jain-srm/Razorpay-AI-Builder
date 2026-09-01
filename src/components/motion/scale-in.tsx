"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export interface ScaleInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  duration?: number;
}

/**
 * Scale-in from 0.95 + fade for dialogs, tooltips, dropdowns.
 * Reduced-motion: instant opacity swap.
 */
export function ScaleIn({ children, delay = 0, duration = 0.15, ...props }: ScaleInProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
