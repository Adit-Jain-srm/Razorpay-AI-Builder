import { ShimmerSkeleton } from "@/components/motion";
import { SkeletonMetrics } from "@/components/ui/states";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-6 w-36" />
        <p className="text-sm text-muted-foreground animate-pulse">Crunching campaign numbers…</p>
      </div>
      <SkeletonMetrics count={6} className="lg:grid-cols-3 xl:grid-cols-6" />
      <ShimmerSkeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ShimmerSkeleton className="h-48 rounded-xl" />
        <ShimmerSkeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
