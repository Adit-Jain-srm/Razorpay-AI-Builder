import type { ReactNode } from "react";
import { Warning } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Recovery action, e.g. a "Try again" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * On-brand error state. Pair with error boundaries and failed queries. Uses the
 * danger token so it is unmistakable without being alarmist.
 */
export function ErrorState({ title = "Something went wrong", description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <Warning className="size-5" weight="duotone" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-sm font-medium text-foreground">{title}</h3>
        {description ? <p className="mx-auto max-w-sm text-pretty text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
