"use client";

import { ArrowsOutSimple, NotePencil } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { useOperator } from "./use-operator";
import { OperatorChat } from "./operator-chat";

/**
 * Compact Operator that fills the persistent agent rail. Shares the exact same
 * runtime + chat as the full-screen view, so the rail is a real working agent -
 * not a placeholder. Its own controller keeps a lightweight side conversation.
 */
export function OperatorRail() {
  const pathname = usePathname();
  const controller = useOperator({ currentPath: pathname });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end gap-1 pb-2">
        <button
          type="button"
          onClick={controller.reset}
          aria-label="New conversation"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <NotePencil className="size-3.5" />
          New
        </button>
        <Link
          href="/operator"
          aria-label="Open full Operator"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}
        >
          <ArrowsOutSimple />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background/40">
        <OperatorChat controller={controller} variant="compact" />
      </div>
    </div>
  );
}
