import { apiRequest } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";

export async function runCanvasWatch(projectId: string, options: { json?: boolean; interval?: number }) {
  const interval = Math.max(250, options.interval ?? 1_000);
  let revision: string | null | undefined;
  let stopped = false;
  const stop = () => { stopped = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    while (!stopped) {
      const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
      if (canvas.revision !== revision) {
        revision = canvas.revision;
        const event = { event: "canvas.changed", projectId: canvas.projectId, revision, nodeCount: canvas.document.nodes.length, canvas };
        if (options.json) process.stdout.write(`${JSON.stringify(event)}\n`);
        else process.stdout.write(`Canvas changed · revision ${revision ?? "new"} · ${canvas.document.nodes.length} nodes\n`);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
