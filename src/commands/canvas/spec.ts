import { existsSync, readFileSync } from "fs";

import type { CanvasCamera } from "../../contracts.js";

export type CanvasNodeIntent = { id?: string; type: string; [key: string]: unknown };
export type CanvasSpec = { nodes: CanvasNodeIntent[]; camera?: CanvasCamera };

/** Reject explicit duplicate IDs before any canvas request is sent. */
export function assertUniqueExplicitNodeIds(nodes: Array<{ id?: unknown }>): void {
  const seen = new Map<string, number>();
  nodes.forEach((node, index) => {
    if (typeof node.id !== "string" || !node.id.trim()) return;
    const previous = seen.get(node.id);
    if (previous !== undefined) {
      throw new Error(`Duplicate node id "${node.id}" at nodes ${previous} and ${index}. Every explicit node id must be unique.`);
    }
    seen.set(node.id, index);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readCanvasSpec(source: string): CanvasSpec {
  const json = source === "-" ? readFileSync(0, "utf8") : existsSync(source) ? readFileSync(source, "utf8") : source;
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error("Canvas spec must be a JSON object.");
  const documentValue = isRecord(parsed.document) ? parsed.document : null;
  const nodesValue = documentValue?.nodes ?? parsed.nodes;
  if (!Array.isArray(nodesValue)) throw new Error('Canvas spec must contain a "nodes" array or "document.nodes" array.');
  const nodes = nodesValue.map((value, index) => {
    if (!isRecord(value)) throw new Error(`Node ${index} must be a JSON object.`);
    return { ...value, type: typeof value.type === "string" ? value.type : "note" } as CanvasNodeIntent;
  });
  assertUniqueExplicitNodeIds(nodes);
  const cameraValue = parsed.camera;
  const camera = isRecord(cameraValue)
    && typeof cameraValue.x === "number"
    && typeof cameraValue.y === "number"
    && typeof cameraValue.zoom === "number"
    ? { x: cameraValue.x, y: cameraValue.y, zoom: cameraValue.zoom }
    : undefined;
  return { nodes, camera };
}
