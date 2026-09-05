import { apiRequest } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";
import { assertPostcondition, compileCanvasPayload } from "./validation.js";

export async function runCanvasTime(projectId: string, options: { at?: string; json?: boolean }) {
  const at = parseTime(options.at ?? new Date().toISOString());
  const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const validEntityIds = new Set(canvas.document.nodes.filter((node) => node.type !== "relationship" && isValidAt(node as TemporalNode, at)).map((node) => node.id));
  const nodes = canvas.document.nodes.filter((node) => {
    const candidate = node as TemporalNode;
    if (!isValidAt(candidate, at)) return false;
    if (candidate.type !== "relationship") return true;
    return typeof candidate.data?.sourceNodeId === "string" && typeof candidate.data?.targetNodeId === "string" && validEntityIds.has(candidate.data.sourceNodeId) && validEntityIds.has(candidate.data.targetNodeId);
  });
  const output = { projectId: canvas.projectId, at: new Date(at).toISOString(), count: nodes.length, nodes };
  if (options.json) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  else { process.stdout.write(`Canvas at ${output.at}: ${nodes.length} valid nodes\n`); for (const node of nodes) process.stdout.write(`${node.id}\t${node.type}\t${node.text}\n`); }
}

export async function runCanvasSetTime(projectId: string, nodeId: string, options: { from?: string; to?: string; always?: boolean; json?: boolean }) {
  const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const temporal = options.always ? undefined : { validFrom: options.from ? new Date(parseTime(options.from)).toISOString() : null, validTo: options.to ? new Date(parseTime(options.to)).toISOString() : null };
  await compileCanvasPayload("node-patch", { temporal });
  const result = await apiRequest<{ node: TemporalNode; revision: string | null }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}`, { method: "PATCH", body: JSON.stringify({ baseRevision: canvas.revision, updates: { temporal } }) });
  assertPostcondition(options.always ? result.node.temporal === undefined : result.node.temporal?.validFrom === temporal?.validFrom && result.node.temporal?.validTo === temporal?.validTo, "saved temporal interval differs from the requested interval");
  if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${temporal ? `Set ${nodeId} validity to ${temporal.validFrom ?? "-∞"} → ${temporal.validTo ?? "+∞"}` : `Made ${nodeId} timeless`}\n`);
}

type TemporalNode = { id: string; type: string; text: string; data?: Record<string, unknown>; temporal?: { validFrom: string | null; validTo: string | null } };
function isValidAt(node: TemporalNode, at: number) { const from = node.temporal?.validFrom ? Date.parse(node.temporal.validFrom) : Number.NEGATIVE_INFINITY; const to = node.temporal?.validTo ? Date.parse(node.temporal.validTo) : Number.POSITIVE_INFINITY; return at >= from && at <= to; }
function parseTime(value: string) { const parsed = Date.parse(value); if (!Number.isFinite(parsed)) throw new Error(`Invalid date/time: ${value}`); return parsed; }
