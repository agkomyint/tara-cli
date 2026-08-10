import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type Props = {
  projectId: string;
  nodeId: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  gradient?: string;
};

type CanvasNode = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

function UpdateNodeApp({ projectId, nodeId, text, x, y, width, height, color, gradient }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; updatedNode: CanvasNode }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;
        let target: CanvasNode | undefined;

        const updatedNodes = current.document.nodes.map((node) => {
          if (node.id === nodeId || node.id.startsWith(nodeId)) {
            target = {
              ...node,
              ...(text !== undefined ? { text } : {}),
              ...(x !== undefined ? { x } : {}),
              ...(y !== undefined ? { y } : {}),
              ...(width !== undefined ? { width } : {}),
              ...(height !== undefined ? { height } : {}),
              ...(color !== undefined ? { color } : {}),
            };
            
            if (gradient) {
              target.data = {
                ...(target.data as Record<string, unknown> || {}),
                gradient: gradient.includes(",") ? gradient.split(",").map(c => c.trim()) : null,
              };
            }
            
            return target;
          }
          return node;
        });

        if (!target) throw new Error(`Node matching ID "${nodeId}" not found on canvas.`);

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: updatedNodes },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done", updatedNode: target });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, nodeId, text, x, y, width, height, color, gradient]);

  if (state.status === "loading") return <Text color="yellow">Updating node on canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Node {state.updatedNode.id} updated!</Text>
      <Text dimColor>Position: ({state.updatedNode.x}, {state.updatedNode.y}) Size: {state.updatedNode.width}×{state.updatedNode.height}</Text>
    </Box>
  );
}

export async function runCanvasUpdateNode(
  projectId: string,
  nodeId: string,
  options: { text?: string; x?: number; y?: number; width?: number; height?: number; color?: string; gradient?: string },
) {
  const { waitUntilExit } = render(
    <UpdateNodeApp
      projectId={projectId}
      nodeId={nodeId}
      text={options.text}
      x={options.x}
      y={options.y}
      width={options.width}
      height={options.height}
      color={options.color}
      gradient={options.gradient}
    />,
  );
  await waitUntilExit();
}
