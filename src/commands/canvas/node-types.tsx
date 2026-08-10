import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type NodeTypeDef = {
  type: string;
  label: string;
  defaultSize: { width: number; height: number };
  capabilities: string[];
  acceptedMimeTypes?: string[];
};

type ColorDef = {
  name: string;
  label: string;
  hex: string;
};

type NodeTypesResponse = {
  nodeTypes: NodeTypeDef[];
  colors: ColorDef[];
  capabilities: string[];
};

const FALLBACK_NODE_TYPES: NodeTypeDef[] = [
  { type: "text", label: "Text", defaultSize: { width: 280, height: 100 }, capabilities: ["editable", "resizable"] },
  { type: "note", label: "Note", defaultSize: { width: 280, height: 180 }, capabilities: ["editable", "resizable"] },
  { type: "goal", label: "Goal", defaultSize: { width: 320, height: 190 }, capabilities: ["editable", "resizable", "computable"] },
  { type: "image", label: "Image", defaultSize: { width: 420, height: 300 }, capabilities: ["resizable", "computable"], acceptedMimeTypes: ["image/*"] },
  { type: "video", label: "Video", defaultSize: { width: 480, height: 300 }, capabilities: ["resizable", "playable", "computable"], acceptedMimeTypes: ["video/*"] },
  { type: "document", label: "Document", defaultSize: { width: 420, height: 560 }, capabilities: ["resizable", "computable"], acceptedMimeTypes: ["application/pdf", "text/*"] },
  { type: "html", label: "HTML", defaultSize: { width: 640, height: 420 }, capabilities: ["resizable", "sandboxed"] },
  { type: "component", label: "Component", defaultSize: { width: 480, height: 320 }, capabilities: ["resizable", "sandboxed"] },
  { type: "embed", label: "Embed", defaultSize: { width: 560, height: 360 }, capabilities: ["resizable", "sandboxed"] },
  { type: "chart", label: "Chart", defaultSize: { width: 520, height: 340 }, capabilities: ["resizable", "computable"] },
  { type: "map", label: "Map", defaultSize: { width: 560, height: 380 }, capabilities: ["resizable", "computable"] },
  { type: "model3d", label: "3D model", defaultSize: { width: 520, height: 420 }, capabilities: ["resizable", "playable"], acceptedMimeTypes: ["model/gltf-binary"] },
  { type: "compute", label: "Query", defaultSize: { width: 432, height: 260 }, capabilities: ["resizable", "computable"] },
];

const FALLBACK_COLORS: ColorDef[] = [
  { name: "paper", label: "Paper White", hex: "#FFFFFF" },
  { name: "sun", label: "Warm Sun", hex: "#FEF08A" },
  { name: "mint", label: "Fresh Mint", hex: "#BBF7D0" },
  { name: "sky", label: "Sky Blue", hex: "#BAE6FD" },
  { name: "coral", label: "Soft Coral", hex: "#FECDD3" },
];

type Props = {
  json?: boolean;
};

function NodeTypesApp({ json }: Props) {
  const [data, setData] = useState<{ nodeTypes: NodeTypeDef[]; colors: ColorDef[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<NodeTypesResponse>("/api/studio/canvas/node-types")
      .then((res) => {
        setData({ nodeTypes: res.nodeTypes, colors: res.colors });
        setLoading(false);
      })
      .catch(() => {
        setData({ nodeTypes: FALLBACK_NODE_TYPES, colors: FALLBACK_COLORS });
        setLoading(false);
      });
  }, []);

  if (loading) return <Text color="yellow">Loading available node types...</Text>;

  if (json && data) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return null;
  }

  const { nodeTypes, colors } = data!;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">📦 Available Canvas Node Types ({nodeTypes.length})</Text>
      
      <Box flexDirection="column" gap={0}>
        {nodeTypes.map((nt) => (
          <Box key={nt.type} gap={2}>
            <Box width={14}>
              <Text bold color="green">{nt.type}</Text>
            </Box>
            <Box width={14}>
              <Text>{nt.label}</Text>
            </Box>
            <Box width={16}>
              <Text dimColor>{nt.defaultSize.width}×{nt.defaultSize.height}px</Text>
            </Box>
            <Text color="yellow">[{nt.capabilities.join(", ")}]</Text>
            {nt.acceptedMimeTypes && <Text dimColor>({nt.acceptedMimeTypes.join(", ")})</Text>}
          </Box>
        ))}
      </Box>

      <Text bold color="cyan">\n🎨 Supported Color Presets</Text>
      <Box gap={3}>
        {colors.map((c) => (
          <Text key={c.name} color={c.name === "sun" ? "yellow" : c.name === "mint" ? "green" : c.name === "sky" ? "blue" : c.name === "coral" ? "red" : "white"}>
            ● {c.name} ({c.label})
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export async function runNodeTypes(options: { json?: boolean }) {
  const { waitUntilExit } = render(<NodeTypesApp json={options.json} />);
  await waitUntilExit();
}
