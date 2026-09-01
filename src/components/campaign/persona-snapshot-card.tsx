"use client";

import { Binoculars, Sparkle, UsersThree, Warning, X } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import type { PersonaSnapshot } from "@/lib/campaign/brief";
import { cn } from "@/lib/utils";

function SourceBadge({ source }: { source: PersonaSnapshot["source"] }) {
  if (source === "research") {
    return (
      <Badge variant="outline" className="gap-1 font-mono text-primary">
        <Binoculars className="size-3" /> research
      </Badge>
    );
  }
  if (source === "ai") {
    return (
      <Badge variant="outline" className="gap-1 font-mono text-muted-foreground">
        <Sparkle className="size-3" /> ai
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-mono text-muted-foreground">
      manual
    </Badge>
  );
}

export interface PersonaSnapshotCardProps {
  persona: PersonaSnapshot;
  onRemove?: () => void;
  selected?: boolean;
  onToggle?: () => void;
  className?: string;
}

/** Compact, citation-aware persona snapshot card for the brief + hub. */
export function PersonaSnapshotCard({ persona, onRemove, selected, onToggle, className }: PersonaSnapshotCardProps) {
  const interactive = typeof onToggle === "function";
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl bg-card p-3.5 ring-1 transition-colors",
        selected ? "ring-primary/50" : "ring-foreground/10",
        interactive && "cursor-pointer hover:bg-card/70",
        className,
      )}
      onClick={interactive ? onToggle : undefined}
      role={interactive ? "button" : undefined}
      aria-pressed={interactive ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <UsersThree weight="fill" className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-heading text-sm font-medium text-foreground">{persona.name}</div>
            {persona.sizeRange ? <div className="font-mono text-[10px] text-muted-foreground">{persona.sizeRange}</div> : null}
          </div>
        </div>
        <SourceBadge source={persona.source} />
      </div>

      {persona.summary ? <p className="line-clamp-2 text-xs text-pretty text-muted-foreground">{persona.summary}</p> : null}

      <div className="flex flex-wrap gap-2 font-mono text-[10px] text-muted-foreground">
        {persona.ageRange ? <span>Age {persona.ageRange}</span> : null}
        {persona.incomeBracket ? <span>· {persona.incomeBracket}</span> : null}
        {persona.location ? <span>· {persona.location}</span> : null}
      </div>

      {persona.painPoints.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {persona.painPoints.slice(0, 3).map((pain, i) => (
            <span
              key={`${pain}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive"
            >
              <Warning weight="fill" className="size-2.5" />
              {pain}
            </span>
          ))}
        </div>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${persona.name}`}
          className="absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
