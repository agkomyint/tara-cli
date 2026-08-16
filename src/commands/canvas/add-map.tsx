import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

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
  mapTopology?: string;
};

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
  mapTopology,
}: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; nodeId: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const newNodeId = crypto.randomUUID();
        const newNode = {
          id: newNodeId,
          type: "map",
          text: title,
          ...(x !== undefined ? { x } : {}),
          ...(y !== undefined ? { y } : {}),
          data: {
            lat,
            lng,
            mapZoom: zoom,
            ...(dataJson ? { rows: JSON.parse(dataJson), focusData: true } : {}),
            ...(locationKey ? { locationKey } : {}),
            ...(valueKey ? { valueKey } : {}),
            ...(gradient && gradient.includes(",") ? { gradient: gradient.split(",").map((c) => c.trim()) } : {}),
            ...(region ? { region } : {}),
            ...(mapTopology ? { mapTopology, projection: mapTopology === "usStates" ? "albersUsa" : "equalEarth" } : {}),
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
  }, [projectId, title, lat, lng, zoom, x, y, dataJson, locationKey, valueKey, gradient, region, mapTopology]);

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
    topology?: string;
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
      mapTopology={options.topology}
    />,
  );
  await waitUntilExit();
}
