/**
 * Client-safe Performance Intelligence surface. Only PURE modules are re-exported
 * here (types, math, formatters, aggregation, anomaly detection, recommendations)
 * so Client Components - including the Recharts panels - can import them without
 * pulling Azure/Supabase into the browser bundle.
 *
 * The AI daily brief (`./brief`) imports the Azure client and is SERVER ONLY, so
 * it is intentionally NOT re-exported here; import it directly from server code.
 */

export * from "./types";
export * from "./math";
export * from "./format";
export * from "./aggregate";
export * from "./anomalies";
export * from "./recommendations";
