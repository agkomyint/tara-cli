import React, { useEffect, useState } from "react";
import { render, Text } from "ink";

import { apiRequest, TaraAPIError } from "../../client.js";

function RemoveNodeApp({ projectId, nodeId, cascadeRelationships, json }: { projectId: string; nodeId: string; cascadeRelationships: boolean; json: boolean }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; removedNodeId: string; removedNodeIds: string[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ removedNodeId: string; removedNodeIds: string[] }>(
      `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}`,
      { method: "DELETE", body: JSON.stringify({ cascadeRelationships }) },
    ).then((result) => setState({ status: "done", removedNodeId: result.removedNodeId, removedNodeIds: result.removedNodeIds }))
      .catch((error) => setState({ status: "error", message: error instanceof TaraAPIError ? error.message : String(error) }));
  }, [cascadeRelationships, nodeId, projectId]);

  if (state.status === "loading") return <Text color="yellow">Removing node from canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;
  if (json) return <Text>{JSON.stringify({ removedNodeId: state.removedNodeId, removedNodeIds: state.removedNodeIds })}</Text>;
  const relatedCount = Math.max(0, state.removedNodeIds.length - 1);
  return <Text color="green">✓ Node {state.removedNodeId} removed{relatedCount ? ` with ${relatedCount} connected relationship${relatedCount === 1 ? "" : "s"}` : ""}.</Text>;
}

export async function runCanvasRemoveNode(projectId: string, nodeId: string, options: { keepRelationships?: boolean; json?: boolean } = {}) {
  const { waitUntilExit } = render(<RemoveNodeApp projectId={projectId} nodeId={nodeId} cascadeRelationships={!options.keepRelationships} json={options.json ?? false} />);
  await waitUntilExit();
}
