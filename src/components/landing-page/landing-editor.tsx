"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  DeviceMobile,
  Desktop,
  Flask,
  RocketLaunch,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  LANDING_ACCENTS,
  TEMPLATE_LIBRARY,
  TEMPLATE_ORDER,
  type LandingAccent,
  type LandingDocument,
  type LandingSection,
  type LandingTemplate,
} from "@/lib/landing";
import type { LandingPageView } from "@/lib/landing/studio";

import {
  createVariantAction,
  deployLandingAction,
  regenerateSectionAction,
  regenerateLandingPageAction,
  saveLandingDocumentAction,
  setLandingTemplateAction,
} from "@/app/(dashboard)/landing-pages/actions";

import { LandingPreview, type PreviewDevice } from "./landing-preview";
import { SectionInspector } from "./section-inspector";

interface LandingEditorProps {
  initialPage: LandingPageView;
  campaignName: string;
  azureConfigured: boolean;
}

const ACCENT_SWATCH: Record<LandingAccent, string> = {
  emerald: "#059669",
  blue: "#2563eb",
  violet: "#7c3aed",
  amber: "#d97706",
  rose: "#e11d48",
  teal: "#0d9488",
};

export function LandingEditor({ initialPage, campaignName, azureConfigured }: LandingEditorProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<LandingDocument>(initialPage.document);
  const [status, setStatus] = useState(initialPage.status);
  const [selectedId, setSelectedId] = useState<string | null>(initialPage.document.sections[0]?.id ?? null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pageId = initialPage.id;
  const selected = doc.sections.find((s) => s.id === selectedId) ?? null;
  const deployed = status === "deployed";

  const applyView = (view: LandingPageView) => {
    setDoc(view.document);
    setStatus(view.status);
    setDirty(false);
    if (!view.document.sections.some((s) => s.id === selectedId)) {
      setSelectedId(view.document.sections[0]?.id ?? null);
    }
  };

  const patchSection = (id: string, patch: Partial<LandingSection>) => {
    setDoc((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as LandingSection) : s)),
    }));
    setDirty(true);
  };

  const setAccent = (accent: LandingAccent) => {
    setDoc((prev) => ({ ...prev, theme: { ...prev.theme, accent } }));
    setDirty(true);
  };

  const run = (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    startTransition(async () => {
      try {
        await fn();
      } finally {
        setBusy(null);
      }
    });
  };

  const save = async (): Promise<boolean> => {
    const result = await saveLandingDocumentAction({ pageId, document: doc });
    if (result.ok) {
      applyView(result.data);
      return true;
    }
    toast.error(result.error);
    return false;
  };

  const onSave = () => run("save", async () => {
    if (await save()) toast.success("Saved");
  });

  const onRegeneratePage = () =>
    run("regen", async () => {
      const result = await regenerateLandingPageAction(pageId);
      if (result.ok) {
        applyView(result.data.page);
        toast.success(result.data.source === "ai" ? "Page regenerated" : "Regenerated (seeded - configure Azure for live AI)");
      } else {
        toast.error(result.error);
      }
    });

  const onRegenerateSection = (id: string) =>
    run(`regen:${id}`, async () => {
      const result = await regenerateSectionAction({ pageId, sectionId: id });
      if (result.ok) {
        applyView(result.data);
        toast.success("Section regenerated");
      } else {
        toast.error(result.error);
      }
    });

  const onTemplate = (template: LandingTemplate) =>
    run("template", async () => {
      const result = await setLandingTemplateAction({ pageId, template });
      if (result.ok) {
        applyView(result.data);
        toast.success(`Switched to ${TEMPLATE_LIBRARY[template].name}`);
      } else {
        toast.error(result.error);
      }
    });

  const onDeploy = () =>
    run("deploy", async () => {
      if (dirty && !(await save())) return;
      const result = await deployLandingAction(pageId);
      if (result.ok) {
        applyView(result.data);
        toast.success("Deployed - your page is live");
      } else {
        toast.error(result.error);
      }
    });

  const onCreateVariant = () =>
    run("variant", async () => {
      if (dirty && !(await save())) return;
      const result = await createVariantAction(pageId);
      if (result.ok) {
        toast.success("A/B variant B created - manage the split from Landing Pages");
        router.push(`/landing-pages/${result.data.variant.id}`);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/landing-pages")} aria-label="Back to landing pages">
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-heading text-lg font-semibold text-foreground">{TEMPLATE_LIBRARY[doc.template].name}</h2>
              <Badge variant={deployed ? "default" : "secondary"} className="font-mono text-[10px] uppercase">
                {status}
              </Badge>
              {dirty ? <span className="text-xs text-muted-foreground">Unsaved</span> : null}
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {campaignName} · /lp/{initialPage.slug}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setDevice("desktop")} aria-label="Desktop preview">
              <Desktop />
            </Button>
            <Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setDevice("mobile")} aria-label="Mobile preview">
              <DeviceMobile />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onRegeneratePage} disabled={isPending}>
            <Sparkle weight={busy === "regen" ? "fill" : "regular"} className={busy === "regen" ? "shimmer" : ""} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateVariant} disabled={isPending}>
            <Flask /> A/B variant
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={isPending || !dirty}>
            Save
          </Button>
          <Button size="sm" onClick={onDeploy} disabled={isPending}>
            <RocketLaunch weight="fill" /> {deployed ? "Redeploy" : "Deploy"}
          </Button>
        </div>
      </header>

      {!azureConfigured ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
          <Warning weight="fill" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Azure OpenAI is not configured, so generation uses <strong>seeded demo copy</strong>. Set
            <code className="mx-1 font-mono text-xs">AZURE_OPENAI_*</code> to write live, research-informed pages.
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={doc.template} onValueChange={(v) => onTemplate(v as LandingTemplate)}>
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEMPLATE_LIBRARY[t].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TEMPLATE_LIBRARY[doc.template].framework} framework</p>
            </div>
            <div className="space-y-1.5">
              <Label>Accent</Label>
              <div className="flex flex-wrap gap-1.5">
                {LANDING_ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => setAccent(accent)}
                    aria-label={accent}
                    aria-pressed={doc.theme.accent === accent}
                    className={cn(
                      "size-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform",
                      doc.theme.accent === accent ? "ring-foreground" : "ring-transparent hover:scale-110",
                    )}
                    style={{ backgroundColor: ACCENT_SWATCH[accent] }}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sections</h3>
            <div className="space-y-1">
              {doc.sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedId(section.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                    selectedId === section.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="truncate">{section.label || section.type}</span>
                  {section.framework ? (
                    <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{section.framework}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {selected ? (
            <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-medium text-foreground">
                  Edit: {selected.label || selected.type}
                </h3>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onRegenerateSection(selected.id)}
                  disabled={isPending}
                >
                  <ArrowsClockwise className={busy === `regen:${selected.id}` ? "animate-spin motion-reduce:animate-none" : ""} />
                  Regenerate section
                </Button>
              </div>
              <SectionInspector section={selected} onChange={(patch) => patchSection(selected.id, patch)} />
            </section>
          ) : null}

          <LandingPreview
            document={doc}
            pageId={pageId}
            device={device}
            selectedId={selectedId}
            onSelectSection={setSelectedId}
          />

          <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
            <span className="text-muted-foreground">
              {deployed ? "Live and capturing leads" : "Deploy to publish a public page with lead capture"}
            </span>
            {deployed ? (
              <Link
                href={initialPage.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
              >
                Open {initialPage.url} →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
