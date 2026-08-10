import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type CanvasDocument = { version: 1; nodes: any[] };

type Props = {
  projectId: string;
};

function ClearCanvasApp({ projectId }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    async function run() {
      try {
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = current.projectId || projectId;

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: [] },
            camera: { x: 160, y: 120, zoom: 1 },
          }),
        });

        setState({ status: "done" });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId]);

  if (state.status === "loading") return <Text color="yellow">Clearing canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Canvas cleared!</Text>
    </Box>
  );
}

export async function runCanvasClear(projectId: string) {
  const { waitUntilExit } = render(<ClearCanvasApp projectId={projectId} />);
  await waitUntilExit();
}
