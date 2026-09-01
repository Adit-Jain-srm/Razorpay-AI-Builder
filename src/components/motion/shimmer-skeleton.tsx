"use client";

import { cn } from "@/lib/utils";

export interface ShimmerSkeletonProps {
  className?: string;
  /** Width class for the skeleton bar. */
  width?: string;
  /** Height class for the skeleton bar. */
  height?: string;
}

/**
 * A skeleton element with a shimmer (moving gradient) effect.
 * CSS-only, GPU-composited. Respects `prefers-reduced-motion`.
 */
export function ShimmerSkeleton({ className, width, height }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "shimmer rounded-md bg-muted",
        width,
        height ?? "h-4",
        className,
      )}
      aria-hidden
    />
  );
}
