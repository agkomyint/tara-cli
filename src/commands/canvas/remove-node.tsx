import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type CanvasNode = { id: string; [key: string]: unknown };
type CanvasDocument = { version: 1; nodes: CanvasNode[] };

type Props = {
  projectId: string;
  nodeId: string;
};

function RemoveNodeApp({ projectId, nodeId }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; removedId: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;
        const initialCount = current.document.nodes.length;
        const filteredNodes = current.document.nodes.filter(
          (node) => node.id !== nodeId && !node.id.startsWith(nodeId),
        );

        if (filteredNodes.length === initialCount) {
          throw new Error(`Node matching ID "${nodeId}" not found on canvas.`);
        }

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: filteredNodes },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done", removedId: nodeId });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, nodeId]);

  if (state.status === "loading") return <Text color="yellow">Removing node from canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Node {state.removedId} removed from canvas.</Text>
    </Box>
  );
}

export async function runCanvasRemoveNode(projectId: string, nodeId: string) {
  const { waitUntilExit } = render(<RemoveNodeApp projectId={projectId} nodeId={nodeId} />);
  await waitUntilExit();
}
