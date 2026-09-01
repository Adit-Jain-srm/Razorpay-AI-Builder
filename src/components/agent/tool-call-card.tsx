"use client";

import { CheckCircle, CircleNotch, Wrench, XCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import type { UiToolEvent } from "./use-operator";
import { ArtifactView } from "./artifact-view";

/**
 * A live tool-call card: tool name, the arguments the agent chose, and the
 * result (a rendered artifact, structured data, or a recoverable error).
 */
export function ToolCallCard({ tool }: { tool: UiToolEvent }) {
  const { result } = tool;
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="rounded-lg border border-border bg-card/40 p-2.5"
      initial={reduced ? false : { opacity: 0, height: 0, overflow: "hidden" }}
      animate={{ opacity: 1, height: "auto", overflow: "visible" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Wrench weight="fill" className="size-3.5 shrink-0 text-primary" />
          <span className="truncate font-mono text-xs font-medium text-foreground">{tool.name}</span>
        </div>
        <StatusBadge status={tool.status} />
      </div>

      {hasArgs(tool.args) ? (
        <details className="group mt-1.5">
          <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
            <span className="font-mono">args</span>
            <span className="ml-1 text-muted-foreground/70 group-open:hidden">{previewArgs(tool.args)}</span>
          </summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
            {safeStringify(tool.args)}
          </pre>
        </details>
      ) : null}

      {result ? (
        <div className="mt-2">
          {result.artifact ? (
            <ArtifactView artifact={result.artifact} />
          ) : result.ok ? (
            result.data !== undefined ? (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
                {safeStringify(result.data)}
              </pre>
            ) : null
          ) : (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
              {result.error ?? "Tool failed"}
            </p>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: UiToolEvent["status"] }) {
  if (status === "running") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <span className="inline-flex animate-spin motion-reduce:animate-none">
          <CircleNotch weight="bold" className="size-3" />
        </span>
        running
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <XCircle weight="fill" className="size-3" />
        failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px] text-primary")}>
      <CheckCircle weight="fill" className="size-3" />
      done
    </Badge>
  );
}

function hasArgs(args: unknown): boolean {
  return Boolean(args && typeof args === "object" && Object.keys(args as Record<string, unknown>).length > 0);
}

function previewArgs(args: unknown): string {
  const text = safeStringify(args).replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
