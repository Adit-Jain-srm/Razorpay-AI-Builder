import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThanksSearchParams = Promise<{
  order?: string;
  rzp?: string;
  amount?: string;
  demo?: string;
}>;

function formatInrFromPaise(rawAmount: string | undefined): string | null {
  if (!rawAmount) return null;
  const parsed = Number(rawAmount);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(parsed / 100);
}

function shortOrderId(order: string): string {
  return order.length > 14 ? `${order.slice(0, 14)}...` : order;
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
  const razorpayOrderId = typeof sp.rzp === "string" && sp.rzp.trim().length > 0 ? sp.rzp.trim() : null;
  const amount = formatInrFromPaise(sp.amount);
  const isDemo = sp.demo === "true";
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return (
    <main className="min-h-dvh bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-emerald-500/40 bg-zinc-900/80 p-6 shadow-lg shadow-emerald-950/30">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          <CheckCircle weight="fill" className="size-4" />
          Payment verified in Razorpay Test Mode
        </div>
        <h1 className="text-2xl font-bold text-zinc-50">Payment received</h1>
        <p className="mt-2 text-sm text-zinc-300">
          {isDemo
            ? "Demo checkout completed. No real money was charged."
            : "Your order has been recorded. You can now continue with onboarding."}
        </p>

        {orderId ? (
          <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Order receipt</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-400">Order ID</dt>
                <dd className="font-mono text-zinc-100">{shortOrderId(orderId)}</dd>
              </div>
              {razorpayOrderId ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Razorpay Order ID</dt>
                  <dd className="font-mono text-zinc-100">{razorpayOrderId}</dd>
                </div>
              ) : null}
              {amount ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-400">Amount</dt>
                  <dd className="font-semibold text-emerald-300">{amount}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-400">Status</dt>
                <dd className="text-emerald-300">Captured (test mode)</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-400">Timestamp</dt>
                <dd className="text-zinc-100">{timestamp}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
            Payment confirmation was received, but the order reference is unavailable.
          </div>
        )}

        <p className="mt-5 text-xs text-zinc-400">Powered by Razorpay Test Mode - no real money charged.</p>

        <div className="mt-6 flex flex-wrap gap-3">
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
