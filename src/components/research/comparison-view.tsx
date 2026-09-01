"use client";

import { useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";

import type { AudienceSegment } from "@/lib/research/standard-models";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

import { PersonaCard } from "./persona-card";

function PersonaSelect({
  personas,
  value,
  onChange,
  className,
}: {
  personas: AudienceSegment[];
  value: number;
  onChange: (index: number) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      {personas.map((p, i) => (
        <option key={i} value={i} className="bg-popover text-popover-foreground">
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function ComparisonView({ personas }: { personas: AudienceSegment[] }) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(personas.length > 1 ? 1 : 0);

  if (personas.length < 2) {
    return (
      <EmptyState
        icon={<ArrowsLeftRight weight="duotone" className="size-5" />}
        title="Need at least two personas to compare"
        description="Run the engine (or add another segment) to see side-by-side comparison."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <PersonaSelect personas={personas} value={left} onChange={setLeft} />
        <div className="hidden size-8 place-items-center rounded-lg bg-muted text-muted-foreground sm:grid">
          <ArrowsLeftRight weight="bold" className="size-4" />
        </div>
        <PersonaSelect personas={personas} value={right} onChange={setRight} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <PersonaCard persona={personas[left]} />
        <PersonaCard persona={personas[right]} />
      </div>
    </div>
  );
}
