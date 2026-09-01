"use client";

import { motion, useReducedMotion } from "motion/react";

export function TypingDots() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <span className="inline-flex items-center gap-1 px-1">
        <span className="size-1.5 rounded-full bg-primary/70" />
        <span className="size-1.5 rounded-full bg-primary/70" />
        <span className="size-1.5 rounded-full bg-primary/70" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-primary/70"
          animate={{ scale: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
