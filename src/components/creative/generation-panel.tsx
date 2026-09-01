"use client";

import { useRef, useState } from "react";
import { Lightning, Plus, Sparkle, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CORE_PLATFORMS, platformDisplayName } from "@/lib/creative";
import { AD_PLATFORMS, type AdPlatform } from "@/lib/research/standard-models";
import { cn } from "@/lib/utils";

import { generateCreativesAction } from "@/app/(dashboard)/creatives/actions";
import type { CreativeView } from "@/lib/creative/studio";

import { getPlatformMeta } from "./platform-meta";

type GenEvent =
  | { type: "start"; platform: string; count: number }
  | { type: "delta"; text: string }
  | { type: "variants"; creatives: CreativeView[]; source: "ai" | "seeded"; batchId: string }
  | { type: "done" }
  | { type: "error"; message: string };

interface GenerationPanelProps {
  campaignId: string;
  azureConfigured: boolean;
  defaultPainPoints: string[];
  brandVoices: { id: string; name: string }[];
  onGenerated: (creatives: CreativeView[], source: "ai" | "seeded") => void;
}

const ORDERED_PLATFORMS: AdPlatform[] = [...CORE_PLATFORMS, ...AD_PLATFORMS.filter((p) => !CORE_PLATFORMS.includes(p as (typeof CORE_PLATFORMS)[number]))];

export function GenerationPanel({ campaignId, azureConfigured, defaultPainPoints, brandVoices, onGenerated }: GenerationPanelProps) {
  const [platform, setPlatform] = useState<AdPlatform>("meta");
  const [count, setCount] = useState(3);
  const [angle, setAngle] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>(defaultPainPoints.slice(0, 5));
  const [painDraft, setPainDraft] = useState("");
  const [brandVoiceId, setBrandVoiceId] = useState<string>("none");
  const [running, setRunning] = useState(false);
  const [deltas, setDeltas] = useState("");
  const deltaRef = useRef<HTMLDivElement>(null);

  const addPain = () => {
    const v = painDraft.trim();
    if (!v) return;
    setPainPoints((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setPainDraft("");
  };

  const buildRequest = () => ({
    campaignId,
    platform,
    count,
    angle: angle.trim() || undefined,
    painPoints,
    brandVoiceId: brandVoiceId === "none" ? undefined : brandVoiceId,
  });

  const runViaAction = async () => {
    const result = await generateCreativesAction(buildRequest());
    if (result.ok) {
      onGenerated(result.data.creatives, result.data.source);
      toast.success(result.data.source === "ai" ? "Variants generated" : "Seeded variants (configure Azure to generate live)");
    } else {
      toast.error(result.error);
    }
  };

  const handleEvent = (event: GenEvent) => {
    if (event.type === "delta") {
      setDeltas((prev) => (prev + event.text).slice(-1200));
      requestAnimationFrame(() => deltaRef.current?.scrollTo({ top: deltaRef.current.scrollHeight }));
    } else if (event.type === "variants") {
      onGenerated(event.creatives, event.source);
      toast.success(event.source === "ai" ? "Variants generated" : "Seeded variants (configure Azure to generate live)");
    } else if (event.type === "error") {
      toast.error(event.message);
    }
  };

  const generate = async () => {
    setRunning(true);
    setDeltas("");
    try {
      const res = await fetch("/api/creative/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildRequest()),
      });
      if (!res.ok || !res.body) throw new Error("Streaming unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawVariants = false;

      const flush = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const event = JSON.parse(trimmed) as GenEvent;
          if (event.type === "variants") sawVariants = true;
          handleEvent(event);
        } catch {
          // ignore partial lines
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl >= 0) {
          flush(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
        }
      }
      flush(buffer);
      if (!sawVariants) await runViaAction();
    } catch {
      try {
        await runViaAction();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <section data-slot="generation-panel" className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-heading text-sm font-medium text-foreground">
          <Sparkle weight="duotone" className="size-4 text-primary" /> Generate creatives
        </h3>
        {!azureConfigured ? (
          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
            demo mode
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as AdPlatform)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDERED_PLATFORMS.map((p) => {
                const { Icon } = getPlatformMeta(p);
                return (
                  <SelectItem key={p} value={p}>
                    <Icon weight="duotone" className="size-4" />
                    {platformDisplayName(p)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Variants: {count}</Label>
          <div className="flex h-8 items-center">
            <Slider min={1} max={10} value={count} onValueChange={(v) => setCount(Array.isArray(v) ? (v[0] ?? 1) : v)} />
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="angle">Angle (optional)</Label>
          <Input id="angle" value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="e.g. inflation protection, no-upsell trust" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pain">Target pain points {defaultPainPoints.length > 0 ? <span className="text-muted-foreground">(prefilled from research)</span> : null}</Label>
        <div className="flex gap-2">
          <Input
            id="pain"
            value={painDraft}
            onChange={(e) => setPainDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPain();
              }
            }}
            placeholder="Add a pain point and press Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addPain} aria-label="Add pain point">
            <Plus weight="bold" />
          </Button>
        </div>
        {painPoints.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {painPoints.map((p) => (
              <Badge key={p} variant="outline" className="gap-1 border-destructive/30 text-destructive">
                <span className="max-w-52 truncate">{p}</span>
                <button type="button" onClick={() => setPainPoints((prev) => prev.filter((x) => x !== p))} aria-label={`Remove ${p}`}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {brandVoices.length > 0 ? (
          <div className="space-y-1.5">
            <Label>Brand voice</Label>
            <Select value={brandVoiceId} onValueChange={(v) => setBrandVoiceId(v ?? "none")}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {brandVoices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span />
        )}
        <Button onClick={generate} disabled={running}>
          <Lightning weight="fill" className={running ? "shimmer" : ""} />
          {running ? "Generating…" : `Generate ${count} variant${count > 1 ? "s" : ""}`}
        </Button>
      </div>

      {running && deltas ? (
        <div
          ref={deltaRef}
          className={cn(
            "max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground",
          )}
        >
          {deltas}
          <span className="ml-0.5 inline-block h-3 w-1.5 shimmer bg-primary align-middle" />
        </div>
      ) : null}
    </section>
  );
}
