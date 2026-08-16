import React from "react";
import { render, Text, Box } from "ink";

import { apiRequest } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";
import { readCanvasSpec } from "./spec.js";

type TransactionResponse = CanvasResponse & { persisted: boolean; results: Array<{ op: string; nodeId: string }> };

export async function applyCanvasSpec(projectId: string, fileOrSpec: string, dryRun: boolean) {
  const spec = readCanvasSpec(fileOrSpec);
  const current = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  return apiRequest<TransactionResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/transactions`, {
    method: "POST",
    body: JSON.stringify({
      baseRevision: current.revision,
      operations: [{ op: "replace", nodes: spec.nodes }],
      camera: spec.camera,
      dryRun,
    }),
  });
}

export async function runCanvasApply(projectId: string, fileOrSpec: string, options: { dryRun?: boolean; json?: boolean } = {}) {
  const result = await applyCanvasSpec(projectId, fileOrSpec, options.dryRun ?? false);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (!process.stdout.isTTY) {
    process.stdout.write(`✓ ${options.dryRun ? "Validated canvas spec" : "Applied canvas spec"} (${result.document.nodes.length} nodes)\n`);
    process.stdout.write(`${options.dryRun ? "Dry run: no changes saved." : `Revision: ${result.revision}`}\n`);
    return;
  }
  const { waitUntilExit } = render(
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ {options.dryRun ? "Validated canvas spec" : "Applied canvas spec"} ({result.document.nodes.length} nodes)</Text>
      <Text dimColor>{options.dryRun ? "Dry run: no changes saved." : `Revision: ${result.revision}`}</Text>
    </Box>,
  );
  await waitUntilExit();
}
