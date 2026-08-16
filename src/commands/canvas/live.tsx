import React, { useEffect, useState } from "react";
import { Box, render, Text } from "ink";

import { apiRequest, TaraAPIError } from "../../client.js";
import type { CanvasNode } from "../../contracts.js";

type State = { status: "loading" } | { status: "done"; node: CanvasNode } | { status: "error"; message: string };

function LiveRequest({ path, body, verb }: { path: string; body?: unknown; verb: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => { apiRequest<{ node: CanvasNode }>(path, { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) }).then((result) => setState({ status: "done", node: result.node })).catch((error) => setState({ status: "error", message: error instanceof TaraAPIError ? error.message : String(error) })); }, [body, path]);
  if (state.status === "loading") return <Text color="yellow">{verb}…</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;
  return <Box flexDirection="column"><Text color="green">✓ {verb} complete</Text><Text>{state.node.text}: {JSON.stringify(state.node.data?.value ?? "not refreshed")}</Text><Text dimColor>Node ID: {state.node.id}</Text></Box>;
}

export async function runLiveAdd(projectId: string, opts: { title: string; url: string; selector?: string; display?: string; unit?: string; x?: number; y?: number; id?: string; refresh?: boolean }) {
  const node = { type: "live", text: opts.title, x: opts.x ?? 160, y: opts.y ?? 160, color: "paper", data: { kind: "live-binding", url: opts.url, selector: opts.selector ?? "$", display: opts.display ?? "metric", label: opts.title, ...(opts.unit ? { unit: opts.unit } : {}), status: "idle" } };
  const path = `/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`;
  const created = await apiRequest<{ node: CanvasNode }>(path, { method: "POST", body: JSON.stringify({ node, idempotencyKey: opts.id ?? crypto.randomUUID() }) });
  if (opts.refresh) return runLiveRefresh(projectId, created.node.id);
  process.stdout.write(`${created.node.id}\n`);
}

export async function runLiveRefresh(projectId: string, nodeId: string) {
  const { waitUntilExit } = render(<LiveRequest verb="Refresh" path={`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}/refresh`} />);
  await waitUntilExit();
}
