"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";

export interface PressableProps extends HTMLMotionProps<"button"> {
  /** Apply the press effect. Set false to disable for specific states. */
  pressable?: boolean;
}

/**
 * A motion-enhanced button wrapper providing a press scale (0.96) and subtle
 * translate feedback. Uses spring physics for satisfying feel.
 * Reduced-motion: no transform, just the native press state.
 */
export const PressableButton = forwardRef<HTMLButtonElement, PressableProps>(
  function PressableButton({ children, pressable = true, ...props }, ref) {
    const reduced = useReducedMotion();
    const shouldAnimate = pressable && !reduced;

    return (
      <motion.button
        ref={ref}
        whileTap={shouldAnimate ? { scale: 0.96, y: 1 } : undefined}
        whileHover={shouldAnimate ? { scale: 1.01 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
