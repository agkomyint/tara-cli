import { apiRequest } from "../../client.js";
import type { CanvasNode, CanvasResponse } from "../../contracts.js";
import { applyCanvasSpec } from "./apply.js";

function stableNode(node: CanvasNode) {
  return JSON.stringify(sortValue(node));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortValue(entry)]));
}

export async function runCanvasDiff(projectId: string, fileOrSpec: string, options: { json?: boolean }) {
  const current = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const preview = await applyCanvasSpec(projectId, fileOrSpec, true);
  const currentById = new Map(current.document.nodes.map((node) => [node.id, node]));
  const desiredById = new Map(preview.document.nodes.map((node) => [node.id, node]));
  const added = preview.document.nodes.filter((node) => !currentById.has(node.id)).map((node) => node.id);
  const removed = current.document.nodes.filter((node) => !desiredById.has(node.id)).map((node) => node.id);
  const changed = preview.document.nodes.filter((node) => {
    const existing = currentById.get(node.id);
    return existing && stableNode(existing) !== stableNode(node);
  }).map((node) => node.id);
  const output = { projectId: current.projectId, baseRevision: current.revision, added, removed, changed, unchanged: added.length === 0 && removed.length === 0 && changed.length === 0 };
  if (options.json) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  else process.stdout.write(`Canvas diff: +${added.length} -${removed.length} ~${changed.length}${output.unchanged ? " (no changes)" : ""}\n`);
}
