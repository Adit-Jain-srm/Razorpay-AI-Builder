"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

import { refreshDailyBriefAction, seedDemoAnalyticsAction } from "@/app/(dashboard)/analytics/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Refresh the AI daily brief (persists an `ai_insights` row). */
export function BriefActions({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onRefresh = () => {
    startTransition(async () => {
      const result = await refreshDailyBriefAction(campaignId);
      if (result.ok) {
        toast.success(result.data.source === "ai" ? "AI daily brief refreshed" : "Daily brief refreshed (configure Azure for live AI)");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={pending}>
      <Sparkle className={cn(pending && "shimmer")} />
      Refresh brief
    </Button>
  );
}

/** Seed analytics for every real campaign that has creatives (idempotent). */
export function SeedAnalyticsButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSeed = () => {
    startTransition(async () => {
      const result = await seedDemoAnalyticsAction();
      if (result.ok) {
        const { campaigns, metricsWritten, skipped } = result.data;
        toast.success(
          campaigns > 0
            ? `Seeded ${metricsWritten.toLocaleString("en-US")} metrics across ${campaigns} campaign${campaigns === 1 ? "" : "s"}`
            : skipped.length > 0
              ? "Analytics already seeded"
              : "No campaigns with creatives to seed",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onSeed} disabled={pending}>
      <ArrowsClockwise className={cn(pending && "animate-spin")} />
      Seed analytics
    </Button>
  );
}
