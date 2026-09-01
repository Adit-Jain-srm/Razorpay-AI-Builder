import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shape-matching loading skeletons so layouts do not shift when data arrives. */

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonMetrics({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl ring-1 ring-foreground/10", className)}>
      <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export type LoadingVariant = "text" | "card" | "metrics" | "table" | "list";

export interface LoadingSkeletonProps {
  variant?: LoadingVariant;
  count?: number;
  className?: string;
}

/** Convenience dispatcher for the most common skeleton shapes. */
export function LoadingSkeleton({ variant = "card", count, className }: LoadingSkeletonProps) {
  switch (variant) {
    case "text":
      return <SkeletonText lines={count ?? 3} className={className} />;
    case "metrics":
      return <SkeletonMetrics count={count ?? 4} className={className} />;
    case "table":
      return <SkeletonTable rows={count ?? 6} className={className} />;
    case "list":
      return <SkeletonList rows={count ?? 5} className={className} />;
    case "card":
    default:
      return <SkeletonCard className={className} />;
  }
}
