"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

export interface CountUpProps {
  /** Target value to count toward. */
  value: number;
  /** Format function applied to the interpolated number. */
  format?: (n: number) => string;
  /** Duration hint in seconds. The spring may overshoot slightly. */
  duration?: number;
  className?: string;
}

/**
 * Animates a number from 0 (or the previous value) to `value` using a spring.
 * GPU-friendly: only updates textContent, no layout triggers.
 * Reduced-motion: renders the final value instantly.
 */
export function CountUp({ value, format = defaultFormat, duration = 0.4, className }: CountUpProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });
  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    if (reduced) return;
    if (inView) {
      motionValue.set(value);
    }
  }, [inView, value, motionValue, reduced]);

  useEffect(() => {
    if (reduced) return;
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display, reduced]);

  if (reduced) {
    return <span ref={ref} className={className}>{format(value)}</span>;
  }

  return <span ref={ref} className={className}>{format(0)}</span>;
}

function defaultFormat(n: number): string {
  return Math.round(n).toLocaleString();
}
