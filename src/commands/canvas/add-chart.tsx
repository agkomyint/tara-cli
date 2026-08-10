import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type ChartType = "bar" | "line" | "area" | "scatter" | "pie";

type Props = {
  projectId: string;
  chartType: ChartType;
  title: string;
  dataJson: string;
  x?: number;
  y?: number;
};

type CanvasNode = {
  id: string;
  type: "chart";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: "paper" | "sun" | "mint" | "sky" | "coral";
  data: Record<string, unknown>;
};

type CanvasDocument = { version: 1; nodes: any[] };

function AddChartApp({ projectId, chartType, title, dataJson, x = 160, y = 160 }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; nodeId: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        let parsedData: unknown = [];
        try {
          parsedData = JSON.parse(dataJson);
        } catch {
          throw new Error('Invalid JSON provided for --data parameter.');
        }

        // 1. Fetch current canvas
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;

        // 2. Create chart node
        const newNodeId = crypto.randomUUID();
        const newNode: CanvasNode = {
          id: newNodeId,
          type: "chart",
          text: title,
          x,
          y,
          width: 520,
          height: 340,
          color: "paper",
          data: {
            chartType,
            dataset: parsedData,
          },
        };

        const updated: CanvasDocument = {
          version: 1,
          nodes: [...current.document.nodes, newNode],
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updated,
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done", nodeId: newNodeId });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, chartType, title, dataJson, x, y]);

  if (state.status === "loading") return <Text color="yellow">Adding [{chartType}] chart to canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Added [{chartType}] chart &quot;{title}&quot; to canvas!</Text>
      <Text dimColor>Node ID: {state.nodeId}</Text>
    </Box>
  );
}

export async function runAddChart(
  projectId: string,
  options: { type?: string; title: string; data: string; x?: number; y?: number },
) {
  const chartType = (options.type ?? "bar").toLowerCase() as ChartType;
  const { waitUntilExit } = render(
    <AddChartApp
      projectId={projectId}
      chartType={chartType}
      title={options.title}
      dataJson={options.data}
      x={options.x}
      y={options.y}
    />,
  );
  await waitUntilExit();
}
