"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LandingSection } from "@/lib/landing/types";

/**
 * Inline inspector for the selected section. Renders type-aware fields and emits
 * a partial patch the editor merges into the section. Array fields edit in place
 * with add/remove; string lists use one-per-line textareas.
 */

interface SectionInspectorProps {
  section: LandingSection;
  onChange: (patch: Partial<LandingSection>) => void;
}

function ScalarField({ label, value, onChange, area = false, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {area ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-20" />
      ) : (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function LinesField({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} <span className="text-muted-foreground">(one per line)</span></Label>
      <Textarea
        value={values.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((l) => l.trimStart()).filter((l, i, arr) => l.length > 0 || i === arr.length - 1))}
        className="min-h-24"
      />
    </div>
  );
}

interface ItemListProps<T> {
  label: string;
  items: T[];
  fields: { key: keyof T; label: string; area?: boolean }[];
  blank: T;
  onChange: (items: T[]) => void;
}

function ItemListEditor<T extends Record<string, unknown>>({ label, items, fields, blank, onChange }: ItemListProps<T>) {
  const update = (index: number, key: keyof T, value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={index} className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash />
              </Button>
            </div>
            {fields.map((field) =>
              field.area ? (
                <Textarea
                  key={String(field.key)}
                  value={String(item[field.key] ?? "")}
                  onChange={(e) => update(index, field.key, e.target.value)}
                  placeholder={field.label}
                  className="min-h-16"
                />
              ) : (
                <Input
                  key={String(field.key)}
                  value={String(item[field.key] ?? "")}
                  onChange={(e) => update(index, field.key, e.target.value)}
                  placeholder={field.label}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...blank }])}>
        <Plus /> Add
      </Button>
    </div>
  );
}

export function SectionInspector({ section, onChange }: SectionInspectorProps) {
  const patch = (p: Partial<LandingSection>) => onChange(p);

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <ScalarField label="Eyebrow" value={section.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
          <ScalarField label="Headline" value={section.headline} onChange={(v) => patch({ headline: v })} area />
          <ScalarField label="Subheadline" value={section.subheadline} onChange={(v) => patch({ subheadline: v })} area />
          <LinesField label="Bullets" values={section.bullets} onChange={(v) => patch({ bullets: v })} />
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </div>
      );
    case "rich_text":
      return (
        <div className="space-y-3">
          <ScalarField label="Eyebrow" value={section.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Byline" value={section.byline} onChange={(v) => patch({ byline: v })} />
          <LinesField label="Paragraphs" values={section.paragraphs} onChange={(v) => patch({ paragraphs: v })} />
          <LinesField label="Bullets" values={section.bullets} onChange={(v) => patch({ bullets: v })} />
        </div>
      );
    case "features":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Subtitle" value={section.subtitle} onChange={(v) => patch({ subtitle: v })} />
          <ItemListEditor
            label="Items"
            items={section.items}
            fields={[
              { key: "title", label: "Title" },
              { key: "body", label: "Body", area: true },
            ]}
            blank={{ title: "", body: "", icon: "CheckCircle" }}
            onChange={(items) => patch({ items })}
          />
        </div>
      );
    case "social_proof":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ItemListEditor
            label="Stats"
            items={section.items}
            fields={[
              { key: "value", label: "Value" },
              { key: "label", label: "Label" },
            ]}
            blank={{ value: "", label: "" }}
            onChange={(items) => patch({ items })}
          />
          <ScalarField label="Note" value={section.note} onChange={(v) => patch({ note: v })} />
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ItemListEditor
            label="Testimonials"
            items={section.items}
            fields={[
              { key: "quote", label: "Quote", area: true },
              { key: "name", label: "Name" },
              { key: "role", label: "Role" },
            ]}
            blank={{ quote: "", name: "", role: "", rating: 5 }}
            onChange={(items) => patch({ items })}
          />
        </div>
      );
    case "listicle":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Intro" value={section.intro} onChange={(v) => patch({ intro: v })} area />
          <ItemListEditor
            label="Items"
            items={section.items}
            fields={[
              { key: "title", label: "Title" },
              { key: "body", label: "Body", area: true },
            ]}
            blank={{ title: "", body: "" }}
            onChange={(items) => patch({ items })}
          />
        </div>
      );
    case "faq":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ItemListEditor
            label="Questions"
            items={section.items}
            fields={[
              { key: "q", label: "Question" },
              { key: "a", label: "Answer", area: true },
            ]}
            blank={{ q: "", a: "" }}
            onChange={(items) => patch({ items })}
          />
        </div>
      );
    case "countdown":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Subtitle" value={section.subtitle} onChange={(v) => patch({ subtitle: v })} />
          <ScalarField
            label="Duration (minutes)"
            type="number"
            value={String(section.durationMinutes)}
            onChange={(v) => patch({ durationMinutes: Math.max(1, Number(v) || 1) })}
          />
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </div>
      );
    case "quiz":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Subtitle" value={section.subtitle} onChange={(v) => patch({ subtitle: v })} />
          <ScalarField label="Result title" value={section.resultTitle} onChange={(v) => patch({ resultTitle: v })} />
          <ScalarField label="Result body" value={section.resultBody} onChange={(v) => patch({ resultBody: v })} area />
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </div>
      );
    case "lead_form":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <ScalarField label="Subtitle" value={section.subtitle} onChange={(v) => patch({ subtitle: v })} />
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label>Collect first name</Label>
            <Switch checked={section.collectName} onCheckedChange={(v) => patch({ collectName: Boolean(v) })} />
          </div>
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
          <ScalarField label="Disclaimer" value={section.disclaimer} onChange={(v) => patch({ disclaimer: v })} />
          <ScalarField label="Success title" value={section.successTitle} onChange={(v) => patch({ successTitle: v })} />
          <ScalarField label="Success message" value={section.successMessage} onChange={(v) => patch({ successMessage: v })} area />
        </div>
      );
    case "exit_intent":
      return (
        <div className="space-y-3">
          <ScalarField label="Headline" value={section.headline} onChange={(v) => patch({ headline: v })} />
          <ScalarField label="Body" value={section.body} onChange={(v) => patch({ body: v })} area />
          <ScalarField label="Incentive" value={section.incentive} onChange={(v) => patch({ incentive: v })} />
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          <ScalarField label="Headline" value={section.headline} onChange={(v) => patch({ headline: v })} />
          <ScalarField label="Subtitle" value={section.subtitle} onChange={(v) => patch({ subtitle: v })} area />
          <ScalarField label="CTA label" value={section.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </div>
      );
    case "compliance":
      return (
        <div className="space-y-3">
          <ScalarField label="Title" value={section.title} onChange={(v) => patch({ title: v })} />
          <LinesField label="Disclaimers" values={section.disclaimers} onChange={(v) => patch({ disclaimers: v })} />
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">This section has no editable fields.</p>;
  }
}
