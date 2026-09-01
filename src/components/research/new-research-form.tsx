"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MagicWand, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { createResearchProjectAction } from "@/app/(dashboard)/research/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEMO = {
  name: "Retirement Income Weekly",
  query: "Near-retirees worried about inflation eroding their retirement savings",
  industry: "financial newsletters",
  product: "retirement income newsletter",
  audienceHint: "near-retirees aged 58-67 worried about inflation",
  region: "us",
  competitors: "Motley Fool, Stansberry Research, Retirement Watch",
};

const EMPTY = { name: "", query: "", industry: "", product: "", audienceHint: "", region: "us", competitors: "" };

export function NewResearchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const competitors = form.competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const result = await createResearchProjectAction({
        name: form.name.trim() || form.query.slice(0, 60) || "Untitled research",
        query: form.query,
        industry: form.industry || undefined,
        product: form.product || undefined,
        audienceHint: form.audienceHint || undefined,
        region: form.region || undefined,
        competitors: competitors.length ? competitors : undefined,
      });
      if (result.ok) {
        toast.success("Research project created");
        router.push(`/research/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-medium text-foreground">New research project</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setForm(DEMO)} disabled={pending}>
          <MagicWand /> Use demo
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Project name</Label>
          <Input id="name" value={form.name} onChange={update("name")} placeholder="Retirement Income Weekly" disabled={pending} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="query">Audience / topic to research</Label>
          <Textarea
            id="query"
            value={form.query}
            onChange={update("query")}
            placeholder="Near-retirees worried about inflation eroding their savings"
            rows={2}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry (optional)</Label>
          <Input id="industry" value={form.industry} onChange={update("industry")} placeholder="financial newsletters" disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product">Product (optional)</Label>
          <Input id="product" value={form.product} onChange={update("product")} placeholder="retirement income newsletter" disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audienceHint">Audience hint (optional)</Label>
          <Input id="audienceHint" value={form.audienceHint} onChange={update("audienceHint")} placeholder="aged 58-67, near retirement" disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="region">Region</Label>
          <Input id="region" value={form.region} onChange={update("region")} placeholder="us" maxLength={5} disabled={pending} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="competitors">Competitors (optional, comma-separated)</Label>
          <Input id="competitors" value={form.competitors} onChange={update("competitors")} placeholder="Motley Fool, Stansberry Research" disabled={pending} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || form.query.trim().length < 3}>
          <Plus weight="bold" />
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
