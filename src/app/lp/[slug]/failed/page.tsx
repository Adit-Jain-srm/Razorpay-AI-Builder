import Link from "next/link";
import { WarningCircle, ShieldWarning } from "@phosphor-icons/react/dist/ssr";

import { getOrderById } from "@/lib/payments/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailedSearchParams = Promise<{ order?: string }>;

function formatInrFromPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 14)}…` : id;
}

export default async function LandingCheckoutFailedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: FailedSearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const orderId = typeof sp.order === "string" && sp.order.trim().length > 0 ? sp.order.trim() : null;

  // Server-side order lookup
  const order = orderId ? getOrderById(orderId) : undefined;

  const displayOrderId = order?.orderId ?? orderId;
  const displayProduct = order?.productTitle ?? order?.sku ?? null;
  const displayAmount = order ? formatInrFromPaise(order.amountPaise) : null;
  const displayStatus = order?.status ?? "failed";
  const timestamp = order?.updatedAt
    ? new Date(order.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return (
    <main className="min-h-dvh bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-xl space-y-5">
        {/* Failure card */}
        <div className="rounded-2xl border border-amber-500/40 bg-zinc-900/80 p-6 shadow-lg shadow-amber-950/20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
            <WarningCircle weight="fill" className="size-4" />
            Payment could not be completed
          </div>
          <h1 className="text-2xl font-bold text-zinc-50">Try a new checkout attempt</h1>
          <p className="mt-2 text-sm text-zinc-300">
            This order will not be retried. The policy engine prevents automatic retries after a failed payment.
          </p>

          {/* Order details */}
          {displayOrderId ? (
            <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Failed order</p>
              <dl className="mt-3 space-y-2 text-sm">
                {displayProduct ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Product</dt>
                    <dd className="text-right font-medium text-zinc-100">{displayProduct}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Order ID</dt>
                  <dd className="font-mono text-zinc-100">{shortId(displayOrderId)}</dd>
                </div>
                {displayAmount ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Amount</dt>
                    <dd className="font-mono text-zinc-100">{displayAmount}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Status</dt>
                  <dd className="text-amber-300">{displayStatus}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Timestamp</dt>
                  <dd className="text-zinc-100">{timestamp}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
              Order reference unavailable. Start a fresh checkout.
            </div>
          )}
        </div>

        {/* Stop-rule compliance */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
              <ShieldWarning weight="duotone" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Track 01 compliance — stop-rule active</p>
              <p className="mt-1 text-xs text-zinc-400">
                Every money action is auditable — this failure has been logged in the audit trail.
                The policy engine will not retry a failed payment on the same order. To proceed,
                start a new checkout which creates a new order with a fresh mandate.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/lp/${slug}#pay`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Try again with a new order
          </Link>
          <Link
            href="/operator"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-400"
          >
            View audit in Operator
          </Link>
        </div>
      </div>
    </main>
  );
}
