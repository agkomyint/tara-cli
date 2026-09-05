import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import { apiRequest } from "./client.js";
import { getBaseUrl } from "./config.js";
import type { CanvasResponse } from "./contracts.js";
import { readTarget, targetPath } from "./project-target.js";

const output = (value: unknown): void => { process.stdout.write(JSON.stringify(value, null, 2) + "\n"); };
type Operation = { op: string; [key: string]: unknown };
type TimelineKeyframe = { id: string; timeMs: number; value: number };
type TimelineTrack = { id: string; nodeId: string; property: "x" | "y" | "opacity" | "scale"; keyframes: TimelineKeyframe[] };
type Timeline = { durationMs: number; fps: number; tracks: TimelineTrack[] };
export type Draft = { version: 1; projectId: string; baseUrl: string; baseRevision: string | null; operations: Operation[]; camera?: CanvasResponse["camera"]; status: "draft" | "committed" };
const operationTypes = new Set(["create", "update", "delete", "create-layer", "update-layer", "delete-layer", "update-timeline"]);

export function parseDraft(value: unknown): Draft {
  if (!value || typeof value !== "object") throw new Error("Draft must be an object.");
  const draft = value as Partial<Draft>;
  if (draft.version !== 1 || typeof draft.projectId !== "string" || !draft.projectId || typeof draft.baseUrl !== "string" || !(draft.baseRevision === null || typeof draft.baseRevision === "string") || !["draft", "committed"].includes(draft.status ?? "") || !Array.isArray(draft.operations)) throw new Error("Invalid draft envelope. Create one with tara draft init.");
  if (draft.operations.length > 10000) throw new Error("Draft exceeds 10,000 operations.");
  const createIds = new Set<string>();
  for (const operation of draft.operations) {
    if (!operation || typeof operation !== "object" || !operationTypes.has(operation.op)) throw new Error("Invalid operation. Full replacement is intentionally unavailable in drafts; use scoped operations.");
    if (["update", "delete"].includes(operation.op) && (typeof operation.nodeId !== "string" || !operation.nodeId)) throw new Error("Update/delete operations need nodeId.");
    if (operation.op === "create") {
      const node = operation.node as { id?: unknown; type?: unknown } | undefined;
      if (!node || typeof node.id !== "string" || !node.id || typeof node.type !== "string") throw new Error("Create operations need node.id and node.type; use stable IDs for resumable work.");
      if (createIds.has(node.id)) throw new Error(`Duplicate create node id "${node.id}". Every created node id must be unique.`);
      createIds.add(node.id);
    }
  }
  return draft as Draft;
}

export function commandManifest(command: Command): unknown {
  return { name: command.name(), description: command.description(), aliases: command.aliases(), arguments: command.registeredArguments.map((arg) => ({ name: arg.name(), required: arg.required, variadic: arg.variadic })), options: command.options.map((option) => ({ flags: option.flags, description: option.description, required: option.required, default: option.defaultValue })), commands: command.commands.map(commandManifest) };
}

