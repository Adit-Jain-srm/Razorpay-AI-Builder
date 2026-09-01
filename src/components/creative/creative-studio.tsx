"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwise,
  DownloadSimple,
  Heart,
  ImagesSquare,
  Megaphone,
  Sparkle,
  SquaresFour,
  Stack,
  Target,
  Warning,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { CORE_PLATFORMS, platformDisplayName } from "@/lib/creative";
import type { AdPlatform } from "@/lib/research/standard-models";
import { imageFilename } from "@/lib/creative/export";

import type { BrandVoiceView, CreativeView } from "@/lib/creative/studio";

import { BrandVoicePanel } from "./brand-voice-panel";
import { ExportDialog } from "./export-dialog";
import { GenerationPanel } from "./generation-panel";
import { PlatformIcon } from "./platform-meta";
import { VariantCard } from "./variant-card";

interface CreativeStudioProps {
  campaignId: string;
  campaignName: string;
  campaigns: { id: string; name: string }[];
  azureConfigured: boolean;
  defaultPainPoints: string[];
  initialCreatives: CreativeView[];
  initialBrandVoices: BrandVoiceView[];
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <div>
        <div className="font-mono text-lg leading-none font-semibold tabular-nums text-foreground">{value}</div>
        <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      </div>
    </div>
  );
}

function orderPlatforms(platforms: AdPlatform[]): AdPlatform[] {
  const core = CORE_PLATFORMS.filter((p) => platforms.includes(p));
  const rest = platforms.filter((p) => !CORE_PLATFORMS.includes(p as (typeof CORE_PLATFORMS)[number]));
  return [...core, ...rest];
}

