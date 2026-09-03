import Link from "next/link";
import { CheckCircle, Envelope } from "@phosphor-icons/react/dist/ssr";

import { getOrderById } from "@/lib/payments/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThanksSearchParams = Promise<{
  order?: string;
  rzp?: string;
  amount?: string;
  demo?: string;
}>;

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

export default async function LandingCheckoutThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: ThanksSearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const orderId = typeof sp.order === "string" && sp.order.trim().length > 0 ? sp.order.trim() : null;
  const isDemo = sp.demo === "true";

  // Server-side order lookup — real persisted data
  const order = orderId ? getOrderById(orderId) : undefined;

  // Fallback values from query params if order not found (serverless cold start, etc.)
  const fallbackRzpId = typeof sp.rzp === "string" && sp.rzp.trim().length > 0 ? sp.rzp.trim() : null;
  const fallbackAmountRaw = typeof sp.amount === "string" ? Number(sp.amount) : undefined;
  const fallbackAmount = fallbackAmountRaw && Number.isFinite(fallbackAmountRaw) && fallbackAmountRaw > 0
    ? fallbackAmountRaw
    : undefined;

  // Resolved display values (prefer persisted → fallback → null)
  const displayOrderId = order?.orderId ?? orderId;
  const displayRzpId = order?.razorpayOrderId ?? fallbackRzpId;
  const displayAmount = order ? formatInrFromPaise(order.amountPaise) : fallbackAmount ? formatInrFromPaise(fallbackAmount) : null;
  const displayProduct = order?.productTitle ?? order?.sku ?? null;
  const displayStatus = order?.status === "paid" ? "Captured" : order?.status === "attempted" ? "Verifying" : order?.status ?? "Captured";
  const displayMode = order?.mode ?? (isDemo ? "demo" : "live");
  const displayReceipt = order?.receipt ?? null;
  const displayPaymentId = order?.razorpayPaymentId ?? null;
  const displayItems = order?.items ?? [];
  const timestamp = order?.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return (
    <main className="min-h-dvh bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-xl space-y-5">
        {/* Success card */}
        <div className="rounded-2xl border border-emerald-500/40 bg-zinc-900/80 p-6 shadow-lg shadow-emerald-950/30">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <CheckCircle weight="fill" className="size-4" />
            Payment verified{displayMode === "demo" ? " — Demo Mode" : " in Razorpay Test Mode"}
          </div>
          <h1 className="text-2xl font-bold text-zinc-50">Payment received</h1>
          <p className="mt-2 text-sm text-zinc-300">
            {displayMode === "demo"
              ? "Demo checkout completed. No real money was charged."
              : "Your order has been recorded. You can now continue with onboarding."}
          </p>

          {/* Order receipt */}
          {displayOrderId ? (
            <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Order receipt</p>
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
                {displayRzpId ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Razorpay Order</dt>
                    <dd className="font-mono text-zinc-100">{displayRzpId}</dd>
                  </div>
                ) : null}
                {displayPaymentId ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Payment ID</dt>
                    <dd className="font-mono text-zinc-100">{displayPaymentId}</dd>
                  </div>
                ) : null}
                {displayReceipt ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Receipt</dt>
                    <dd className="font-mono text-zinc-100">{displayReceipt}</dd>
                  </div>
                ) : null}
                {displayAmount ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">Amount</dt>
                    <dd className="font-semibold text-emerald-300">{displayAmount}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Status</dt>
                  <dd className="text-emerald-300">{displayStatus} (test mode)</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Timestamp</dt>
                  <dd className="text-zinc-100">{timestamp}</dd>
                </div>
              </dl>

              {/* Line items */}
              {displayItems.length > 1 ? (
                <div className="mt-4 border-t border-zinc-700 pt-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Line items</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {displayItems.map((item, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="text-zinc-300">
                          {item.sku}
                          {item.role !== "primary" ? (
                            <span className="ml-1.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                              {item.role}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono text-zinc-100">{formatInrFromPaise(item.amountPaise)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
              Payment confirmation was received, but the order reference is unavailable.
            </div>
          )}

          <p className="mt-5 text-xs text-zinc-400">Powered by Razorpay Test Mode — no real money charged.</p>
        </div>

        {/* Receipt email simulation */}
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Envelope weight="duotone" className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">Confirmation email sent</p>
              <p className="text-xs text-zinc-400">
                A receipt has been sent to <span className="font-mono text-zinc-300">test@mediaos.demo</span>
              </p>
            </div>
          </div>
          {displayOrderId && displayAmount ? (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-700 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
              <p className="font-semibold text-zinc-300">Receipt preview</p>
              <p className="mt-1">Order: {shortId(displayOrderId)}</p>
              {displayProduct ? <p>Product: {displayProduct}</p> : null}
              <p>Amount: {displayAmount}</p>
              <p>Status: {displayStatus}</p>
              <p className="mt-2 italic">This is a test-mode simulation. No actual email was sent.</p>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/operator"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-400"
          >
            View in Operator
          </Link>
          <Link
            href={`/lp/${slug}`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Back to page
          </Link>
        </div>
      </div>
    </main>
  );
}
