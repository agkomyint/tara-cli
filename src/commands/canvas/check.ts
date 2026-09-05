import { apiRequest } from "../../client.js";
import { compileCanvasPayload } from "./validation.js";

export async function runCanvasCheck(projectId: string, options: { json?: boolean }) {
  const canvas = await apiRequest<{ projectId: string; revision: string | null; document: unknown }>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  await compileCanvasPayload("document", canvas.document);
  const output = { valid: true, projectId: canvas.projectId, revision: canvas.revision };
  if (options.json) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`); else process.stdout.write(`✓ Canvas ${canvas.projectId} type-checks against the live Tara contract at revision ${canvas.revision ?? "new"}.\n`);
}
