"use client";

import { useState, useTransition } from "react";
import { DownloadSimple, Export, FileCsv } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { exportCreativesAction } from "@/app/(dashboard)/creatives/actions";

type Format = "google" | "meta";

const FORMAT_META: Record<Format, { label: string; hint: string }> = {
  google: { label: "Google Ads Editor", hint: "RSA headlines + descriptions, paste into Editor" },
  meta: { label: "Meta bulk import", hint: "Campaign / Ad Set / Ad rows for bulk upload" },
};

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("google");
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await exportCreativesAction({ campaignId, format });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.count === 0) {
        toast.error(`No ${FORMAT_META[format].label} creatives to export yet.`);
        return;
      }
      downloadCsv(result.data.filename, result.data.csv);
      toast.success(`Exported ${result.data.count} ${format} creative${result.data.count > 1 ? "s" : ""}`);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Export /> Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export creatives</DialogTitle>
          <DialogDescription>Download platform-ready CSVs to import into the ad managers.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FORMAT_META) as Format[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFormat(key)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                format === key ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <FileCsv weight="duotone" className="size-4 text-primary" /> {FORMAT_META[key].label}
              </span>
              <span className="text-xs text-muted-foreground">{FORMAT_META[key].hint}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={run} disabled={pending}>
            <DownloadSimple weight="bold" />
            {pending ? "Preparing…" : "Download CSV"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