export function CreativeStudio({
  campaignId,
  campaignName,
  campaigns,
  azureConfigured,
  defaultPainPoints,
  initialCreatives,
  initialBrandVoices,
}: CreativeStudioProps) {
  const router = useRouter();
  const [creatives, setCreatives] = useState<CreativeView[]>(initialCreatives);
  const [brandVoices, setBrandVoices] = useState<BrandVoiceView[]>(initialBrandVoices);
  const [view, setView] = useState("all");

  const platformsPresent = useMemo(
    () => orderPlatforms([...new Set(creatives.map((c) => c.platform))]),
    [creatives],
  );

  const stats = useMemo(() => {
    const scores = creatives.map((c) => c.content.score.total);
    const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    return {
      variants: creatives.length,
      favorites: creatives.filter((c) => c.isFavorite).length,
      avgScore: avg,
      platforms: platformsPresent.length,
      images: creatives.reduce((sum, c) => sum + c.images.length, 0),
    };
  }, [creatives, platformsPresent]);

  const gallery = useMemo(
    () => creatives.flatMap((c) => c.images.map((img) => ({ ...img, platform: c.platform, headline: c.content.headline }))),
    [creatives],
  );

  const onGenerated = (next: CreativeView[]) => setCreatives((prev) => [...next, ...prev]);
  const onUpdated = (next: CreativeView) => setCreatives((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  const onRemoved = (id: string) => setCreatives((prev) => prev.filter((c) => c.id !== id));

  const renderGrid = (items: CreativeView[]) => (
    <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
      {items.map((creative) => (
        <StaggerItem key={creative.id}>
          <VariantCard creative={creative} onUpdated={onUpdated} onRemoved={onRemoved} azureConfigured={azureConfigured} />
        </StaggerItem>
      ))}
    </Stagger>
  );

  const batches = useMemo(() => {
    const map = new Map<string, CreativeView[]>();
    for (const c of creatives) {
      const key = c.content.batchId ?? `single:${c.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.values()].filter((group) => group.length > 1).sort((a, b) => b[0].createdAt.localeCompare(a[0].createdAt));
  }, [creatives]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">Creative Studio</h2>
            {campaigns.length > 1 ? (
              <Select value={campaignId} onValueChange={(id) => router.push(`/creatives?campaign=${id}`)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="font-mono">
                {campaignName}
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            Platform-ready ad copy and visuals, grounded in the exact pain points and language the research engine surfaced -
            with hook psychology and direct-response scoring on every variant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BrandVoicePanel brandVoices={brandVoices} onChange={setBrandVoices} />
          <ExportDialog campaignId={campaignId} />
        </div>
      </header>

      {!azureConfigured ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
          <Warning weight="fill" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Azure OpenAI is not configured, so the studio runs in <strong>demo mode</strong> with seeded example creatives and
            placeholder visuals. Set <code className="font-mono text-xs">AZURE_OPENAI_*</code> to generate live copy and GPT-Image visuals.
          </span>
        </div>
      ) : null}

      <GenerationPanel
        campaignId={campaignId}
        azureConfigured={azureConfigured}
        defaultPainPoints={defaultPainPoints}
        brandVoices={brandVoices.map((v) => ({ id: v.id, name: v.name }))}
        onGenerated={onGenerated}
      />

      {creatives.length === 0 ? (
        <EmptyState
          icon={<Megaphone weight="duotone" className="size-5" />}
          title="No creatives yet"
          description="Generate your first set of platform-ready variants above. Each one is hook-analyzed and scored against direct-response best practices."
        />
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" stagger={0.05}>
            <StaggerItem><Stat label="Variants" value={stats.variants} icon={<Megaphone weight="duotone" />} /></StaggerItem>
            <StaggerItem><Stat label="Avg score" value={stats.avgScore} icon={<Target weight="duotone" />} /></StaggerItem>
            <StaggerItem><Stat label="Favorites" value={stats.favorites} icon={<Heart weight="duotone" />} /></StaggerItem>
            <StaggerItem><Stat label="Platforms" value={stats.platforms} icon={<Stack weight="duotone" />} /></StaggerItem>
            <StaggerItem><Stat label="Visuals" value={stats.images} icon={<ImagesSquare weight="duotone" />} /></StaggerItem>
          </Stagger>

          <WeakVariantsNudge creatives={creatives} />

          <Tabs value={view} onValueChange={(v) => setView(String(v))}>
            <TabsList variant="line" className="flex-wrap">
              <TabsTrigger value="all">
                <SquaresFour /> All
              </TabsTrigger>
              {platformsPresent.map((platform) => (
                <TabsTrigger key={platform} value={platform}>
                  <PlatformIcon platform={platform} className="size-4" />
                  {platformDisplayName(platform)}
                </TabsTrigger>
              ))}
              <TabsTrigger value="ab">
                <Stack /> A/B sets
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImagesSquare /> Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderGrid(creatives)}
            </TabsContent>

            {platformsPresent.map((platform) => (
              <TabsContent key={platform} value={platform} className="mt-4">
                {renderGrid(creatives.filter((c) => c.platform === platform))}
              </TabsContent>
            ))}

            <TabsContent value="ab" className="mt-4 space-y-6">
              {batches.length === 0 ? (
                <EmptyState
                  icon={<Stack weight="duotone" className="size-5" />}
                  title="No A/B sets yet"
                  description="Generate 2+ variants at once to form an A/B test set with varied psychological hooks."
                />
              ) : (
                batches.map((group) => (
                  <section key={group[0].content.batchId ?? group[0].id} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <PlatformIcon platform={group[0].platform} className="size-4 text-foreground/70" />
                      {platformDisplayName(group[0].platform)}
                      {group[0].content.angle ? <span className="text-muted-foreground">- {group[0].content.angle}</span> : null}
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {group.length} variants
                      </Badge>
                    </div>
                    {renderGrid(group)}
                  </section>
                ))
              )}
            </TabsContent>

            <TabsContent value="gallery" className="mt-4">
              {gallery.length === 0 ? (
                <EmptyState
                  icon={<ImagesSquare weight="duotone" className="size-5" />}
                  title="No visuals yet"
                  description="Generate a visual from any variant card. Images render at the platform's aspect ratio."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {gallery.map((img, index) => (
                    <FadeIn key={img.id} delay={index * 0.03}>
                      <a
                        href={img.url}
                        download={imageFilename(campaignName, img.aspectRatio ?? "1:1", index)}
                        className="group/img relative overflow-hidden rounded-lg ring-1 ring-foreground/10"
                        title="Download"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.promptUsed ?? img.headline} loading="lazy" className="aspect-square w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover/img:opacity-100">
                          <span className="flex items-center gap-1 text-[10px] text-white">
                            <PlatformIcon platform={img.platform} className="size-3" />
                            {img.aspectRatio}
                          </span>
                          <DownloadSimple weight="bold" className="size-3.5 text-white" />
                        </div>
                      </a>
                    </FadeIn>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function WeakVariantsNudge({ creatives }: { creatives: CreativeView[] }) {
  const weakCount = creatives.filter((c) => c.content.score.total < 50).length;
  if (weakCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <Sparkle weight="fill" className="size-4 shrink-0 text-primary" />
      <span className="text-sm text-foreground/80">
        {weakCount} variant{weakCount > 1 ? "s" : ""} scoring below 50.
      </span>
      <button
        type="button"
        className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        onClick={() => {
          const el = document.querySelector("[data-slot=generation-panel]");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      >
        <ArrowsClockwise className="size-3" /> Regenerate weak variants?
      </button>
    </div>
  );
}
