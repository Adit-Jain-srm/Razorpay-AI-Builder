"use client";

import { CheckCircle, CircleNotch, Warning } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import { getProviderMeta, PROVIDER_ORDER } from "./provider-meta";

export interface ProviderRunInfo {
  status: string;
  itemCount: number;
}

type ProviderState = "pending" | "running" | "success" | "failed";

function stateOf(info: ProviderRunInfo | undefined, running: boolean): ProviderState {
  if (info) return info.status === "failed" ? "failed" : "success";
  return running ? "running" : "pending";
}

export interface ProviderRunStatusProps {
  results: Record<string, ProviderRunInfo>;
  running: boolean;
  className?: string;
}

/** Live, OpenBB-style status strip showing each provider as the run streams in. */
export function ProviderRunStatus({ results, running, className }: ProviderRunStatusProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {PROVIDER_ORDER.map((name) => {
        const meta = getProviderMeta(name);
        const info = results[name];
        const state = stateOf(info, running);
        return (
          <div
            key={name}
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 ring-1 ring-foreground/5 transition-colors",
              state === "success" && "border-primary/30",
              state === "failed" && "border-destructive/30",
              state === "running" && "border-info/30 animate-pulse-border",
              state === "pending" && "border-border opacity-70",
            )}
          >
            <meta.icon weight="duotone" className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{meta.label}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {state === "success" && info ? `${info.itemCount} items` : null}
                {state === "running" ? "running…" : null}
                {state === "pending" ? "queued" : null}
                {state === "failed" ? "failed" : null}
              </div>
            </div>
            {state === "success" ? <CheckCircle weight="fill" className="size-4 shrink-0 text-success" /> : null}
            {state === "failed" ? <Warning weight="fill" className="size-4 shrink-0 text-destructive" /> : null}
            {state === "running" ? <CircleNotch weight="bold" className="size-4 shrink-0 animate-spin text-info motion-reduce:animate-none" /> : null}
            {state === "pending" ? <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" /> : null}
          </div>
        );
      })}
    </div>
  );
}
