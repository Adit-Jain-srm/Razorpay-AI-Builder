"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Binoculars, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { deleteResearchProjectAction } from "@/app/(dashboard)/research/actions";
import { Badge } from "@/components/ui/badge";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";

import { NewResearchForm } from "./new-research-form";

export interface ResearchProjectSummary {
  id: string;
  name: string;
  query: string;
  status: string;
  createdAt: string;
  hasReport: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") return <Badge variant="outline" className="font-mono text-success">complete</Badge>;
  if (status === "running") return <Badge variant="secondary" className="font-mono">running</Badge>;
  if (status === "error") return <Badge variant="destructive" className="font-mono">error</Badge>;
  return <Badge variant="outline" className="font-mono text-muted-foreground">draft</Badge>;
}

function ProjectCard({ project }: { project: ResearchProjectSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteResearchProjectAction(project.id);
      if (result.ok) {
        toast.success("Project deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="group relative">
      <Link
        href={`/research/${project.id}`}
        className={cn(
          "card-hover block h-full rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-card/70 hover:ring-foreground/20",
          pending && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Binoculars weight="duotone" className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-heading text-sm font-medium text-foreground">{project.name}</div>
              <p className="mt-0.5 line-clamp-2 text-xs text-pretty text-muted-foreground">{project.query}</p>
            </div>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <StatusBadge status={project.status} />
          <span className="font-mono text-[10px] text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label="Delete project"
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash className="size-4" />
      </button>
    </div>
  );
}

export function ResearchList({ projects }: { projects: ResearchProjectSummary[] }) {
  return (
    <div className="space-y-6">
      <NewResearchForm />
      {projects.length > 0 ? (
        <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <StaggerItem key={project.id}>
              <ProjectCard project={project} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center text-sm text-muted-foreground">
          No research projects yet. Create one above to start streaming live audience intelligence.
        </p>
      )}
    </div>
  );
}
