import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion";

export interface EmptyStateProps {
  /** Rendered icon element, e.g. `<Compass className="size-5" weight="duotone" />`. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Primary call to action (button/link). */
  action?: ReactNode;
  className?: string;
}

/**
 * On-brand empty state. Use whenever a surface has no data yet so the UI reads
 * as intentional rather than broken. Dashed container + muted iconography.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 px-6 py-12 text-center",
          className,
        )}
      >
        {icon ? (
          <div className="flex size-11 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground [&_svg]:size-5">{icon}</div>
        ) : null}
        <div className="space-y-1">
          <h3 className="font-heading text-sm font-medium text-foreground">{title}</h3>
          {description ? <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </FadeIn>
  );
}
