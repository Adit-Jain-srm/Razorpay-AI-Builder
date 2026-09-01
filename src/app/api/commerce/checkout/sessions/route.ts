/**
 * POST /api/commerce/checkout/sessions
 * GET  /api/commerce/checkout/sessions (list)
 *
 * ACP-inspired checkout sessions. An AI buyer or the Operator can create a
 * session with item IDs, get line totals, and receive a Razorpay order_id
 * once policy passes.
 *
 * See Docs/buildathon/protocols.md for the ACP reference.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { isRazorpayConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getProduct } from "@/lib/payments/products";

export const runtime = "nodejs";

/** In-memory session store (demo). Capped to prevent unbounded growth. */
const sessions = new Map<string, SessionData>();
const MAX_SESSIONS = 1_000;

function storeSession(id: string, session: SessionData): void {
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest !== undefined) sessions.delete(oldest);
  }
  sessions.set(id, session);
}

interface SessionItem {
  id: string;
  title: string;
  quantity: number;
  amountPaise: number;
  currency: string;
}

interface SessionData {
  id: string;
  status: "open" | "completed" | "expired";
  items: SessionItem[];
  totalPaise: number;
  currency: string;
  razorpayOrderId: string | null;
  createdAt: string;
}

const createSessionSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.number().int().min(1).max(10).default(1),
  })).min(1).max(10),
  buyer: z.object({ name: z.string().optional(), email: z.string().email().optional() }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session request", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const sessionItems: SessionItem[] = [];
    let totalPaise = 0;

    for (const item of parsed.data.items) {
      const product = getProduct(item.id);
      if (!product) {
        return NextResponse.json({ error: `Unknown product: ${item.id}` }, { status: 404 });
      }
      const linePaise = product.amountPaise * item.quantity;
      totalPaise += linePaise;
      sessionItems.push({
        id: item.id,
        title: product.title,
        quantity: item.quantity,
        amountPaise: linePaise,
        currency: product.currency,
      });
    }

    const sessionId = crypto.randomUUID();
    let razorpayOrderId: string | null = null;

    if (isRazorpayConfigured()) {
      const { createRazorpayOrder } = await import("@/lib/payments/razorpay");
      const rzpOrder = await createRazorpayOrder({
        amountPaise: totalPaise,
        currency: "INR",
        receipt: `session_${sessionId.slice(0, 8)}`,
        notes: { session_id: sessionId },
      });
      razorpayOrderId = rzpOrder.id;
    } else {
      razorpayOrderId = `order_demo_${sessionId.slice(0, 12)}`;
    }

    const session: SessionData = {
      id: sessionId,
      status: "open",
      items: sessionItems,
      totalPaise,
      currency: "INR",
      razorpayOrderId,
      createdAt: new Date().toISOString(),
    };

    storeSession(sessionId, session);

    return NextResponse.json({
      session_id: sessionId,
      status: session.status,
      items: session.items,
      total: { amount_paise: totalPaise, currency: "INR", formatted: `₹${(totalPaise / 100).toLocaleString("en-IN")}` },
      razorpay_order_id: razorpayOrderId,
      checkout_url: `/lp/aarogya-fit?order=${sessionId}`,
      mode: isRazorpayConfigured() ? "live" : "demo",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Session creation failed";
    logger.error("Commerce session creation failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const all = Array.from(sessions.values()).map((s) => ({
    session_id: s.id,
    status: s.status,
    total_paise: s.totalPaise,
    currency: s.currency,
    item_count: s.items.length,
    created_at: s.createdAt,
  }));
  return NextResponse.json({ sessions: all });
}
