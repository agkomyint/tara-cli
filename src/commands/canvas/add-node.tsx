import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";
import { calculateNextPosition } from "./utils.js";

type CanvasNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: "paper" | "sun" | "mint" | "sky" | "coral";
};

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

type NodeType = "text" | "note" | "goal" | "image" | "document" | "html" | "chart" | "map" | "compute";

const DEFAULT_SIZES: Record<NodeType, { width: number; height: number }> = {
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
  type: NodeType;
  text: string;
  x: number;
  y: number;
  color?: string;
};

function AddNodeApp({ projectId, type, text, x, y, color }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; nodeId: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        // 1. Fetch current canvas
        const current = await apiRequest<{ document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        // 2. Create new node
        const size = DEFAULT_SIZES[type] ?? DEFAULT_SIZES.text;
        const newNode: CanvasNode = {
          id: crypto.randomUUID(),
          type,
          text,
          x,
          y,
          width: size.width,
          height: size.height,
          color: (color as CanvasNode["color"]) ?? (type === "note" ? "sun" : "paper"),
        };

        // 3. Save updated document
        const updated: CanvasDocument = {
          version: 1,
          nodes: [...current.document.nodes, newNode],
        };

        await apiRequest(`/api/studio/projects/canvas`, {
          method: "PUT",
          body: JSON.stringify({
            projectId,
            document: updated,
            camera: current.camera,
          }),
        });

        setState({ status: "done", nodeId: newNode.id });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, type, text, x, y, color]);

  if (state.status === "loading") return <Text color="yellow">Adding node...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Node added to canvas</Text>
      <Text dimColor>Node ID: {state.nodeId}</Text>
    </Box>
  );
}

export async function runCanvasAddNode(
  projectId: string,
  options: { type?: string; text: string; x?: number; y?: number; color?: string },
) {
  const { waitUntilExit } = render(
    <AddNodeApp
      projectId={projectId}
      type={(options.type ?? "note") as NodeType}
      text={options.text}
      x={options.x ?? 100}
      y={options.y ?? 100}
      color={options.color}
    />,
  );
  await waitUntilExit();
}
