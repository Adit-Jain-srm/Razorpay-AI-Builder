import { describe, expect, it, vi } from "vitest";

import { AppError, TimeoutError, ValidationError } from "@/lib/errors";
import { CircuitBreaker, withRetry, withTimeout } from "@/lib/resilience";

describe("withTimeout", () => {
  it("resolves when fn completes before the deadline", async () => {
    await expect(withTimeout(async () => "done", 1000)).resolves.toBe("done");
  });

  it("rejects with TimeoutError when the deadline passes", async () => {
    vi.useFakeTimers();
    try {
      // A signal-aware operation: it only settles when its signal aborts, which
      // is exactly how fetch-based clients behave under the timeout.
      const neverResolves = (signal: AbortSignal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });

      const promise = withTimeout(neverResolves, 5000, undefined, "test-op");
      const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn, { retries: 3 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("succeeds after N transient failures", async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts += 1;
        if (attempts < 3) throw new TimeoutError("transient");
        return "recovered";
      });

      const promise = withRetry(fn, { retries: 3, baseDelayMs: 50, timeoutMs: 1000 });
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe("recovered");
      expect(fn).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry a non-retriable error", async () => {
    const fn = vi.fn(async () => {
      throw new ValidationError("bad input");
    });
    await expect(withRetry(fn, { retries: 5 })).rejects.toBeInstanceOf(ValidationError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws the last error after exhausting retries", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn(async () => {
        throw new AppError("always fails", { retriable: true });
      });
      const promise = withRetry(fn, { retries: 2, baseDelayMs: 10, timeoutMs: 1000 });
      const assertion = expect(promise).rejects.toBeInstanceOf(AppError);
      await vi.runAllTimersAsync();
      await assertion;
      expect(fn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("CircuitBreaker", () => {
  it("opens after the failure threshold and short-circuits further calls", async () => {
    const breaker = new CircuitBreaker(2, 30_000, "test");
    const failing = vi.fn(async () => {
      throw new AppError("upstream down", { retriable: false });
    });

    await expect(breaker.run(failing, { retries: 0 })).rejects.toThrow();
    await expect(breaker.run(failing, { retries: 0 })).rejects.toThrow();

    // Threshold reached: the breaker is open and short-circuits without calling fn.
    expect(breaker.isOpen).toBe(true);
    await expect(breaker.run(failing, { retries: 0 })).rejects.toMatchObject({ code: "UPSTREAM" });
    expect(failing).toHaveBeenCalledTimes(2);
  });
});
