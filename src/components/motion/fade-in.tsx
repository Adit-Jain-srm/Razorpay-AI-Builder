"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Seconds to delay the animation. */
  delay?: number;
  /** Initial vertical offset in px (animates to 0). */
  y?: number;
  /** Animation duration in seconds. */
  duration?: number;
}

/**
 * Subtle, motivated fade/slide-in. Honors `prefers-reduced-motion`: when the
 * user opts out, content renders immediately with no transform.
 */
export function FadeIn({ children, delay = 0, y = 8, duration = 0.25, ...props }: FadeInProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
