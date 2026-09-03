import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FailedSearchParams = Promise<{ order?: string }>;

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

  return (
    <main className="min-h-dvh bg-zinc-950 px-5 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-amber-500/40 bg-zinc-900/80 p-6 shadow-lg shadow-amber-950/20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <WarningCircle weight="fill" className="size-4" />
          Payment could not be completed
        </div>
        <h1 className="text-2xl font-bold text-zinc-50">Try a new checkout attempt</h1>
        <p className="mt-2 text-sm text-zinc-300">
          This order will not be retried. The policy engine prevents automatic retries after a failed payment.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm">
          <p className="text-zinc-300">Every money action is auditable - this failure has been logged.</p>
          {orderId ? (
            <p className="mt-2 text-zinc-400">
              Order ID: <span className="font-mono text-zinc-100">{orderId}</span>
            </p>
          ) : (
            <p className="mt-2 text-zinc-400">Order reference unavailable. Start a fresh checkout.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
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
