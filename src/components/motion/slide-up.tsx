"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export interface SlideUpProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
  duration?: number;
}

/**
 * Slide-up entrance for chat messages and list items.
 * Reduced-motion: simple opacity fade.
 */
export function SlideUp({ children, delay = 0, y = 12, duration = 0.25, ...props }: SlideUpProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
