import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { readFileSync, existsSync } from "fs";
import { apiRequest, TaraAPIError } from "../../client.js";

type Props = {
  projectId: string;
  fileOrSpec: string;
};

type CanvasDocument = { version: 1; nodes: any[] };

function ApplySpecApp({ projectId, fileOrSpec }: Props) {
  const [state, setState] = useState<
    | { status: "loading"; message: string }
    | { status: "done"; count: number }
    | { status: "error"; message: string }
  >({ status: "loading", message: "Parsing canvas spec..." });

  useEffect(() => {
    async function run() {
      try {
        let specJson = fileOrSpec;
        if (existsSync(fileOrSpec)) {
          specJson = readFileSync(fileOrSpec, "utf-8");
        }

        let parsed: { version?: number; document?: CanvasDocument; nodes?: any[]; camera?: any };
        try {
          parsed = JSON.parse(specJson);
        } catch {
          throw new Error("Invalid JSON spec provided. Pass a JSON string or path to a .json file.");
        }

        const nodes = parsed.document?.nodes ?? (Array.isArray(parsed.nodes) ? parsed.nodes : null);
        if (!nodes) {
          throw new Error('Canvas spec must contain a "nodes" array or "document" object.');
        }

        setState({ status: "loading", message: "Applying spec to canvas..." });

        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;

        const updatedDoc = {
          version: 1 as const,
          nodes: nodes.map((n: any) => ({
            id: n.id || crypto.randomUUID(),
            type: n.type || "note",
            text: n.text || "",
            x: n.x ?? 100,
            y: n.y ?? 100,
            width: n.width ?? 280,
            height: n.height ?? 180,
            color: n.color || "paper",
            ...n,
          })),
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updatedDoc,
            camera: parsed.camera ?? current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done", count: updatedDoc.nodes.length });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, fileOrSpec]);

  if (state.status === "loading") return <Text color="yellow">{state.message}</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Applied canvas spec ({state.count} nodes)!</Text>
    </Box>
  );
}

export async function runCanvasApply(projectId: string, fileOrSpec: string) {
  const { waitUntilExit } = render(<ApplySpecApp projectId={projectId} fileOrSpec={fileOrSpec} />);
  await waitUntilExit();
}
