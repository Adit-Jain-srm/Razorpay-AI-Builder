/**
 * Typed error hierarchy shared across every external boundary (Azure OpenAI,
 * Bright Data, Supabase, the agent runtime, the research engine). Tool/service
 * code should fail with one of these so callers - and the Operator agent - can
 * branch on `code` / `retriable` instead of string-matching messages.
 */

export type ServiceName =
  | "azure"
  | "brightdata"
  | "supabase"
  | "agent"
  | "research"
  | "platform";

export type AppErrorCode =
  | "CONFIG_MISSING"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UPSTREAM"
  | "VALIDATION"
  | "NOT_IMPLEMENTED"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export interface AppErrorOptions {
  code?: AppErrorCode;
  service?: ServiceName;
  status?: number;
  retriable?: boolean;
  cause?: unknown;
  /** Structured context that is safe to log (never include secrets here). */
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly service?: ServiceName;
  readonly status?: number;
  readonly retriable: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code ?? "UNKNOWN";
    this.service = options.service;
    this.status = options.status;
    this.retriable = options.retriable ?? false;
    this.context = options.context;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Serializable, secret-free representation for structured logs / API bodies. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      service: this.service,
      status: this.status,
      retriable: this.retriable,
      context: this.context,
    };
  }
}

/** A required credential / configuration value is missing. Never retriable. */
export class ConfigurationError extends AppError {
  constructor(service: ServiceName, message: string, context?: Record<string, unknown>) {
    super(message, { code: "CONFIG_MISSING", service, retriable: false, context });
  }
}

/** An operation exceeded its time budget. Retriable. */
export class TimeoutError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code" | "retriable"> = {}) {
    super(message, { ...options, code: "TIMEOUT", retriable: true });
  }
}

/** Upstream rate limit (HTTP 429 or provider quota). Retriable. */
export class RateLimitError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code" | "retriable"> = {}) {
    super(message, { ...options, code: "RATE_LIMITED", retriable: true, status: options.status ?? 429 });
  }
}

/** A generic upstream failure. Retriability inferred from the HTTP status. */
export class UpstreamError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code"> = {}) {
    super(message, {
      ...options,
      code: "UPSTREAM",
      retriable: options.retriable ?? isRetriableStatus(options.status),
    });
  }
}

/** Input/output failed schema validation. Not retriable (the input is wrong). */
export class ValidationError extends AppError {
  constructor(message: string, options: Omit<AppErrorOptions, "code" | "retriable"> = {}) {
    super(message, { ...options, code: "VALIDATION", retriable: false });
  }
}

/** A stubbed capability that a later phase must implement. */
export class NotImplementedError extends AppError {
  constructor(what: string, service: ServiceName = "platform") {
    super(`Not implemented: ${what}`, { code: "NOT_IMPLEMENTED", service, retriable: false });
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** 429 and 5xx are considered transient and therefore retriable. */
export function isRetriableStatus(status?: number): boolean {
  if (status === undefined) return false;
  return status === 429 || (status >= 500 && status <= 599);
}

/** Best-effort message extraction from an unknown thrown value. */
export function toErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
