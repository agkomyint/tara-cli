import { apiRequest } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";
import { assertPostcondition, compileCanvasPayload } from "./validation.js";

export async function runCanvasAddEntity(projectId: string, name: string, options: {
  entityType: string;
  attributes?: string;
  externalId?: string;
  status?: string;
  x?: number;
  y?: number;
  color?: string;
  id?: string;
  layer?: string;
  from?: string;
  to?: string;
  json?: boolean;
}) {
  const attributes = options.attributes ? JSON.parse(options.attributes) as Record<string, unknown> : {};
  const data = {
    entityType: options.entityType,
    attributes,
    ...(options.externalId ? { externalId: options.externalId } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const node = { type: "entity", text: name, layerId: options.layer, x: options.x, y: options.y, color: options.color ?? "paper", data, ...((options.from || options.to) ? { temporal: { validFrom: options.from ? new Date(options.from).toISOString() : null, validTo: options.to ? new Date(options.to).toISOString() : null } } : {}) };
  await compileCanvasPayload("node-create", node);
  const result = await apiRequest<{ node: CanvasNode; created: boolean }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
    method: "POST",
    body: JSON.stringify({
      node,
      idempotencyKey: options.id ?? crypto.randomUUID(),
    }),
  });
  assertPostcondition(result.node.type === "entity" && result.node.text === name, "created entity does not match the requested type and name");
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.created ? "Created" : "Found"} ${options.entityType} entity: ${result.node.text} (${result.node.id})\n`);
}
