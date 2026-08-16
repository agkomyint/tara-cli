import { apiRequest } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

export async function runCanvasGetNode(projectId: string, nodeId: string, options: { json?: boolean }) {
  const result = await apiRequest<{ projectId: string; node: CanvasNode; revision: string | null }>(
    `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}`,
  );
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.node.id}: ${result.node.type} · ${result.node.text}\n`);
}
