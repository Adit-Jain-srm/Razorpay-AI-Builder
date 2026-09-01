"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowsLeftRight,
  ChatsCircle,
  Lightbulb,
  Megaphone,
  Play,
  Sparkle,
  TrendUp,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { runResearchProjectAction } from "@/app/(dashboard)/research/actions";
import type { ProviderResult, QueryParams, ResearchReport } from "@/lib/research/standard-models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonCard } from "@/components/ui/states";

import { CommunityPanel } from "./community-panel";
import { ComparisonView } from "./comparison-view";
import { CompetitorAdsPanel } from "./competitor-ads-panel";
import { ExportMenu } from "./export-menu";
import { OpportunitiesPanel } from "./opportunities-panel";
import { BuyingTriggersPanel, PainPointsPanel } from "./pain-points-panel";
import { PersonaCard } from "./persona-card";
import { ProviderRunStatus, type ProviderRunInfo } from "./provider-run-status";
import { SourcesPanel } from "./sources-panel";
import { TrendsPanel } from "./trend-chart";

type RunEvent =
  | { type: "start"; query: string }
  | { type: "provider"; result: ProviderResult }
  | { type: "report"; report: ResearchReport }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ResearchWorkspaceProps {
  projectId: string;
  projectName: string;
  params: QueryParams;
  initialReport: ResearchReport | null;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
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

function summaryFromReport(report: ResearchReport | null): Record<string, ProviderRunInfo> {
  if (!report) return {};
  const map: Record<string, ProviderRunInfo> = {};
  for (const run of report.providerRuns) map[run.provider] = { status: run.status, itemCount: run.itemCount };
  return map;
}

export function ResearchWorkspace({ projectId, projectName, params, initialReport }: ResearchWorkspaceProps) {
  const [report, setReport] = useState<ResearchReport | null>(initialReport);
  const [running, setRunning] = useState(false);
  const [providerResults, setProviderResults] = useState<Record<string, ProviderRunInfo>>(() => summaryFromReport(initialReport));
  const [view, setView] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  const handleEvent = useCallback((event: RunEvent) => {
    switch (event.type) {
      case "provider":
        setProviderResults((prev) => ({
          ...prev,
          [event.result.provider]: { status: event.result.status, itemCount: event.result.items.length },
        }));
        break;
      case "report":
        setReport(event.report);
        break;
      case "error":
        setError(event.message);
        toast.error(event.message);
        break;
      default:
        break;
    }
  }, []);

  const runViaAction = useCallback(async () => {
    const result = await runResearchProjectAction(projectId, params);
    if (result.ok) {
      setReport(result.data);
      setProviderResults(summaryFromReport(result.data));
      toast.success("Research complete");
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  }, [projectId, params]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setProviderResults({});
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, params }),
      });
      if (!res.ok || !res.body) throw new Error("Streaming unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawReport = false;

      const flush = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const event = JSON.parse(trimmed) as RunEvent;
          if (event.type === "report") sawReport = true;
          handleEvent(event);
        } catch {
          // ignore malformed partial lines
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

      if (!sawReport) await runViaAction();
      else toast.success("Research complete");
    } catch {
      // Streaming failed - fall back to the server action.
      try {
        await runViaAction();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Research failed";
        setError(message);
        toast.error(message);
      }
    } finally {
      setRunning(false);
    }
  }, [projectId, params, handleEvent, runViaAction]);

  const stats = useMemo(() => {
    const sourceCount = new Set(
      (report?.sources ?? []).filter((s) => !s.provider.startsWith("_")).map((s) => s.url ?? s.title ?? s.provider),
    ).size;
    return {
      personas: report?.segments.length ?? 0,
      ads: report?.competitorAds.length ?? 0,
      pains: report?.painPoints.length ?? 0,
      trends: report?.trends.length ?? 0,
      opportunities: report?.opportunities.length ?? 0,
      sources: sourceCount,
    };
  }, [report]);

  const showStatus = running || Object.keys(providerResults).length > 0;
  const hasReport = report !== null && report.segments.length + report.competitorAds.length + report.trends.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{projectName}</h2>
            {running ? (
              <Badge variant="secondary" className="font-mono">
                <Sparkle className="size-3 shimmer" /> running
              </Badge>
            ) : hasReport ? (
              <Badge variant="outline" className="font-mono text-success">ready</Badge>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{params.query}</p>
        </div>
        <div className="flex items-center gap-2">
          {report ? <ExportMenu report={report} projectName={projectName} /> : null}
          <Button size="sm" onClick={run} disabled={running}>
            <Play weight="fill" />
            {running ? "Running…" : hasReport ? "Re-run" : "Run research"}
          </Button>
        </div>
      </header>

      {showStatus ? <ProviderRunStatus results={providerResults} running={running} /> : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <Warning weight="fill" className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {!hasReport && running ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {hasReport && report ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Personas" value={stats.personas} icon={<UsersThree weight="duotone" />} />
            <Stat label="Opportunities" value={stats.opportunities} icon={<Lightbulb weight="duotone" />} />
            <Stat label="Pain points" value={stats.pains} icon={<Warning weight="duotone" />} />
            <Stat label="Competitor ads" value={stats.ads} icon={<Megaphone weight="duotone" />} />
            <Stat label="Trends" value={stats.trends} icon={<TrendUp weight="duotone" />} />
            <Stat label="Sources" value={stats.sources} icon={<ChatsCircle weight="duotone" />} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <Tabs value={view} onValueChange={(value) => setView(String(value))}>
                <TabsList variant="line" className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="personas">
                    <UsersThree /> Personas
                  </TabsTrigger>
                  <TabsTrigger value="competitors">
                    <Megaphone /> Competitors
                  </TabsTrigger>
                  <TabsTrigger value="community">
                    <ChatsCircle /> Community
                  </TabsTrigger>
                  <TabsTrigger value="trends">
                    <TrendUp /> Trends
                  </TabsTrigger>
                  <TabsTrigger value="opportunities">
                    <Lightbulb /> Opportunities
                  </TabsTrigger>
                  <TabsTrigger value="compare">
                    <ArrowsLeftRight /> Compare
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-5">
                  <section className="space-y-3">
                    <SectionTitle icon={<Lightbulb weight="duotone" />} title="Opportunities" />
                    <OpportunitiesPanel opportunities={report.opportunities.slice(0, 3)} />
                  </section>
                  <section className="space-y-3">
                    <SectionTitle icon={<UsersThree weight="duotone" />} title="Top personas" />
                    <div className="grid gap-3 lg:grid-cols-2">
                      {report.segments.slice(0, 2).map((persona, i) => (
                        <PersonaCard key={i} persona={persona} />
                      ))}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <SectionTitle icon={<Warning weight="duotone" />} title="Strongest pain points" />
                    <PainPointsPanel painPoints={report.painPoints.slice(0, 4)} />
                  </section>
                </TabsContent>

                <TabsContent value="personas" className="mt-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    {report.segments.map((persona, i) => (
                      <PersonaCard key={i} persona={persona} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="competitors" className="mt-4">
                  <CompetitorAdsPanel ads={report.competitorAds} />
                </TabsContent>

                <TabsContent value="community" className="mt-4">
                  <CommunityPanel insights={report.communityInsights} />
                </TabsContent>

                <TabsContent value="trends" className="mt-4">
                  <TrendsPanel trends={report.trends} />
                </TabsContent>

                <TabsContent value="opportunities" className="mt-4 space-y-5">
                  <OpportunitiesPanel opportunities={report.opportunities} />
                  <section className="space-y-3">
                    <SectionTitle icon={<TrendUp weight="duotone" />} title="Buying triggers" />
                    <BuyingTriggersPanel triggers={report.buyingTriggers} />
                  </section>
                </TabsContent>

                <TabsContent value="compare" className="mt-4">
                  <ComparisonView personas={report.segments} />
                </TabsContent>
              </Tabs>
            </div>

            <aside className="xl:sticky xl:top-4 xl:h-[calc(100dvh-2rem)]">
              <div className="h-full max-h-[70vh] overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 xl:max-h-none">
                <SourcesPanel sources={report.sources} />
              </div>
            </aside>
          </div>
        </>
      ) : null}

      {!hasReport && !running ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 px-6 py-12 text-center">
          <div className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
            <Sparkle weight="duotone" className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-sm font-medium text-foreground">Ready to research</h3>
            <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">
              Run the engine to stream competitor ads, search intent, community pain points, news, and social - then
              synthesize cited personas and opportunities.
            </p>
          </div>
          <Button size="sm" onClick={run} disabled={running}>
            <Play weight="fill" />
            Run research
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      <span className="text-primary [&_svg]:size-4">{icon}</span>
      {title}
    </div>
  );
}
