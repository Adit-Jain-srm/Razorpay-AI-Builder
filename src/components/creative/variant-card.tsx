"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowsClockwise,
  Check,
  Heart,
  ImageSquare,
  PencilSimple,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { getRoleSpec, measureField, type CreativeField } from "@/lib/creative";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/validators/creative";
import { cn } from "@/lib/utils";

import {
  editCreativeAction,
  favoriteCreativeAction,
  generateImagesAction,
  rateCreativeAction,
  regenerateCreativeAction,
  removeCreativeAction,
} from "@/app/(dashboard)/creatives/actions";
import type { CreativeView } from "@/lib/creative/studio";

import { CharMeter, FlagBadges, HookBadge, ScoreMeter, StarRating } from "./creative-bits";
import { PlatformIcon } from "./platform-meta";

interface VariantCardProps {
  creative: CreativeView;
  onUpdated: (next: CreativeView) => void;
  onRemoved: (id: string) => void;
  azureConfigured: boolean;
}

interface FieldGroup {
  role: string;
  label: string;
  multiline: boolean;
  fields: { field: CreativeField; index: number }[];
}

function groupFields(creative: CreativeView): FieldGroup[] {
  const order: string[] = [];
  const map = new Map<string, { field: CreativeField; index: number }[]>();
  creative.content.fields.forEach((field, index) => {
    if (!map.has(field.role)) {
      map.set(field.role, []);
      order.push(field.role);
    }
    map.get(field.role)!.push({ field, index });
  });
  return order.map((role) => {
    const spec = getRoleSpec(creative.platform, role);
    return {
      role,
      label: spec?.label ?? role,
      multiline: spec?.multiline ?? false,
      fields: map.get(role)!,
    };
  });
}

