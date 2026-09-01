import { ShimmerSkeleton } from "@/components/motion";

export default function OperatorLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-6 w-32" />
        <p className="text-sm text-muted-foreground animate-pulse">Waking up the Operator…</p>
      </div>
      <ShimmerSkeleton className="h-80 w-full rounded-xl" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );
}
