import React from "react";
import { render, Text, Box } from "ink";

import { apiRequest } from "../../client.js";
import type { NodeRegistryResponse } from "../../contracts.js";

function NodeTypesView({ data }: { data: NodeRegistryResponse }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">Available Canvas Node Types ({data.nodeTypes.length}) · contract v{data.contractVersion}</Text>
      <Box flexDirection="column" gap={0}>
        {data.nodeTypes.map((nodeType) => (
          <Box key={nodeType.type} gap={2}>
            <Box width={14}><Text bold color="green">{nodeType.type}</Text></Box>
            <Box width={14}><Text>{nodeType.label}</Text></Box>
            <Box width={16}><Text dimColor>{nodeType.defaultSize.width}×{nodeType.defaultSize.height}px</Text></Box>
            <Box width={14}><Text color={nodeType.renderer === "native" ? "green" : "yellow"}>{nodeType.renderer}</Text></Box>
            <Text color="yellow">[{nodeType.capabilities.join(", ")}]</Text>
          </Box>
        ))}
      </Box>
      <Text bold color="cyan">{"\n"}Supported Color Presets</Text>
      <Box gap={3}>{data.colors.map((color) => <Text key={color.name}>● {color.name} ({color.label})</Text>)}</Box>
    </Box>
  );
}

export async function runNodeTypes(options: { json?: boolean }) {
  const data = await apiRequest<NodeRegistryResponse>("/api/studio/canvas/node-types");
  if (options.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  const { waitUntilExit } = render(<NodeTypesView data={data} />);
  await waitUntilExit();
}