export function VariantCard({ creative, onUpdated, onRemoved, azureConfigured }: VariantCardProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [drafts, setDrafts] = useState<string[]>(() => creative.content.fields.map((f) => f.text));

  const groups = useMemo(() => groupFields(creative), [creative]);
  const { content } = creative;

  const beginEdit = () => {
    setDrafts(creative.content.fields.map((f) => f.text));
    setEditing(true);
  };

  const saveEdit = () => {
    const fields: CreativeField[] = creative.content.fields.map((f, i) => measureField(f.role, f.label, f.limit, drafts[i] ?? f.text));
    startTransition(async () => {
      const result = await editCreativeAction({ creativeId: creative.id, fields });
      if (result.ok) {
        onUpdated(result.data);
        setEditing(false);
        toast.success("Creative updated");
      } else {
        toast.error(result.error);
      }
    });
  };

  const regenerate = () => {
    startTransition(async () => {
      const result = await regenerateCreativeAction(creative.id);
      if (result.ok) {
        onUpdated(result.data);
        toast.success("Regenerated");
      } else {
        toast.error(result.error);
      }
    });
  };

  const toggleFavorite = () => {
    const next = !creative.isFavorite;
    onUpdated({ ...creative, isFavorite: next });
    startTransition(async () => {
      const result = await favoriteCreativeAction(creative.id, next);
      if (!result.ok) {
        onUpdated({ ...creative, isFavorite: !next });
        toast.error(result.error);
      }
    });
  };

  const setRating = (rating: number | null) => {
    onUpdated({ ...creative, rating });
    startTransition(async () => {
      const result = await rateCreativeAction({ creativeId: creative.id, rating });
      if (!result.ok) toast.error(result.error);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await removeCreativeAction(creative.id);
      if (result.ok) {
        onRemoved(creative.id);
        toast.success("Deleted");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <article
      className={cn(
        "card-hover flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow",
        creative.isFavorite && "ring-primary/40",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <PlatformIcon platform={creative.platform} className="size-4 text-foreground/70" />
          <span className="font-medium text-foreground capitalize">{content.format}</span>
          {creative.version > 1 ? (
            <Badge variant="secondary" className="font-mono text-[10px]">
              v{creative.version}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="icon-xs" variant="ghost" onClick={toggleFavorite} disabled={pending} aria-label="Favorite" title="Favorite">
            <Heart weight={creative.isFavorite ? "fill" : "regular"} className={creative.isFavorite ? "text-primary" : ""} />
          </Button>
          {!editing ? (
            <>
              <Button size="icon-xs" variant="ghost" onClick={regenerate} disabled={pending} aria-label="Regenerate" title="Regenerate">
                <ArrowsClockwise className={pending ? "animate-spin motion-reduce:animate-none" : ""} />
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={beginEdit} disabled={pending} aria-label="Edit" title="Edit">
                <PencilSimple />
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={remove} disabled={pending} aria-label="Delete" title="Delete">
                <Trash />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon-xs" variant="ghost" onClick={saveEdit} disabled={pending} aria-label="Save" title="Save">
                <Check className="text-success" />
              </Button>
              <Button size="icon-xs" variant="ghost" onClick={() => setEditing(false)} disabled={pending} aria-label="Cancel" title="Cancel">
                <X />
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <HookBadge hook={content.hook} />
        <button type="button" onClick={() => setShowBreakdown((s) => !s)} className="cursor-pointer rounded transition-opacity hover:opacity-80">
          <ScoreMeter total={content.score.total} />
        </button>
        <FlagBadges flags={content.flags} />
      </div>

      {showBreakdown ? (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Hook", content.score.breakdown.hookStrength],
                ["Clarity", content.score.breakdown.clarity],
                ["Specificity", content.score.breakdown.specificity],
                ["CTA", content.score.breakdown.ctaStrength],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
                  <span>{label}</span>
                  <span className="font-mono">{value}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out motion-reduce:transition-none" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
          {content.score.notes.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {content.score.notes.map((note, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-primary">-</span>
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.role} className="space-y-1.5">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{group.label}</div>
            {group.fields.map(({ field, index }) =>
              editing ? (
                <div key={index} className="space-y-1">
                  <Textarea
                    value={drafts[index] ?? ""}
                    onChange={(e) => setDrafts((prev) => prev.map((d, i) => (i === index ? e.target.value : d)))}
                    rows={group.multiline ? 2 : 1}
                    className="min-h-0 text-sm"
                  />
                  <div className="flex justify-end">
                    <CharMeter length={(drafts[index] ?? "").length} limit={field.limit} />
                  </div>
                </div>
              ) : (
                <div key={index} className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm text-pretty", group.role === "headline" || group.role === "hook" ? "font-medium text-foreground" : "text-foreground/80")}>
                    {field.text || <span className="text-muted-foreground/50">-</span>}
                  </p>
                  <CharMeter length={field.length} limit={field.limit} />
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      <footer className="mt-auto space-y-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {content.angle ? (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {content.angle}
            </Badge>
          ) : null}
          {content.painPointsTargeted.slice(0, 2).map((p, i) => (
            <Badge key={i} variant="outline" className="max-w-44 truncate border-destructive/30 text-destructive" title={p}>
              {p}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <StarRating value={creative.rating} onChange={setRating} disabled={pending} />
          <Button size="xs" variant="outline" onClick={() => setImageOpen(true)} disabled={pending}>
            <ImageSquare /> Visual
          </Button>
        </div>

        {creative.images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {creative.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.promptUsed ?? "Ad visual"}
                loading="lazy"
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-foreground/10"
              />
            ))}
          </div>
        ) : null}
      </footer>

      <ImageDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        creative={creative}
        azureConfigured={azureConfigured}
        onGenerated={(images) => onUpdated({ ...creative, images: [...images, ...creative.images] })}
      />
    </article>
  );
}

function ImageDialog({
  open,
  onOpenChange,
  creative,
  azureConfigured,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creative: CreativeView;
  azureConfigured: boolean;
  onGenerated: (images: CreativeView["images"]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [aspect, setAspect] = useState<AspectRatio>(creative.platform === "tiktok" ? "9:16" : "1:1");
  const [count, setCount] = useState(1);
  const [prompt, setPrompt] = useState(creative.content.angle || creative.content.headline || "");

  const generate = () => {
    startTransition(async () => {
      const result = await generateImagesAction({
        creativeId: creative.id,
        prompt: prompt.trim() || creative.content.headline || "ad visual",
        aspectRatio: aspect,
        count,
        platform: creative.platform,
      });
      if (result.ok) {
        onGenerated(result.data.images);
        toast.success(result.data.source === "ai" ? "Visuals generated" : "Seeded preview visuals (configure Azure for real images)");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate visual</DialogTitle>
          <DialogDescription>
            {azureConfigured
              ? "GPT-Image renders a platform-ready visual and uploads it to storage."
              : "Azure is not configured - a branded placeholder will be created at the right aspect ratio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`img-prompt-${creative.id}`}>Concept</Label>
            <Textarea
              id={`img-prompt-${creative.id}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="What should the image show?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Aspect ratio</Label>
              <Select value={aspect} onValueChange={(v) => setAspect(v as AspectRatio)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio} value={ratio}>
                      {ratio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Count: {count}</Label>
              <Slider
                min={1}
                max={4}
                value={count}
                onValueChange={(v) => setCount(Array.isArray(v) ? (v[0] ?? 1) : v)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={generate} disabled={pending}>
            <Sparkle weight="fill" className={pending ? "shimmer" : ""} />
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
