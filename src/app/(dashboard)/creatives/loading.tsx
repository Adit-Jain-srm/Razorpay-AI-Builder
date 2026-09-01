import { ShimmerSkeleton } from "@/components/motion";
import { SkeletonCard } from "@/components/ui/states";

export default function CreativesLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-6 w-44" />
        <p className="text-sm text-muted-foreground animate-pulse">Preparing the studio…</p>
      </div>
      <ShimmerSkeleton className="h-10 w-64 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
