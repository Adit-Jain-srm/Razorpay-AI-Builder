import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/ui/states";

export default function LandingPagesLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
