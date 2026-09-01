import type { NextRequest } from "next/server";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { runResearchPipeline } from "@/lib/research/orchestrator";
import { runResearchForProject } from "@/lib/research/service";
import { queryParamsSchema, type ProviderResult } from "@/lib/research/standard-models";

// Streaming research run. Emits newline-delimited JSON (NDJSON) events so the
// workspace renders provider results progressively as they arrive, then the
// synthesized report. Persistence happens server-side. Runs on Node (Supabase +
// cookies). Never throws to the client: failures are emitted as `error` events.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunBody {
  projectId?: string;
  params?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as RunBody;
  const parsedParams = queryParamsSchema.safeParse(body.params);
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      if (!parsedParams.success) {
        send({ type: "error", message: "Invalid research parameters" });
        controller.close();
        return;
      }

      send({ type: "start", query: parsedParams.data.query });

      try {
        const onProviderResult = (result: ProviderResult) => send({ type: "provider", result });
        const report = projectId
          ? await runResearchForProject(projectId, parsedParams.data, { signal: request.signal, onProviderResult })
          : await runResearchPipeline(parsedParams.data, { signal: request.signal, onProviderResult });

        send({ type: "report", report });
        send({ type: "done" });
      } catch (error) {
        logger.error("research run stream failed", error, { projectId });
        send({ type: "error", message: toErrorMessage(error) });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}
