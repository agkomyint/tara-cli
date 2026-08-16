import { apiRequest } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";

export async function runCanvasLayoutOntology(projectId: string, options: {
  direction?: "left-right" | "top-down";
  rankGap?: number;
  nodeGap?: number;
  dryRun?: boolean;
  json?: boolean;
}) {
  const current = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const result = await apiRequest<CanvasResponse & { persisted: boolean }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/layout`, {
    method: "POST",
    body: JSON.stringify({ baseRevision: current.revision, direction: options.direction ?? "left-right", rankGap: options.rankGap, nodeGap: options.nodeGap, dryRun: options.dryRun ?? false }),
  });
  const entities = result.document.nodes.filter((node) => node.type === "entity").length;
  const relationships = result.document.nodes.filter((node) => node.type === "relationship").length;
  const output = { projectId: result.projectId, direction: options.direction ?? "left-right", entities, relationships, persisted: result.persisted, revision: result.revision };
  if (options.json) process.stdout.write(`${JSON.stringify(output)}\n`);
  else process.stdout.write(`${options.dryRun ? "Previewed" : "Organized"} ${entities} entities and ${relationships} relationships (${output.direction}).\n`);
}
