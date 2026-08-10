import { readConfig, getBaseUrl, getApiKey } from "../../config.js";
import { apiRequest } from "../../client.js";

export async function runContext(options: { json?: boolean }) {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const isAuthenticated = Boolean(apiKey);

  const capabilities = [
    {
      action: "batch_create",
      syntax: "tara canvas add-batch <project> --nodes '[{text, type, color}]'",
      description: "Create multiple visual nodes at once with automatic non-overlapping grid layout",
    },
    {
      action: "auto_arrange",
      syntax: "tara arrange <project> [--columns 3]",
      description: "Rearrange all existing canvas nodes into a clean grid without overlaps",
    },
    {
      action: "inspect_nodes",
      syntax: "tara nodes <project> [--json]",
      description: "List all nodes on canvas with coordinates, sizes, types, colors, and content",
    },
    {
      action: "update_node",
      syntax: "tara canvas update-node <project> <nodeId> [--text] [--x] [--y] [--color]",
      description: "Move, resize, edit text, or restyle a specific node on canvas",
    },
    {
      action: "upload_asset",
      syntax: "tara upload <project> <filePath>",
      description: "Upload local file (Image, Dataset CSV/SQLite, 3D GLB Model, PDF Document) & place visual node",
    },
    {
      action: "render_chart",
      syntax: "tara chart <project> -t <title> -d '[{name, value}]' [--type bar|line|pie]",
      description: "Create structured visual chart node on canvas",
    },
    {
      action: "render_map",
      syntax: "tara map <project> -t <title> [--lat] [--lng] [--zoom]",
      description: "Create interactive geospatial map node on canvas",
    },
  ];

  const nodeTypes = [
    { type: "text", label: "Text", defaultSize: "280x100px", capabilities: "editable, resizable" },
    { type: "note", label: "Note", defaultSize: "280x180px", capabilities: "editable, resizable (default yellow 'sun')" },
    { type: "goal", label: "Goal", defaultSize: "320x190px", capabilities: "editable, resizable, computable" },
    { type: "image", label: "Image", defaultSize: "420x300px", capabilities: "resizable, computable (image/*)" },
    { type: "video", label: "Video", defaultSize: "480x300px", capabilities: "resizable, playable (video/*)" },
    { type: "document", label: "Document", defaultSize: "420x560px", capabilities: "resizable, computable (PDF, text)" },
    { type: "html", label: "HTML", defaultSize: "640x420px", capabilities: "resizable, sandboxed" },
    { type: "chart", label: "Chart", defaultSize: "520x340px", capabilities: "resizable, computable (bar, line, pie)" },
    { type: "map", label: "Map", defaultSize: "560x380px", capabilities: "resizable, computable (lat/lng)" },
    { type: "model3d", label: "3D model", defaultSize: "520x420px", capabilities: "resizable, playable (gltf-binary)" },
    { type: "compute", label: "Query", defaultSize: "432x260px", capabilities: "resizable, computable" },
  ];

  const colors = ["paper (White)", "sun (Yellow)", "mint (Green)", "sky (Blue)", "coral (Pink)"];

  if (options.json) {
    process.stdout.write(
      JSON.stringify(
        {
          cli: "tara",
          version: "0.1.0",
          auth: { isAuthenticated, baseUrl },
          capabilities,
          nodeTypes,
          colors,
          agentInstructions:
            "AI Agents can execute tara CLI commands via standard shell execution tools (bash/run_command). Use 'tara list' to find projects, 'tara nodes <project>' to inspect nodes, 'tara canvas add-batch' to create multiple nodes, and 'tara arrange' to auto-layout the canvas.",
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(`
================================================================================
🤖 TARA CLI — AI AGENT CANVAS CONTEXT & CAPABILITIES MANIFEST
================================================================================

Server URL:        ${baseUrl}
Auth Status:       ${isAuthenticated ? "Authenticated" : "Not Logged In (run 'tara login')"}

--------------------------------------------------------------------------------
1. CANVAS CAPABILITIES & EXECUTABLE ACTIONS
--------------------------------------------------------------------------------
${capabilities
  .map(
    (c) =>
      `• Action: ${c.action}\n  Syntax:      ${c.syntax}\n  Description: ${c.description}\n`,
  )
  .join("\n")}

--------------------------------------------------------------------------------
2. SUPPORTED CANVAS NODE TYPES (13 TYPES)
--------------------------------------------------------------------------------
${nodeTypes.map((n) => `  - ${n.type.padEnd(12)} (${n.label.padEnd(10)}) Default: ${n.defaultSize.padEnd(12)} [${n.capabilities}]`).join("\n")}

Color Presets: ${colors.join(", ")}

--------------------------------------------------------------------------------
3. AGENT WORKFLOW CHEAT SHEET
--------------------------------------------------------------------------------
• List projects:       tara list
• Inspect canvas:      tara nodes "<projectName>" --json
• Add multiple nodes:  tara canvas add-batch "<projectName>" --nodes '[{"text":"Task 1","type":"goal"}]'
• Auto-grid layout:    tara arrange "<projectName>" --columns 3
• Upload file:         tara upload "<projectName>" ./file.png
• Move / Edit node:    tara canvas update-node "<projectName>" <nodeId> --text "New text" --x 200 --y 300
• Discover commands:   tara commands --json

================================================================================
`);
}
