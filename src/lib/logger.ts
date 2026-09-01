import { isAppError } from "@/lib/errors";

/**
 * Tiny structured logger. Agent runs and tool calls must be traceable, so log
 * lines are JSON with a consistent shape. Swap the sink for a real provider
 * (Axiom, Logflare, etc.) in the observability phase without touching callers.
 */

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: Level, message: string, fields?: LogFields): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  const serialized = safeStringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, error?: unknown, fields?: LogFields) =>
    emit("error", message, {
      ...fields,
      error: isAppError(error) ? error.toJSON() : error instanceof Error ? { name: error.name, message: error.message } : error,
    }),
};
