import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type CanvasNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
};

type CanvasDocument = {
  version: 1;
  nodes: CanvasNode[];
};

type Props = { projectId: string; json?: boolean };

function CanvasGetApp({ projectId, json }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; document: CanvasDocument }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ document: CanvasDocument; camera: unknown }>(`/api/studio/projects/${projectId}/canvas`)
      .then((data) => setState({ status: "done", document: data.document }))
      .catch((err) =>
        setState({ status: "error", message: err instanceof TaraAPIError ? err.message : String(err) }),
      );
  }, [projectId]);

  if (state.status === "loading") return <Text color="yellow">Loading canvas...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  const { document: doc } = state;

  if (json) {
    process.stdout.write(JSON.stringify(doc, null, 2) + "\n");
    return null;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">□ Canvas — {doc.nodes.length} node{doc.nodes.length !== 1 ? "s" : ""}</Text>
      {doc.nodes.map((node) => (
        <Box key={node.id} flexDirection="column">
          <Box gap={2}>
            <Text color="cyan">[{node.type}]</Text>
            <Text bold>{node.text?.slice(0, 60) || "(empty)"}{(node.text?.length ?? 0) > 60 ? "..." : ""}</Text>
          </Box>
          <Text dimColor>  id:{node.id}  pos:({node.x},{node.y})  size:{node.width}×{node.height}</Text>
        </Box>
      ))}
    </Box>
  );
}

export async function runCanvasGet(projectId: string, options: { json?: boolean }) {
  const { waitUntilExit } = render(<CanvasGetApp projectId={projectId} json={options.json} />);
  await waitUntilExit();
}
