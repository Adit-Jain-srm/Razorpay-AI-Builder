"use client";

import { CheckCircle, Circle, CircleNotch, ListChecks, MinusCircle, XCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

import type { AgentPlan, PlanStepStatus } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * The visible plan - the headline of the "intelligently planning" perception.
 * Renders each decomposed step with live status (pending/running/done/failed).
 */
export function PlanPanel({ plan, className }: { plan: AgentPlan; className?: string }) {
  const total = plan.steps.length;
  const done = plan.steps.filter((step) => step.status === "completed" || step.status === "skipped").length;

  return (
    <section
      className={cn("rounded-lg border border-border bg-card/50 p-2.5", className)}
      aria-label="Operator plan"
    >
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <ListChecks weight="fill" className="size-3.5 text-primary" />
          Plan
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          {done}/{total}
        </Badge>
      </header>

      <ol className="space-y-1.5">
        {plan.steps.map((step, index) => (
          <li key={step.id} className="flex items-start gap-2">
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-sm leading-tight",
                    step.status === "completed" && "text-foreground",
                    step.status === "running" && "font-medium text-foreground",
                    step.status === "failed" && "text-destructive",
                    (step.status === "pending" || step.status === "skipped") && "text-muted-foreground",
                  )}
                >
                  <span className="mr-1 font-mono text-[11px] text-muted-foreground">{index + 1}.</span>
                  {step.title}
                </span>
                {step.tool ? (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {step.tool}
                  </Badge>
                ) : null}
              </div>
              {step.description ? (
                <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{step.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepIcon({ status }: { status: PlanStepStatus }) {
  const base = "mt-0.5 size-4 shrink-0";
  const reduced = useReducedMotion();

  switch (status) {
    case "running":
      return (
        <span className="mt-0.5 inline-flex animate-spin text-primary motion-reduce:animate-none">
          <CircleNotch weight="bold" className="size-4 shrink-0" />
        </span>
      );
    case "completed":
      return (
        <motion.span
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="mt-0.5 inline-flex"
        >
          <CheckCircle weight="fill" className={cn(base, "text-primary")} />
        </motion.span>
      );
    case "failed":
      return <XCircle weight="fill" className={cn(base, "text-destructive")} />;
    case "skipped":
      return <MinusCircle weight="bold" className={cn(base, "text-muted-foreground")} />;
    default:
      return <Circle weight="bold" className={cn(base, "text-muted-foreground/50")} />;
  }
}