export function registerAgentWorkflow(program: Command) {
  program.command("use <project>").description("Bind this working directory to a verified project; use @current in subsequent commands").action(async (project: string) => {
    const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(project)}/canvas`);
    const target = { projectId: canvas.projectId, baseUrl: getBaseUrl() };
    writeFileSync(targetPath(), JSON.stringify(target, null, 2) + "\n");
    output({ ok: true, ...target, file: targetPath(), next: "tara canvas get @current --json" });
  });
  program.command("status").description("Show the directory's current project and server without network requests").action(() => output({ ok: true, ...readTarget(), file: targetPath(), note: "Explicit CLI target; not inferred from the browser tab." }));
  program.command("agent").description("Offline quickstart and operating contract for autonomous agents").action(() => output({
    version: 1,
    discovery: ["tara commands --json", "tara <command> --help", "tara context @current --json"],
    workflow: ["tara list --json", "tara use <project-id>", "tara status", "tara draft init @current task.json", "Edit task.json operations locally; inspect task.json.snapshot.json for existing nodes, layers and camera", "tara draft preview task.json", "tara draft commit task.json"],
    rules: ["Use @current explicitly; the browser's active project is not automatically selected.", "Draft files are durable checkpoints. Keep them in the task workspace and pass their path to the next agent.", "draft preview is offline structural validation; the server performs full schema validation at commit.", "draft commit writes immediately. Commit only when the user authorizes saving. Other mutation commands also write immediately.", "On exit 4 (revision conflict), preserve the draft, read the latest canvas once and review/rebase your operations; never blindly overwrite baseRevision.", "Use stable entity and relationship IDs; sourceNodeId and targetNodeId must refer to entity IDs.", "Position relationship labels between endpoints, or explicitly run layout-ontology after saving (another write).", "Prefer company, product, system, process, resource or evidence categories over a generic type.", "apply is a full node replacement and clears timeline tracks; use drafts for existing projects.", "Avoid polling loops and per-node mutations; batch local operations to reduce database traffic."],
    exits: { "0": "success", "1": "local or unexpected error", "2": "invalid request", "3": "authentication/permission", "4": "revision conflict", "5": "network/server/rate limit" },
    exampleOperation: { op: "create", node: { id: "company-example", type: "entity", text: "Example company", x: 100, y: 100, data: { entityType: "company", attributes: { role: "Model developer" } } } },
  }));
  const draft = program.command("draft").description("Prepare local, resumable batches for an existing project; save only with commit");
  draft.command("init <project> <file>").description("Read the canvas once; create a local operation draft and a snapshot (no server writes)").action(async (project: string, file: string) => {
    // Exclusive file creation protects existing checkpoints.
    const path = resolve(file);
    const handle = { version: 1, projectId: "", baseUrl: getBaseUrl(), baseRevision: null, operations: [], status: "draft" };
    const canvas = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(project)}/canvas`);
    writeFileSync(path + ".snapshot.json", JSON.stringify(canvas, null, 2) + "\n", { flag: "wx" });
    writeFileSync(path, JSON.stringify({ ...handle, projectId: canvas.projectId, baseRevision: canvas.revision }, null, 2) + "\n", { flag: "wx" });
    output({ ok: true, file: path, snapshot: path + ".snapshot.json", projectId: canvas.projectId, revision: canvas.revision });
  });
  draft.command("preview <file>").description("Inspect and structurally validate local operations without network access").action((file: string) => {
    const value = parseDraft(JSON.parse(readFileSync(file, "utf8")));
    output({ ok: true, validation: "local-structure-only", ...value, counts: value.operations.reduce<Record<string, number>>((counts, op) => ({ ...counts, [op.op]: (counts[op.op] ?? 0) + 1 }), {}) });
  });
  draft.command("keyframe <file> <nodeId> <property> <timeMs> <value>").description("Add or replace one local animation keyframe in a draft; no server writes").action((file: string, nodeId: string, property: string, timeText: string, valueText: string) => {
    const path = resolve(file);
    const value = parseDraft(JSON.parse(readFileSync(path, "utf8")));
    const timeMs = Number(timeText);
    const numericValue = Number(valueText);
    if (!Number.isInteger(timeMs) || timeMs < 0) throw new Error("Keyframe timeMs must be a non-negative integer.");
    if (!Number.isFinite(numericValue)) throw new Error("Keyframe value must be a finite number.");
    if (!(property === "x" || property === "y" || property === "opacity" || property === "scale")) throw new Error("Keyframe property must be x, y, opacity, or scale.");
    if (property === "opacity" && (numericValue < 0 || numericValue > 1)) throw new Error("Opacity keyframe values must be between 0 and 1.");
    if (property === "scale" && (numericValue < 0.05 || numericValue > 20)) throw new Error("Scale keyframe values must be between 0.05 and 20.");
    const snapshotPath = path + ".snapshot.json";
    const snapshot = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, "utf8")) as { document?: { timeline?: Timeline } } : null;
    const timeline: Timeline = { durationMs: snapshot?.document?.timeline?.durationMs ?? 10_000, fps: snapshot?.document?.timeline?.fps ?? 30, tracks: snapshot?.document?.timeline?.tracks ? [...snapshot.document.timeline.tracks] : [] };
    let timelineOperation: Operation | undefined;
    for (const operation of value.operations) if (operation.op === "update-timeline") timelineOperation = operation;
    if (timelineOperation && timelineOperation.timeline && typeof timelineOperation.timeline === "object") Object.assign(timeline, timelineOperation.timeline as Partial<Timeline>);
    const tracks = timeline.tracks.map((track) => ({ ...track, keyframes: [...track.keyframes] }));
    const track = tracks.find((candidate) => candidate.nodeId === nodeId && candidate.property === property);
    const keyframe = { id: `kf-${nodeId}-${property}-${timeMs}`, timeMs, value: numericValue };
    if (track) track.keyframes = [...track.keyframes.filter((candidate) => candidate.timeMs !== timeMs), keyframe].sort((left, right) => left.timeMs - right.timeMs);
    else tracks.push({ id: `track-${nodeId}-${property}`, nodeId, property, keyframes: [keyframe] });
    timeline.tracks = tracks;
    if (timelineOperation) timelineOperation.timeline = timeline;
    else value.operations.push({ op: "update-timeline", timeline });
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
    output({ ok: true, local: true, file: path, nodeId, property, timeMs, value: numericValue, tracks: tracks.length });
  });
  draft.command("commit <file>").description("Explicitly save one scoped transaction using the captured revision; no automatic overwrite or retry").action(async (file: string) => {
    const value = parseDraft(JSON.parse(readFileSync(file, "utf8")));
    if (value.status === "committed") throw new Error("Draft already committed. Initialize a new draft for further work.");
    if (value.baseUrl !== getBaseUrl()) throw new Error("Draft belongs to a different server.");
    if (!value.operations.length && !value.camera) throw new Error("Draft has no changes.");
    const result = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(value.projectId)}/canvas/transactions`, { method: "POST", body: JSON.stringify({ baseRevision: value.baseRevision, operations: value.operations, camera: value.camera }) });
    writeFileSync(file, JSON.stringify({ ...value, status: "committed", committedRevision: result.revision }, null, 2) + "\n");
    output({ ok: true, projectId: value.projectId, revision: result.revision, operations: value.operations.length, file: resolve(file) });
  });
}
