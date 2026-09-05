import { apiRequest } from "../../client.js";

type Layer = { id: string; name: string; z: number; visible: boolean; locked: boolean };
type LayerCanvas = { projectId: string; revision: string | null; document: { layers: Layer[] } };

export async function runCanvasLayers(projectId: string, options: { json?: boolean }) {
  const canvas = await apiRequest<LayerCanvas>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  if (options.json) process.stdout.write(`${JSON.stringify({ projectId: canvas.projectId, layers: canvas.document.layers }, null, 2)}\n`);
  else for (const layer of [...canvas.document.layers].sort((a, b) => a.z - b.z)) process.stdout.write(`${layer.id}\t${layer.z}\t${layer.name}${layer.visible ? "" : " (hidden)"}${layer.locked ? " (locked)" : ""}\n`);
}

export async function runCanvasAddLayer(projectId: string, name: string, options: { id?: string; json?: boolean }) {
  const canvas = await apiRequest<LayerCanvas>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const id = options.id ?? `layer-${crypto.randomUUID()}`;
  const existing = canvas.document.layers.find((layer) => layer.id === id);
  if (existing) { if (options.json) process.stdout.write(`${JSON.stringify({ projectId: canvas.projectId, layer: existing, created: false }, null, 2)}\n`); else process.stdout.write(`Layer already exists: ${existing.name} (${existing.id})\n`); return; }
  const layer = { id, name: name.trim(), z: Math.max(...canvas.document.layers.map((item) => item.z), 0) + 1, visible: true, locked: false };
  const result = await apiRequest<LayerCanvas>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/transactions`, { method: "POST", body: JSON.stringify({ baseRevision: canvas.revision, operations: [{ op: "create-layer", layer }] }) });
  if (options.json) process.stdout.write(`${JSON.stringify({ projectId: result.projectId, layer, created: true, revision: result.revision }, null, 2)}\n`);
  else process.stdout.write(`Created layer: ${layer.name} (${layer.id})\n`);
}
