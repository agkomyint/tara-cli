import { apiRequest } from "../../client.js";
import type { CanvasNode, CanvasResponse } from "../../contracts.js";

export async function runCanvasRelationships(projectId: string, options: { json?: boolean }) {
  const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const relationships = canvas.document.nodes.filter((node) => node.type === "relationship").map(toRelationshipSummary);
  if (options.json) process.stdout.write(`${JSON.stringify({ projectId: canvas.projectId, relationships })}\n`);
  else if (relationships.length === 0) process.stdout.write("No relationships found.\n");
  else for (const relationship of relationships) process.stdout.write(`${relationship.id}: ${relationship.sourceNodeId} -[${relationship.relationshipType}]-> ${relationship.targetNodeId}\n`);
}

export async function runCanvasUpdateRelationship(projectId: string, relationshipId: string, options: {
  relationship?: string;
  label?: string;
  source?: string;
  target?: string;
  attributes?: string;
  color?: string;
  lineStyle?: string;
  arrowStyle?: string;
  flow?: string;
  x?: number;
  y?: number;
  json?: boolean;
}) {
  validateOption(options.lineStyle, ["solid", "dashed", "dotted"], "line style");
  validateOption(options.arrowStyle, ["arrow", "dot", "diamond", "none"], "arrow style");
  validateOption(options.flow, ["on", "off"], "flow");
  if (options.color && !/^#[0-9a-f]{6}$/i.test(options.color)) throw new Error("Edge color must be a six-digit hex value, for example #3457D5.");
  const dataPatch = {
    ...(options.relationship ? { relationshipType: options.relationship } : {}),
    ...(options.source ? { sourceNodeId: options.source } : {}),
    ...(options.target ? { targetNodeId: options.target } : {}),
    ...(options.attributes ? { attributes: JSON.parse(options.attributes) as Record<string, unknown> } : {}),
    ...(options.color ? { edgeColor: options.color } : {}),
    ...(options.lineStyle ? { lineStyle: options.lineStyle } : {}),
    ...(options.arrowStyle ? { arrowStyle: options.arrowStyle } : {}),
    ...(options.flow ? { animated: options.flow === "on" } : {}),
  };
  const updates = {
    ...(options.label ? { text: options.label } : {}),
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
  };
  const result = await apiRequest<{ node: CanvasNode }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(relationshipId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updates, dataPatch }),
  });
  if (options.json) process.stdout.write(`${JSON.stringify(toRelationshipSummary(result.node))}\n`);
  else process.stdout.write(`Updated relationship ${result.node.id}.\n`);
}

function toRelationshipSummary(node: CanvasNode) {
  return {
    id: node.id,
    label: node.text,
    relationshipType: typeof node.data?.relationshipType === "string" ? node.data.relationshipType : "related_to",
    sourceNodeId: typeof node.data?.sourceNodeId === "string" ? node.data.sourceNodeId : null,
    targetNodeId: typeof node.data?.targetNodeId === "string" ? node.data.targetNodeId : null,
    x: node.x,
    y: node.y,
    style: {
      color: node.data?.edgeColor ?? null,
      line: node.data?.lineStyle ?? "solid",
      arrow: node.data?.arrowStyle ?? "arrow",
      animated: node.data?.animated === true,
    },
    attributes: node.data?.attributes ?? {},
  };
}

function validateOption(value: string | undefined, allowed: string[], label: string) {
  if (value && !allowed.includes(value)) throw new Error(`Invalid ${label} "${value}". Use: ${allowed.join(", ")}.`);
}
