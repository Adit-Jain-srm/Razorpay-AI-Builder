"use client";

import { BracketsCurly, FileMd } from "@phosphor-icons/react";
import { toast } from "sonner";

import type { ResearchReport } from "@/lib/research/standard-models";
import { Button } from "@/components/ui/button";

import { downloadTextFile, reportToJson, reportToMarkdown, slugify } from "./export";

export interface ExportMenuProps {
  report: ResearchReport;
  projectName: string;
}

export function ExportMenu({ report, projectName }: ExportMenuProps) {
  const base = slugify(projectName);

  const onJson = () => {
    downloadTextFile(`${base}.json`, reportToJson(report), "application/json");
    toast.success("Exported research as JSON");
  };

  const onMarkdown = () => {
    downloadTextFile(`${base}.md`, reportToMarkdown(report, projectName), "text/markdown");
    toast.success("Exported research as Markdown");
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={onJson}>
        <BracketsCurly />
        JSON
      </Button>
      <Button variant="outline" size="sm" onClick={onMarkdown}>
        <FileMd />
        Markdown
      </Button>
    </div>
  );
}
