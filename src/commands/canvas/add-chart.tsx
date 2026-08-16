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
  xKey?: string;
  yKey?: string;
};

function AddChartApp({ projectId, chartType, title, dataJson, x, y, xKey, yKey }: Props) {
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

        const newNodeId = crypto.randomUUID();
        const firstRow = Array.isArray(parsedData) && parsedData[0] && typeof parsedData[0] === "object" && !Array.isArray(parsedData[0]) ? parsedData[0] as Record<string, unknown> : null;
        const columns = firstRow ? Object.keys(firstRow) : [];
        const newNode = {
          id: newNodeId,
          type: "chart",
          text: title,
          ...(x !== undefined ? { x } : {}),
          ...(y !== undefined ? { y } : {}),
          data: {
            kind: "chart",
            chartType,
            rows: parsedData,
            xKey: xKey || columns[0] || "x",
            yKey: yKey || columns[1] || "y",
          },
        };
        await apiRequest(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
          method: "POST",
          body: JSON.stringify({ node: newNode, idempotencyKey: newNodeId }),
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
  }, [projectId, chartType, title, dataJson, x, y, xKey, yKey]);

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
  options: { type?: string; title: string; data: string; x?: number; y?: number; xKey?: string; yKey?: string },
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
      xKey={options.xKey}
      yKey={options.yKey}
    />,
  );
  await waitUntilExit();
}
