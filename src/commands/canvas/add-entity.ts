import { apiRequest } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

export async function runCanvasAddEntity(projectId: string, name: string, options: {
  entityType: string;
  attributes?: string;
  externalId?: string;
  status?: string;
  x?: number;
  y?: number;
  color?: string;
  id?: string;
  json?: boolean;
}) {
  const attributes = options.attributes ? JSON.parse(options.attributes) as Record<string, unknown> : {};
  const data = {
    entityType: options.entityType,
    attributes,
    ...(options.externalId ? { externalId: options.externalId } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const result = await apiRequest<{ node: CanvasNode; created: boolean }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
    method: "POST",
    body: JSON.stringify({
      node: { type: "entity", text: name, x: options.x, y: options.y, color: options.color ?? "paper", data },
      idempotencyKey: options.id ?? crypto.randomUUID(),
    }),
  });
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.created ? "Created" : "Found"} ${options.entityType} entity: ${result.node.text} (${result.node.id})\n`);
}
