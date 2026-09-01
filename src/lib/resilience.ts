import { AppError, TimeoutError, isAppError } from "@/lib/errors";

/**
 * Resilience primitives for every external call: bounded timeouts, exponential
 * backoff with jitter, and a lightweight circuit breaker. Used by the Azure and
 * Bright Data clients and available to feature teams for their own integrations.
 */

export interface RetryOptions {
  /** Number of *retries* after the first attempt. Default 2 (3 attempts total). */
  retries?: number;
  /** Base backoff delay in ms (grows exponentially). Default 400ms. */
  baseDelayMs?: number;
  /** Maximum backoff delay in ms. Default 8000ms. */
  maxDelayMs?: number;
  /** Per-attempt timeout in ms. Default 30000ms. */
  timeoutMs?: number;
  /** External abort signal to cancel the whole operation. */
  signal?: AbortSignal;
  /** Decide whether a given error should trigger a retry. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Observe each retry (for structured logging). */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Label used in timeout messages. */
  label?: string;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AppError("Operation aborted", { code: "UNKNOWN", retriable: false }));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new AppError("Operation aborted", { code: "UNKNOWN", retriable: false }));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Runs `fn` with an abort-based timeout. The provided signal is aborted when the
 * deadline passes or when `parentSignal` aborts, whichever comes first.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  label = "operation",
): Promise<T> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort(parentSignal.reason);
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(new TimeoutError(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (error) {
    // Surface our typed TimeoutError when the abort was caused by the deadline.
    if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) {
      throw controller.signal.reason;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

/** Default retry predicate: retry typed-retriable errors and transient network faults. */
export function defaultShouldRetry(error: unknown): boolean {
  if (isAppError(error)) return error.retriable;
  // Undici / fetch network errors are typically transient.
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    return name.includes("timeout") || name.includes("aborterror") || name.includes("fetcherror") || name === "typeerror";
  }
  return false;
}

/**
 * Executes `fn` with per-attempt timeout + exponential backoff and jitter.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(fn: (signal: AbortSignal) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 400,
    maxDelayMs = 8000,
    timeoutMs = 30000,
    signal,
    shouldRetry = defaultShouldRetry,
    onRetry,
    label = "operation",
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn, timeoutMs, signal, label);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || signal?.aborted || !shouldRetry(error, attempt)) {
        throw error;
      }
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.25;
      const delay = Math.round(backoff + jitter);
      onRetry?.(error, attempt + 1, delay);
      await sleep(delay, signal);
    }
  }

  throw lastError;
}

/**
 * Minimal circuit breaker. Opens after `failureThreshold` consecutive failures
 * and short-circuits subsequent calls until `cooldownMs` elapses. Keeps a slow
 * upstream from stalling the agent loop or a demo.
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 5,
    private readonly cooldownMs = 30000,
    private readonly label = "circuit",
  ) {}

  get isOpen(): boolean {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt >= this.cooldownMs) {
      // Half-open: allow a trial call.
      this.openedAt = null;
      this.failures = 0;
      return false;
    }
    return true;
  }

  async run<T>(fn: (signal: AbortSignal) => Promise<T>, options?: RetryOptions): Promise<T> {
    if (this.isOpen) {
      throw new AppError(`${this.label} is open; upstream temporarily unavailable`, {
        code: "UPSTREAM",
        retriable: true,
      });
    }
    try {
      const result = await withRetry(fn, options);
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) this.openedAt = Date.now();
      throw error;
    }
  }
}
