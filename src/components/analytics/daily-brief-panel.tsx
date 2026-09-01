import { Sparkle, Robot } from "@phosphor-icons/react/dist/ssr";

import type { DailyBriefResult } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion";

interface DailyBriefPanelProps {
  brief: DailyBriefResult;
}

/** AI daily brief panel - renders the natural-language summary as paragraphs. */
export function DailyBriefPanel({ brief }: DailyBriefPanelProps) {
  const paragraphs = brief.content.split(/\n{2,}/).filter((line) => line.trim().length > 0);
  return (
    <FadeIn delay={0.1}>
      <div className="space-y-3 rounded-xl bg-gradient-to-b from-primary/[0.06] to-card p-4 ring-1 ring-primary/15">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          <Sparkle weight="fill" className="size-4" />
          AI Daily Brief
        </div>
        <Badge variant={brief.source === "ai" ? "default" : "outline"} className="gap-1 font-mono text-[10px]">
          {brief.source === "ai" ? <Robot className="size-3" /> : <Sparkle className="size-3" />}
          {brief.source === "ai" ? "GPT-4o" : "Auto"}
        </Badge>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-pretty text-foreground/90">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
    </FadeIn>
  );
}
