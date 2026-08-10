import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";
import { calculateNextPosition } from "./utils.js";

type Props = {
  projectId: string;
  title: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  x?: number;
  y?: number;
  dataJson?: string;
  locationKey?: string;
  valueKey?: string;
  gradient?: string;
  region?: string;
};

type CanvasNode = {
  id: string;
  type: "map";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: "paper" | "sun" | "mint" | "sky" | "coral";
  data: Record<string, unknown>;
};

type CanvasDocument = { version: 1; nodes: any[] };

function AddMapApp({
  projectId,
  title,
  lat = 37.7749,
  lng = -122.4194,
  zoom = 4,
  x,
  y,
  dataJson,
  locationKey,
  valueKey,
  gradient,
  region,
}: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; nodeId: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;
        const pos = calculateNextPosition(current.document.nodes, x, y);

        // 2. Create map node
        const newNodeId = crypto.randomUUID();
        const newNode: CanvasNode = {
          id: newNodeId,
          type: "map",
          text: title,
          x: pos.x,
          y: pos.y,
          width: 560,
          height: 380,
          color: "paper",
          data: {
            lat,
            lng,
            mapZoom: zoom,
            ...(dataJson ? { rows: JSON.parse(dataJson), focusData: true } : {}),
            ...(locationKey ? { locationKey } : {}),
            ...(valueKey ? { valueKey } : {}),
            ...(gradient && gradient.includes(",") ? { gradient: gradient.split(",").map((c) => c.trim()) } : {}),
            ...(region ? { region } : {}),
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
  }, [projectId, title, lat, lng, zoom, x, y, dataJson, locationKey, valueKey, gradient, region]);

  if (state.status === "loading") return <Text color="yellow">Adding map &quot;{title}&quot; to canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Added map node &quot;{title}&quot; to canvas!</Text>
      <Text dimColor>Node ID: {state.nodeId}</Text>
    </Box>
  );
}

export async function runAddMap(
  projectId: string,
  options: {
    title: string;
    lat?: number;
    lng?: number;
    zoom?: number;
    x?: number;
    y?: number;
    data?: string;
    locationKey?: string;
    valueKey?: string;
    gradient?: string;
    region?: string;
  },
) {
  const { waitUntilExit } = render(
    <AddMapApp
      projectId={projectId}
      title={options.title}
      lat={options.lat}
      lng={options.lng}
      zoom={options.zoom}
      x={options.x}
      y={options.y}
      dataJson={options.data}
      locationKey={options.locationKey}
      valueKey={options.valueKey}
      gradient={options.gradient}
      region={options.region}
    />,
  );
  await waitUntilExit();
}
