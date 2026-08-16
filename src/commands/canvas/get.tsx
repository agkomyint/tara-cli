import React from "react";
import { render, Text, Box } from "ink";

import { apiRequest } from "../../client.js";
import type { CanvasResponse } from "../../contracts.js";

function CanvasView({ data }: { data: CanvasResponse }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">□ Canvas — {data.document.nodes.length} node{data.document.nodes.length !== 1 ? "s" : ""}</Text>
      <Text dimColor>Revision: {data.revision ?? "new canvas"}</Text>
      {data.document.nodes.map((node) => (
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
  const data = await apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas`);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  const { waitUntilExit } = render(<CanvasView data={data} />);
  await waitUntilExit();
}
