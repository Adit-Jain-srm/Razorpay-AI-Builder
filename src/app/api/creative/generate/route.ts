import type { NextRequest } from "next/server";

import { toErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateCreatives } from "@/lib/creative/studio";
import { creativeRequestSchema } from "@/lib/validators";

/**
 * Streaming creative generation. Emits newline-delimited JSON (NDJSON): a `start`
 * event, live `delta` token events while the model writes, then a `variants`
 * event with the persisted, scored, hook-analyzed creatives. Never throws to the
 * client - failures surface as an `error` event. Runs on Node (Azure + Supabase).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const parsed = creativeRequestSchema.safeParse(body);

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

      if (!parsed.success) {
        send({ type: "error", message: parsed.error.issues.map((i) => i.message).join("; ") || "Invalid request" });
        controller.close();
        return;
      }

      send({ type: "start", platform: parsed.data.platform, count: parsed.data.count });

      try {
        const result = await generateCreatives(parsed.data, {
          signal: request.signal,
          onDelta: (text) => send({ type: "delta", text }),
        });
        send({ type: "variants", creatives: result.creatives, source: result.source, batchId: result.batchId });
        send({ type: "done" });
      } catch (error) {
        logger.error("creative generate stream failed", error);
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
      "x-accel-buffering": "no",
    },
  });
}
