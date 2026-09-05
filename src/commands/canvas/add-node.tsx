import React, { useEffect, useState } from "react";
import { readFileSync } from "fs";
import { render, Text, Box } from "ink";

import { apiRequest, TaraAPIError } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

type Props = {
  projectId: string;
  node: Record<string, unknown>;
  idempotencyKey: string;
};

function AddNodeApp({ projectId, node, idempotencyKey }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; node: CanvasNode; created: boolean }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ node: CanvasNode; created: boolean }>(
      `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`,
      { method: "POST", body: JSON.stringify({ node, idempotencyKey }) },
    ).then((result) => setState({ status: "done", node: result.node, created: result.created }))
      .catch((error) => setState({ status: "error", message: error instanceof TaraAPIError ? error.message : String(error) }));
  }, [idempotencyKey, node, projectId]);

  if (state.status === "loading") return <Text color="yellow">Adding node...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;
  return <Box flexDirection="column"><Text color="green">✓ Node {state.created ? "added" : "already exists"}</Text><Text dimColor>Node ID: {state.node.id}</Text></Box>;
}

export async function runCanvasAddNode(
  projectId: string,
  options: { type?: string; text: string; layer?: string; x?: number; y?: number; color?: string; sourceUrl?: string; data?: string; dataFile?: string; dataStdin?: boolean; idempotencyKey?: string },
) {
  const dataJson = options.dataStdin ? readFileSync(0, "utf8") : options.dataFile ? readFileSync(options.dataFile, "utf8") : options.data;
  const node = {
    type: options.type ?? "note",
    text: options.text,
    ...(options.layer ? { layerId: options.layer } : {}),
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
    ...(options.color ? { color: options.color } : {}),
    ...(options.sourceUrl ? { sourceUrl: options.sourceUrl } : {}),
    ...(dataJson ? { data: JSON.parse(dataJson) as unknown } : {}),
  };
  const { waitUntilExit } = render(<AddNodeApp projectId={projectId} node={node} idempotencyKey={options.idempotencyKey ?? crypto.randomUUID()} />);
  await waitUntilExit();
}
