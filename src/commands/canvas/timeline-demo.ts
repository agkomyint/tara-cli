import { apiRequest } from "../../client.js";

type CanvasState = {
  projectId: string;
  document: {
    layers: Array<{ id: string; z: number }>;
    timeline: { durationMs: number; fps: number; tracks: TimelineTrack[] };
  };
  camera: { x: number; y: number; zoom: number };
  revision: string | null;
};

type TimelineKeyframe = { id: string; timeMs: number; value: number };
type TimelineTrack = { id: string; nodeId: string; property: "x" | "y" | "opacity" | "scale"; keyframes: TimelineKeyframe[] };

export async function runCanvasTimelineDemo(projectId: string, options: { json?: boolean } = {}) {
  const current = await apiRequest<CanvasState>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  const demoLayerId = `timeline-demo-${crypto.randomUUID()}`;
  const nodeIds = {
    question: `timeline-question-${crypto.randomUUID()}`,
    evidence: `timeline-evidence-${crypto.randomUUID()}`,
    conclusion: `timeline-conclusion-${crypto.randomUUID()}`,
  };
  const nextZ = Math.max(...current.document.layers.map((layer) => layer.z), 0) + 1;
  const nodes = [
    { id: nodeIds.question, type: "note", layerId: demoLayerId, x: 120, y: 180, width: 320, height: 180, text: "1 · Research question", color: "sun", data: { demo: "timeline", role: "question" } },
    { id: nodeIds.evidence, type: "document", layerId: demoLayerId, x: 520, y: 180, width: 360, height: 240, text: "2 · Evidence gathered", color: "sky", data: { demo: "timeline", role: "evidence" } },
    { id: nodeIds.conclusion, type: "goal", layerId: demoLayerId, x: 920, y: 180, width: 320, height: 190, text: "3 · Working conclusion", color: "mint", data: { demo: "timeline", role: "conclusion" } },
  ];
  const track = (nodeId: string, property: "x" | "y" | "opacity", values: Array<[number, number]>): TimelineTrack => ({
    id: `track-${nodeId}-${property}`,
    nodeId,
    property,
    keyframes: values.map(([timeMs, value]) => ({ id: `track-${nodeId}-${property}-${timeMs}`, timeMs, value })),
  });
  const timeline = {
    durationMs: 9_000,
    fps: 30,
    tracks: [
      track(nodeIds.question, "x", [[0, 120], [3_000, 120], [4_500, 260]]),
      track(nodeIds.question, "y", [[0, 180], [3_000, 180], [4_500, 220]]),
      track(nodeIds.evidence, "x", [[0, 520], [3_000, 520], [6_000, 520]]),
      track(nodeIds.evidence, "y", [[0, 180], [3_000, 180], [6_000, 180]]),
      track(nodeIds.evidence, "opacity", [[0, 0], [2_500, 0], [3_500, 1], [9_000, 1]]),
      track(nodeIds.conclusion, "x", [[0, 920], [5_000, 920], [8_000, 760]]),
      track(nodeIds.conclusion, "y", [[0, 180], [5_000, 180], [8_000, 220]]),
      track(nodeIds.conclusion, "opacity", [[0, 0], [5_000, 0], [6_000, 1], [9_000, 1]]),
    ],
  };
  const result = await apiRequest<CanvasState & { results: Array<{ op: string; nodeId: string }> }>(
    `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/transactions`,
    {
      method: "POST",
      body: JSON.stringify({
        baseRevision: current.revision,
        operations: [
          { op: "create-layer", layer: { id: demoLayerId, name: "Timeline Demo", z: nextZ, visible: true, locked: false } },
          ...nodes.map((node) => ({ op: "create", node, idempotencyKey: node.id })),
          { op: "update-timeline", timeline },
        ],
      }),
    },
  );
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ projectId, layerId: demoLayerId, nodeIds, timeline: result.document.timeline, revision: result.revision }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`✓ Timeline demo added to ${projectId}\nLayer: ${demoLayerId}\nDuration: 9 seconds · Tracks: ${timeline.tracks.length}\n`);
}
