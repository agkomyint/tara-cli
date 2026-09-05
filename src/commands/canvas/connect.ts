import { apiRequest } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";
import { assertPostcondition, compileCanvasPayload } from "./validation.js";

export async function runCanvasConnect(projectId: string, sourceNodeId: string, targetNodeId: string, options: {
  relationship: string;
  attributes?: string;
  label?: string;
  x?: number;
  y?: number;
  id?: string;
  json?: boolean;
  color?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  arrowStyle?: "arrow" | "dot" | "diamond" | "none";
  animated?: boolean;
  layer?: string;
  from?: string;
  to?: string;
}) {
  const attributes = options.attributes ? JSON.parse(options.attributes) as Record<string, unknown> : {};
  const node = {
    type: "relationship", layerId: options.layer, text: options.label ?? options.relationship.replaceAll("_", " "), x: options.x, y: options.y, color: "paper",
    data: { relationshipType: options.relationship, sourceNodeId, targetNodeId, attributes, ...(options.color ? { edgeColor: options.color } : {}), ...(options.lineStyle ? { lineStyle: options.lineStyle } : {}), ...(options.arrowStyle ? { arrowStyle: options.arrowStyle } : {}), ...(options.animated ? { animated: true } : {}) },
    ...((options.from || options.to) ? { temporal: { validFrom: options.from ? new Date(options.from).toISOString() : null, validTo: options.to ? new Date(options.to).toISOString() : null } } : {}),
  };
  await compileCanvasPayload("node-create", node);
  let result = await apiRequest<{ node: CanvasNode; created: boolean }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
    method: "POST",
    body: JSON.stringify({
      node,
      idempotencyKey: options.id ?? crypto.randomUUID(),
    }),
  });
  if (!result.created) {
    const updated = await apiRequest<{ node: CanvasNode }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(result.node.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        updates: {
          width: 168,
          height: 44,
          ...(options.x !== undefined ? { x: options.x } : {}),
          ...(options.y !== undefined ? { y: options.y } : {}),
        },
        dataPatch: {
          ...(options.color ? { edgeColor: options.color } : {}),
          ...(options.lineStyle ? { lineStyle: options.lineStyle } : {}),
          ...(options.arrowStyle ? { arrowStyle: options.arrowStyle } : {}),
          ...(options.animated ? { animated: true } : {}),
        },
      }),
    });
    result = { node: updated.node, created: false };
  }
  assertPostcondition(result.node.type === "relationship", "created relationship has the wrong node type");
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.created ? "Created" : "Found"} relationship: ${sourceNodeId} -[${options.relationship}]-> ${targetNodeId} (${result.node.id})\n`);
}
