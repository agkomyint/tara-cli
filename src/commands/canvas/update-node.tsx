import React, { useEffect, useState } from "react";
import { readFileSync } from "fs";
import { render, Text, Box } from "ink";

import { apiRequest, TaraAPIError } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

type Props = { projectId: string; nodeId: string; updates: Record<string, unknown>; dataPatch: Record<string, unknown>; dataRemove: string[]; json: boolean };

function UpdateNodeApp({ projectId, nodeId, updates, dataPatch, dataRemove, json }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; node: CanvasNode }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ node: CanvasNode }>(
      `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}`,
      { method: "PATCH", body: JSON.stringify({ updates, dataPatch: Object.keys(dataPatch).length ? dataPatch : undefined, dataRemove: dataRemove.length ? dataRemove : undefined }) },
    ).then((result) => setState({ status: "done", node: result.node }))
      .catch((error) => setState({ status: "error", message: error instanceof TaraAPIError ? error.message : String(error) }));
  }, [dataPatch, nodeId, projectId, updates]);

  if (state.status === "loading") return <Text color="yellow">Updating node on canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;
  if (json) return <Text>{JSON.stringify({ node: state.node })}</Text>;
  return <Box flexDirection="column" gap={1}><Text color="green">✓ Node {state.node.id} updated!</Text><Text dimColor>Position: ({state.node.x}, {state.node.y}) Size: {state.node.width}×{state.node.height}</Text></Box>;
}

export async function runCanvasUpdateNode(
  projectId: string,
  nodeId: string,
  options: { text?: string; type?: string; x?: number; y?: number; width?: number; height?: number; color?: string; gradient?: string; region?: string; locationKey?: string; valueKey?: string; featureKey?: string; sourceUrl?: string; sourceDatasetId?: string; data?: string; dataFile?: string; dataStdin?: boolean; entityType?: string; attributes?: string; externalId?: string; status?: string; removeData?: string[]; json?: boolean },
) {
  const dataJson = options.dataStdin ? readFileSync(0, "utf8") : options.dataFile ? readFileSync(options.dataFile, "utf8") : options.data;
  const updates = {
    ...(options.text !== undefined ? { text: options.text } : {}),
    ...(options.type !== undefined ? { type: options.type } : {}),
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
    ...(options.width !== undefined ? { width: options.width } : {}),
    ...(options.height !== undefined ? { height: options.height } : {}),
    ...(options.color !== undefined ? { color: options.color } : {}),
    ...(options.sourceUrl !== undefined ? { sourceUrl: options.sourceUrl } : {}),
  };
  const dataPatch = {
    ...(options.gradient ? { gradient: options.gradient.includes(",") ? options.gradient.split(",").map((color) => color.trim()) : null } : {}),
    ...(options.region ? { region: options.region === "auto" ? null : options.region } : {}),
    ...(options.locationKey ? { locationKey: options.locationKey } : {}),
    ...(options.valueKey ? { valueKey: options.valueKey } : {}),
    ...(options.featureKey ? { featureKey: options.featureKey } : {}),
    ...(options.sourceDatasetId ? { sourceDatasetId: options.sourceDatasetId } : {}),
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.attributes ? { attributes: JSON.parse(options.attributes) as Record<string, unknown> } : {}),
    ...(options.externalId ? { externalId: options.externalId } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(dataJson ? { rows: JSON.parse(dataJson) as unknown } : {}),
  };
  const { waitUntilExit } = render(<UpdateNodeApp projectId={projectId} nodeId={nodeId} updates={updates} dataPatch={dataPatch} dataRemove={options.removeData ?? []} json={options.json ?? false} />);
  await waitUntilExit();
}
