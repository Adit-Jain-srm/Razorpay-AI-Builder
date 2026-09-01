"use client";

import { useMemo, useState, useTransition } from "react";
import { Quotes, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deriveToneProfile, HOOK_LABELS, type ToneProfile } from "@/lib/creative";

import { removeBrandVoiceAction, saveBrandVoiceAction } from "@/app/(dashboard)/creatives/actions";
import type { BrandVoiceView } from "@/lib/creative/studio";

function ToneChips({ profile }: { profile: ToneProfile }) {
  if (profile.sampleCount === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary" className="font-mono text-[10px] capitalize">
        {profile.formality}
      </Badge>
      <Badge variant="secondary" className="font-mono text-[10px]">
        ~{profile.avgSentenceLength}w/sentence
      </Badge>
      {profile.dominantHooks.slice(0, 2).map((hook) => (
        <Badge key={hook} variant="outline" className="border-primary/30 text-primary text-[10px]">
          {HOOK_LABELS[hook]}
        </Badge>
      ))}
      {profile.descriptors.slice(0, 3).map((d) => (
        <Badge key={d} variant="outline" className="text-[10px]">
          {d}
        </Badge>
      ))}
    </div>
  );
}

export function BrandVoicePanel({
  brandVoices,
  onChange,
}: {
  brandVoices: BrandVoiceView[];
  onChange: (next: BrandVoiceView[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [samples, setSamples] = useState("");
  const [pending, startTransition] = useTransition();

  const sampleLines = useMemo(() => samples.split("\n").map((s) => s.trim()).filter((s) => s.length > 0), [samples]);
  const preview = useMemo(() => deriveToneProfile(sampleLines), [sampleLines]);

  const save = () => {
    startTransition(async () => {
      const result = await saveBrandVoiceAction({ name, sampleAds: sampleLines });
      if (result.ok) {
        onChange([result.data, ...brandVoices]);
        setName("");
        setSamples("");
        toast.success("Brand voice learned");
      } else {
        toast.error(result.error);
      }
    });
  };

  const remove = (id: string) => {
    onChange(brandVoices.filter((v) => v.id !== id));
    startTransition(async () => {
      const result = await removeBrandVoiceAction(id);
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Quotes weight="fill" /> Brand voice{brandVoices.length > 0 ? ` (${brandVoices.length})` : ""}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Brand voice</DialogTitle>
          <DialogDescription>
            Paste a few winning ads. MediaOS derives a tone profile and biases new copy toward it.
          </DialogDescription>
        </DialogHeader>

        {brandVoices.length > 0 ? (
          <div className="space-y-2">
            {brandVoices.map((voice) => (
              <div key={voice.id} className="space-y-1.5 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{voice.name}</span>
                  <Button size="icon-xs" variant="ghost" onClick={() => remove(voice.id)} aria-label="Delete brand voice">
                    <Trash />
                  </Button>
                </div>
                <ToneChips profile={voice.profile} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="bv-name">Name</Label>
            <Input id="bv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plain-English, no-hype" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bv-samples">Winning ads (one per line)</Label>
            <Textarea
              id="bv-samples"
              value={samples}
              onChange={(e) => setSamples(e.target.value)}
              rows={4}
              placeholder={"Tired of newsletters that upsell you? Get the plain-English plan.\nInflation is eating your savings. Here's the fix."}
            />
          </div>
          {sampleLines.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Derived tone</span>
              <ToneChips profile={preview} />
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={save} disabled={pending || sampleLines.length === 0 || name.trim().length === 0}>
              {pending ? "Learning…" : "Learn voice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
