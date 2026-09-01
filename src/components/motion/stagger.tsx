"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "motion/react";

const containerVariants = (stagger: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

const itemVariants = (y: number): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
});

export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Seconds between each child animation. */
  stagger?: number;
}

/**
 * Container that staggers the entrance of `<StaggerItem>` children. Reduced
 * motion collapses the stagger and offset so content simply appears.
 */
export function Stagger({ children, stagger = 0.05, ...props }: StaggerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={containerVariants(reduceMotion ? 0 : stagger)}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  y?: number;
}

export function StaggerItem({ children, y = 8, ...props }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div variants={itemVariants(reduceMotion ? 0 : y)} {...props}>
      {children}
    </motion.div>
  );
}
