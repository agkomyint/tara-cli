import { readFileSync } from "fs";
import { apiRequest } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

export async function runCanvasUpdateNode(
  projectId: string,
  nodeId: string,
  options: { text?: string; type?: string; x?: number; y?: number; width?: number; height?: number; color?: string; gradient?: string; region?: string; locationKey?: string; valueKey?: string; featureKey?: string; sourceUrl?: string; sourceDatasetId?: string; data?: string; dataFile?: string; dataStdin?: boolean; entityType?: string; attributes?: string; externalId?: string; status?: string; removeData?: string[]; json?: boolean },
) {
  const dataJson = options.dataStdin ? readFileSync(0, "utf8") : options.dataFile ? readFileSync(options.dataFile, "utf8") : options.data;
  const updates = {
    ...(options.text !== undefined ? { text: options.text } : {}),
    ...(options.type !== undefined ? { type: options.type } : {}),
    ...(options.x !== undefined ? { x: options.x } : {}),
    ...(options.y !== undefined ? { y: options.y } : {}),
    ...(options.width !== undefined ? { width: options.width } : {}),
    ...(options.height !== undefined ? { height: options.height } : {}),
    ...(options.color !== undefined ? { color: options.color } : {}),
    ...(options.sourceUrl !== undefined ? { sourceUrl: options.sourceUrl } : {}),
  };
  const dataPatch = {
    ...(options.gradient ? { gradient: options.gradient.includes(",") ? options.gradient.split(",").map((color) => color.trim()) : null } : {}),
    ...(options.region ? { region: options.region === "auto" ? null : options.region } : {}),
    ...(options.locationKey ? { locationKey: options.locationKey } : {}),
    ...(options.valueKey ? { valueKey: options.valueKey } : {}),
    ...(options.featureKey ? { featureKey: options.featureKey } : {}),
    ...(options.sourceDatasetId ? { sourceDatasetId: options.sourceDatasetId } : {}),
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.attributes ? { attributes: JSON.parse(options.attributes) as Record<string, unknown> } : {}),
    ...(options.externalId ? { externalId: options.externalId } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(dataJson ? { rows: JSON.parse(dataJson) as unknown } : {}),
  };
  const result = await apiRequest<{ node: CanvasNode }>(
    `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}`,
    { method: "PATCH", body: JSON.stringify({ updates, dataPatch: Object.keys(dataPatch).length ? dataPatch : undefined, dataRemove: options.removeData?.length ? options.removeData : undefined }) },
  );
  if (options.json) process.stdout.write(JSON.stringify(result) + "\n");
  else process.stdout.write(`Updated node ${result.node.id} at (${result.node.x}, ${result.node.y})\n`);
}
