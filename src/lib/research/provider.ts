import { toErrorMessage } from "@/lib/errors";
import type { ProviderResult, QueryParams, SourceCitation, StandardModel, StandardModelKind } from "./standard-models";

/**
 * OpenBB-inspired provider abstraction. Each research source implements the same
 * Transform -> Extract -> Transform (TET) pipeline so the orchestrator can run
 * any number of them uniformly and merge their normalized output. Adding a data
 * source = implementing this class and registering it; the core never changes.
 */

/** Provider-specific query produced by `transformQuery`. */
export type ProviderQuery = Record<string, unknown>;

/** Raw, un-normalized payload returned by `extractData` (before normalization). */
export type RawData = Record<string, unknown>;

export interface ProviderRunContext {
  signal?: AbortSignal;
  /** Soft cap on items to fetch/return. */
  limit?: number;
}

export interface NormalizedOutput<D extends StandardModel = StandardModel> {
  items: D[];
  sources: SourceCitation[];
}

export abstract class ResearchProvider<Q extends ProviderQuery = ProviderQuery, D extends StandardModel = StandardModel> {
  /** Stable identifier used by the registry + orchestrator selection. */
  abstract readonly name: string;
  /** Human-readable title for the UI. */
  abstract readonly title: string;
  abstract readonly description: string;
  /** Which standard-model kinds this provider can yield. */
  abstract readonly produces: ReadonlyArray<StandardModelKind>;
  /**
   * Bright Data capability tier required: "free" (search_engine / scrape) is
   * always available; "pro" (web_data_*) degrades gracefully when unavailable.
   */
  readonly tier: "free" | "pro" = "free";

  /** T - map provider-agnostic params into this provider's query shape. */
  abstract transformQuery(params: QueryParams): Q | Promise<Q>;
  /** E - fetch raw data (via the Bright Data adapter). */
  abstract extractData(query: Q, ctx: ProviderRunContext): Promise<RawData>;
  /** T - normalize raw data into standard models + citations. */
  abstract transformData(raw: RawData, params: QueryParams): NormalizedOutput<D> | Promise<NormalizedOutput<D>>;

  /** Whether this provider can currently run (override for Pro-gated providers). */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Runs the full TET pipeline and returns a `ProviderResult`, never throwing -
   * a failed provider degrades to an empty, error-tagged result so one bad
   * source cannot break an orchestrated run.
   */
  async run(params: QueryParams, ctx: ProviderRunContext = {}): Promise<ProviderResult> {
    const startedAt = Date.now();
    try {
      const query = await this.transformQuery(params);
      const raw = await this.extractData(query, ctx);
      const { items, sources } = await this.transformData(raw, params);
      return {
        provider: this.name,
        items,
        sources,
        status: "success",
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        provider: this.name,
        items: [],
        sources: [],
        status: "failed",
        error: toErrorMessage(error),
        durationMs: Date.now() - startedAt,
      };
    }
  }
}
