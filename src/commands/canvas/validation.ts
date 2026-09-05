import { apiRequest } from "../../client.js";

export type CanvasValidationKind = "node" | "node-create" | "node-create-batch" | "node-patch" | "document";

export async function compileCanvasPayload<T>(kind: CanvasValidationKind, value: T): Promise<T> {
  validateLocally(kind, value);
  const result = await apiRequest<{ valid: true; value?: T }>("/api/studio/canvas/validate", { method: "POST", body: JSON.stringify({ kind, value }) });
  if (!result.valid) throw new Error(`Tara contract rejected ${kind}.`);
  return result.value ?? value;
}

export function assertPostcondition(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Postcondition failed: ${message}`); }

function validateLocally(kind: CanvasValidationKind, value: unknown) {
  const issues: string[] = [];
  if (kind === "node-create" || kind === "node" || kind === "node-patch") {
    if (!isRecord(value)) issues.push("payload must be an object");
    else {
      if (kind !== "node-patch" && (typeof value.type !== "string" || !value.type.trim())) issues.push("type must be a non-empty string");
      if ("temporal" in value && value.temporal !== undefined) validateTemporal(value.temporal, issues);
      for (const field of ["x", "y", "width", "height"] as const) if (field in value && value[field] !== undefined && (typeof value[field] !== "number" || !Number.isFinite(value[field]))) issues.push(`${field} must be a finite number`);
    }
  } else if (kind === "node-create-batch") {
    if (!Array.isArray(value)) issues.push("batch must be an array"); else if (value.length > 10_000) issues.push("batch exceeds 10,000 nodes");
  } else if (kind === "document" && (!isRecord(value) || !Array.isArray(value.nodes))) issues.push("document must contain a nodes array");
  if (issues.length) throw new Error(`Local canvas type-check failed:\n- ${issues.join("\n- ")}`);
}

function validateTemporal(value: unknown, issues: string[]) { if (!isRecord(value)) { issues.push("temporal must be an object"); return; } const from = validateDate(value.validFrom, "temporal.validFrom", issues); const to = validateDate(value.validTo, "temporal.validTo", issues); if (from !== null && to !== null && from > to) issues.push("temporal.validTo must be at or after temporal.validFrom"); }
function validateDate(value: unknown, field: string, issues: string[]) { if (value === null || value === undefined) return null; if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) { issues.push(`${field} must be null or an ISO-8601 date/time`); return null; } return Date.parse(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
