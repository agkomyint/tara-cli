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
  color: "paper" | "sun" | "mint" | "sky" | "coral";
  [key: string]: unknown;
};

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  text: { width: 280, height: 100 },
  note: { width: 280, height: 180 },
  goal: { width: 320, height: 190 },
  image: { width: 420, height: 300 },
  document: { width: 420, height: 560 },
  html: { width: 640, height: 420 },
  chart: { width: 520, height: 340 },
  map: { width: 560, height: 380 },
  compute: { width: 432, height: 260 },
};

type Props = {
  projectId: string;
  nodesJson: string;
  layout?: "grid" | "flow" | "none";
  startX?: number;
  startY?: number;
};

function AddBatchApp({ projectId, nodesJson, layout = "grid", startX = 100, startY = 100 }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; count: number; ids: string[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        let inputNodes: Array<Partial<CanvasNode>> = [];
        try {
          inputNodes = JSON.parse(nodesJson);
          if (!Array.isArray(inputNodes)) throw new Error("Input must be a JSON array of nodes.");
        } catch (e) {
          throw new Error(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Fetch current canvas
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;

        // Auto-layout math
        const cols = 3;
        const gapX = 40;
        const gapY = 40;
        let currX = startX;
        let currY = startY;
        let maxHeightInRow = 0;

        const newNodes: CanvasNode[] = inputNodes.map((n, idx) => {
          const type = n.type || "note";
          const defaultSize = DEFAULT_SIZES[type] || DEFAULT_SIZES.note;
          const width = n.width || defaultSize.width;
          const height = n.height || defaultSize.height;

          let posX = n.x;
          let posY = n.y;

          if (layout !== "none" || (posX === undefined && posY === undefined)) {
            const col = idx % cols;
            if (col === 0 && idx > 0) {
              currX = startX;
              currY += maxHeightInRow + gapY;
              maxHeightInRow = 0;
            }
            posX = currX;
            posY = currY;

            currX += width + gapX;
            if (height > maxHeightInRow) maxHeightInRow = height;
          }

          return {
            id: n.id || crypto.randomUUID(),
            type,
            text: n.text || "",
            x: posX ?? 100,
            y: posY ?? 100,
            width,
            height,
            color: n.color || (type === "note" ? "sun" : "paper"),
            ...n,
          } as CanvasNode;
        });

        const updatedDoc: CanvasDocument = {
          version: 1,
          nodes: [...current.document.nodes, ...newNodes],
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updatedDoc,
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({
          status: "done",
          count: newNodes.length,
          ids: newNodes.map((n) => n.id),
        });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, nodesJson, layout, startX, startY]);

  if (state.status === "loading") return <Text color="yellow">Adding batch of nodes to canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Added {state.count} nodes to canvas!</Text>
      <Text dimColor>Node IDs: {state.ids.slice(0, 3).join(", ")}{state.ids.length > 3 ? "..." : ""}</Text>
    </Box>
  );
}

export async function runCanvasAddBatch(
  projectId: string,
  options: { nodes: string; layout?: string; x?: number; y?: number },
) {
  const { waitUntilExit } = render(
    <AddBatchApp
      projectId={projectId}
      nodesJson={options.nodes}
      layout={(options.layout as "grid" | "flow" | "none") ?? "grid"}
      startX={options.x}
      startY={options.y}
    />,
  );
  await waitUntilExit();
}
