import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";

import { apiRequest, TaraAPIError } from "../../client.js";
import { assertUniqueExplicitNodeIds } from "./spec.js";

type NodeIntent = { id?: string; type?: string; [key: string]: unknown };
type Props = { projectId: string; nodes: NodeIntent[]; layout: "grid" | "flow" | "none"; startX: number; startY: number };

function AddBatchApp({ projectId, nodes, layout, startX, startY }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; ids: string[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const operations = nodes.map((node) => ({ op: "create", node: { ...node, type: node.type ?? "note" }, idempotencyKey: node.id ?? crypto.randomUUID() }));
    apiRequest<{ results: Array<{ nodeId: string }> }>(
      `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/transactions`,
      { method: "POST", body: JSON.stringify({ operations, layout: { mode: layout, columns: 3, startX, startY, gapX: 40, gapY: 40 } }) },
    ).then((result) => setState({ status: "done", ids: result.results.map((item) => item.nodeId) }))
      .catch((error) => setState({ status: "error", message: error instanceof TaraAPIError ? error.message : String(error) }));
  }, [layout, nodes, projectId, startX, startY]);

  if (state.status === "loading") return <Text color="yellow">Adding batch transaction...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;
  return <Box flexDirection="column" gap={1}><Text color="green">✓ Added {state.ids.length} nodes atomically!</Text><Text dimColor>Node IDs: {state.ids.slice(0, 3).join(", ")}{state.ids.length > 3 ? "..." : ""}</Text></Box>;
}

export async function runCanvasAddBatch(projectId: string, options: { nodes: string; layout?: string; x?: number; y?: number }) {
  const parsed: unknown = JSON.parse(options.nodes);
  if (!Array.isArray(parsed)) throw new Error("--nodes must be a JSON array.");
  const nodes = parsed.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Each node must be a JSON object.");
    return value as NodeIntent;
  });
  assertUniqueExplicitNodeIds(nodes);
  const layout = options.layout === "flow" || options.layout === "none" ? options.layout : "grid";
  const { waitUntilExit } = render(<AddBatchApp projectId={projectId} nodes={nodes} layout={layout} startX={options.x ?? 100} startY={options.y ?? 100} />);
  await waitUntilExit();
}
