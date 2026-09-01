"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Binoculars, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

import {
  listImportablePersonasAction,
  listResearchProjectOptionsAction,
} from "@/app/(dashboard)/campaigns/actions";
import type { ResearchProjectOption } from "@/lib/campaign/personas";
import type { PersonaSnapshot } from "@/lib/campaign/brief";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/states";

import { PersonaSnapshotCard } from "./persona-snapshot-card";

export interface PersonaImportProps {
  selected: PersonaSnapshot[];
  onChange: (next: PersonaSnapshot[]) => void;
  initialProjectId?: string;
}

/**
 * Research-first persona import. Lists research projects, loads a project's
 * synthesized personas on demand, and lets the user toggle them into the brief.
 * Works with zero credentials (the research engine seeds a demo project).
 */
export function PersonaImport({ selected, onChange, initialProjectId }: PersonaImportProps) {
  const [projects, setProjects] = useState<ResearchProjectOption[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [available, setAvailable] = useState<PersonaSnapshot[]>([]);
  const [loadingProjects, startProjects] = useTransition();
  const [loadingPersonas, startPersonas] = useTransition();

  const selectedIds = new Set(selected.map((persona) => persona.id));

  const loadPersonas = useCallback((id: string) => {
    if (!id) {
      setAvailable([]);
      return;
    }
    startPersonas(async () => {
      const result = await listImportablePersonasAction(id);
      if (result.ok) setAvailable(result.data);
      else {
        toast.error(result.error);
        setAvailable([]);
      }
    });
  }, []);

  useEffect(() => {
    startProjects(async () => {
      const result = await listResearchProjectOptionsAction();
      if (result.ok) {
        setProjects(result.data);
        const initial = initialProjectId && result.data.some((p) => p.id === initialProjectId)
          ? initialProjectId
          : result.data[0]?.id ?? "";
        if (initial) {
          setProjectId(initial);
          loadPersonas(initial);
        }
      } else {
        toast.error(result.error);
      }
    });
  }, [initialProjectId, loadPersonas]);

  const onSelectProject = (id: string) => {
    setProjectId(id);
    loadPersonas(id);
  };

  const toggle = (persona: PersonaSnapshot) => {
    if (selectedIds.has(persona.id)) {
      onChange(selected.filter((p) => p.id !== persona.id));
    } else {
      onChange([...selected, persona]);
    }
  };

  const importAll = () => {
    const merged = [...selected];
    for (const persona of available) {
      if (!merged.some((p) => p.id === persona.id)) merged.push(persona);
    }
    onChange(merged);
    toast.success(`Imported ${available.length} persona${available.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="space-y-3 rounded-xl bg-card/50 p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Binoculars className="size-3.5 text-primary" /> Import from research
          </Label>
          <Select
            value={projectId}
            onValueChange={(value) => onSelectProject(typeof value === "string" ? value : "")}
            disabled={loadingProjects}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingProjects ? "Loading projects…" : "Choose a research project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {available.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={importAll} disabled={loadingPersonas}>
            <Sparkle weight="fill" /> Import all ({available.length})
          </Button>
        ) : null}
      </div>

      {loadingPersonas ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : available.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {available.map((persona) => (
            <PersonaSnapshotCard
              key={persona.id}
              persona={persona}
              selected={selectedIds.has(persona.id)}
              onToggle={() => toggle(persona)}
            />
          ))}
        </div>
      ) : projectId ? (
        <p className="rounded-lg border border-dashed border-border bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
          This project has no synthesized personas yet. Run the research engine first, then import them here.
        </p>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-card/30 px-4 py-6 text-center text-xs text-muted-foreground">
          No research projects yet. Create one in Research to import cited personas, or use AI suggestions below.
        </p>
      )}
    </div>
  );
}
