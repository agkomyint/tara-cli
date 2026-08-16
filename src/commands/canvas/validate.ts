import { apiRequest } from "../../client.js";
import type { NodeRegistryResponse } from "../../contracts.js";
import { readCanvasSpec } from "./spec.js";

export async function runCanvasValidate(fileOrSpec: string, options: { json?: boolean }) {
  const spec = readCanvasSpec(fileOrSpec);
  const registry = await apiRequest<NodeRegistryResponse>("/api/studio/canvas/node-types");
  const result = await apiRequest<{ valid: true; count: number }>(registry.api.validate, {
    method: "POST",
    body: JSON.stringify({ kind: "node-create-batch", value: spec.nodes }),
  });
  const output = { valid: true, contractVersion: registry.contractVersion, nodeCount: result.count };
  if (options.json) process.stdout.write(`${JSON.stringify(output)}\n`);
  else process.stdout.write(`✓ Canvas spec is valid against Tara contract v${registry.contractVersion} (${result.count} nodes).\n`);
}
