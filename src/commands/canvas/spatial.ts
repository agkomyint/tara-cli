import { apiRequest } from "../../client.js";

type SpatialNode = {
  id: string;
  label: string;
  type: string;
  position: { x: number; y: number };
  center: { x: number; y: number };
  size: { width: number; height: number };
  sector: { x: number; y: number };
  distanceFromOrigin: number;
};

type DistanceMeasurement = {
  first: SpatialNode;
  second: SpatialNode;
  distance: number;
  delta: { x: number; y: number };
  direction: string;
  layoutSignal: "overlapping" | "adjacent" | "nearby" | "separate";
  nearestEdgeDistance: number;
};

type SpatialResponse = {
  projectId: string;
  revision: string | null;
  mode: "geometry" | "distance" | "near" | "area";
  node?: SpatialNode;
  measurement?: DistanceMeasurement;
  nodes?: Array<SpatialNode & { distance?: number }>;
};

export async function runCanvasPosition(projectId: string, nodeId: string, options: { json?: boolean }) {
  const result = await spatialRequest(projectId, { mode: "geometry", nodeId });
  if (!result.node) throw new Error("The spatial API did not return node geometry.");
  if (options.json) return writeJson(result);
  process.stdout.write(`${result.node.id}\n  position: (${result.node.position.x}, ${result.node.position.y})\n  center:   (${result.node.center.x}, ${result.node.center.y})\n  size:     ${result.node.size.width} × ${result.node.size.height}\n  sector:   (${result.node.sector.x}, ${result.node.sector.y})\n`);
}

export async function runCanvasDistance(projectId: string, from: string, to: string, options: { json?: boolean }) {
  const result = await spatialRequest(projectId, { mode: "distance", from, to });
  if (!result.measurement) throw new Error("The spatial API did not return a distance measurement.");
  if (options.json) return writeJson(result);
  const { first, second, distance, delta, direction, layoutSignal, nearestEdgeDistance } = result.measurement;
  process.stdout.write(`${first.id} (${first.position.x}, ${first.position.y}) → ${second.id} (${second.position.x}, ${second.position.y})\n  center distance: ${distance} wu\n  direction: ${direction} (Δx ${delta.x}, Δy ${delta.y})\n  nearest edges: ${nearestEdgeDistance} wu · layout signal: ${layoutSignal}\n`);
}

export async function runCanvasNearby(projectId: string, options: { x: number; y: number; radius: number; limit?: number; json?: boolean }) {
  const result = await spatialRequest(projectId, { mode: "near", x: options.x, y: options.y, radius: options.radius, limit: options.limit });
  if (options.json) return writeJson(result);
  writeNodeList(result.nodes ?? []);
}

export async function runCanvasArea(projectId: string, options: { left: number; top: number; right: number; bottom: number; limit?: number; json?: boolean }) {
  const result = await spatialRequest(projectId, { mode: "area", left: options.left, top: options.top, right: options.right, bottom: options.bottom, limit: options.limit });
  if (options.json) return writeJson(result);
  writeNodeList(result.nodes ?? []);
}

async function spatialRequest(projectId: string, values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams(Object.entries(values).flatMap(([key, value]) => value === undefined ? [] : [[key, String(value)]]));
  return apiRequest<SpatialResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/spatial?${params}`);
}

function writeNodeList(nodes: Array<SpatialNode & { distance?: number }>) {
  if (nodes.length === 0) return void process.stdout.write("No matching nodes.\n");
  for (const node of nodes) process.stdout.write(`${node.id}  (${node.position.x}, ${node.position.y})${node.distance === undefined ? "" : `  ${node.distance} wu`}\n`);
}

function writeJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}
