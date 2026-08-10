import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type CanvasNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  [key: string]: unknown;
};

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

type Props = {
  projectId: string;
  columns?: number;
  gapX?: number;
  gapY?: number;
};

function ArrangeApp({ projectId, columns = 3, gapX = 40, gapY = 40 }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; count: number }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;
        const nodes = current.document.nodes;

        if (nodes.length === 0) {
          setState({ status: "done", count: 0 });
          return;
        }

        let currX = 100;
        let currY = 100;
        let maxHeightInRow = 0;

        const arrangedNodes = nodes.map((node, idx) => {
          const col = idx % columns;
          if (col === 0 && idx > 0) {
            currX = 100;
            currY += maxHeightInRow + gapY;
            maxHeightInRow = 0;
          }

          const arranged = {
            ...node,
            x: currX,
            y: currY,
          };

          currX += node.width + gapX;
          if (node.height > maxHeightInRow) maxHeightInRow = node.height;

          return arranged;
        });

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: arrangedNodes },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done", count: nodes.length });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, columns, gapX, gapY]);

  if (state.status === "loading") return <Text color="yellow">Arranging canvas nodes into grid...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Arranged {state.count} nodes into a clean {columns}-column grid!</Text>
    </Box>
  );
}

export async function runCanvasArrange(
  projectId: string,
  options: { columns?: number; gapX?: number; gapY?: number },
) {
  const { waitUntilExit } = render(
    <ArrangeApp
      projectId={projectId}
      columns={options.columns}
      gapX={options.gapX}
      gapY={options.gapY}
    />,
  );
  await waitUntilExit();
}
