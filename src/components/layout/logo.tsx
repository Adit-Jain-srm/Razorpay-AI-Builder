import { cn } from "@/lib/utils";

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid size-6 shrink-0 place-items-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">M</div>
      {!collapsed ? (
        <span className="font-heading text-sm font-semibold tracking-tight">
          Media<span className="text-muted-foreground">OS</span>
        </span>
      ) : null}
    </div>
  );
}
