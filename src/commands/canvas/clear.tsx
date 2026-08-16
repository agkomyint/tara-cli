import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";

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
        const current = await apiRequest<CanvasResponse>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        await apiRequest(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/transactions`, {
          method: "POST",
          body: JSON.stringify({
            baseRevision: current.revision,
            operations: [{ op: "replace", nodes: [] }],
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
