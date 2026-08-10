export type CommandDef = {
  name: string;
  syntax: string;
  description: string;
  options?: Array<{ flag: string; description: string; required?: boolean }>;
  subcommands?: CommandDef[];
};

export const CLI_COMMAND_TREE: CommandDef[] = [
  {
    name: "auth",
    syntax: "tara login [--url <url>]",
    description: "Authenticate with your Tara API key",
    options: [{ flag: "--url <url>", description: "Tara server URL (default: http://localhost:3000)" }],
  },
  {
    name: "projects",
    syntax: "tara projects <subcommand> | tara list | tara create <name> | tara share <projectId>",
    description: "Project management commands",
    subcommands: [
      {
        name: "list",
        syntax: "tara projects list | tara list | tara ls",
        description: "List all studio projects for the authenticated user",
      },
      {
        name: "create",
        syntax: "tara projects create <name> | tara create <name>",
        description: "Create a new studio project",
        options: [{ flag: "-d, --description <desc>", description: "Optional project description" }],
      },
      {
        name: "share",
        syntax: "tara projects share <projectId> | tara share <projectId>",
        description: "Toggle project public visibility and output share URL",
        options: [{ flag: "--private", description: "Set project to private visibility" }],
      },
      {
        name: "demo",
        syntax: "tara demo [name] | tara init [name]",
        description: "Create a new project pre-populated with a Hello World note",
      },
    ],
  },
  {
    name: "canvas",
    syntax: "tara canvas <subcommand>",
    description: "Full programmatic canvas orchestration and node manipulation",
    subcommands: [
      {
        name: "get",
        syntax: "tara canvas get <projectId> | tara nodes <projectId>",
        description: "List all nodes on the project canvas with position, size, type, and text",
        options: [{ flag: "--json", description: "Output raw JSON representation of canvas document" }],
      },
      {
        name: "add-node",
        syntax: "tara canvas add-node <projectId> -t <text>",
        description: "Add a single node to the canvas",
        options: [
          { flag: "-t, --text <text>", description: "Node text content", required: true },
          { flag: "--type <type>", description: "Node type (text, note, goal, chart, map, compute, image...)", required: false },
          { flag: "--x <x>", description: "X coordinate on canvas" },
          { flag: "--y <y>", description: "Y coordinate on canvas" },
          { flag: "--color <color>", description: "Color preset (paper, sun, mint, sky, coral)" },
        ],
      },
      {
        name: "add-batch",
        syntax: "tara canvas add-batch <projectId> -n <jsonArray>",
        description: "Add multiple nodes at once with automatic non-overlapping grid/flow layout",
        options: [
          { flag: "-n, --nodes <jsonArray>", description: "JSON array of node objects", required: true },
          { flag: "--layout <layout>", description: "Layout strategy: grid, flow, or none (default: grid)" },
          { flag: "--x <startX>", description: "Starting X coordinate (default: 100)" },
          { flag: "--y <startY>", description: "Starting Y coordinate (default: 100)" },
        ],
      },
      {
        name: "arrange",
        syntax: "tara canvas arrange <projectId> | tara arrange <projectId>",
        description: "Auto-layout all existing nodes into a clean grid without overlaps",
        options: [{ flag: "-c, --columns <cols>", description: "Number of grid columns (default: 3)" }],
      },
      {
        name: "update-node",
        syntax: "tara canvas update-node <projectId> <nodeId>",
        description: "Update text, position, size, or color of a specific node",
        options: [
          { flag: "--text <text>", description: "New node text" },
          { flag: "--x <x>", description: "New X coordinate" },
          { flag: "--y <y>", description: "New Y coordinate" },
          { flag: "--width <w>", description: "New width in pixels" },
          { flag: "--height <h>", description: "New height in pixels" },
          { flag: "--color <color>", description: "New color preset" },
        ],
      },
      {
        name: "remove-node",
        syntax: "tara canvas remove-node <projectId> <nodeId>",
        description: "Delete a node from the canvas",
      },
      {
        name: "upload",
        syntax: "tara upload <projectId> <filePath>",
        description: "Upload local file (image, CSV/SQLite dataset, 3D GLB, PDF) and add visual node",
        options: [
          { flag: "--type <type>", description: "Override visual node type (image, compute, model3d, document)" },
          { flag: "--x <x>", description: "X coordinate" },
          { flag: "--y <y>", description: "Y coordinate" },
        ],
      },
      {
        name: "chart",
        syntax: "tara chart <projectId> -t <title> -d <dataJson>",
        description: "Add a structured visual chart node (bar, line, area, pie, scatter)",
        options: [
          { flag: "-t, --title <title>", description: "Chart title", required: true },
          { flag: "-d, --data <dataJson>", description: "Dataset JSON array", required: true },
          { flag: "--type <type>", description: "Chart variant (bar, line, area, pie, scatter)" },
        ],
      },
      {
        name: "map",
        syntax: "tara map <projectId> -t <title>",
        description: "Add an interactive geospatial map node",
        options: [
          { flag: "-t, --title <title>", description: "Map title", required: true },
          { flag: "--lat <lat>", description: "Center latitude" },
          { flag: "--lng <lng>", description: "Center longitude" },
          { flag: "--zoom <zoom>", description: "Zoom level (1-20)" },
        ],
      },
      {
        name: "apply",
        syntax: "tara apply <projectId> <specOrFile>",
        description: "Declaratively replace canvas state from a spec file or JSON string",
      },
      {
        name: "clear",
        syntax: "tara clear <projectId>",
        description: "Remove all nodes from project canvas",
      },
    ],
  },
];

export function runCommandsList(options: { json?: boolean }) {
  if (options.json) {
    process.stdout.write(JSON.stringify({ version: "0.1.0", commands: CLI_COMMAND_TREE }, null, 2) + "\n");
    return;
  }

  process.stdout.write("Tara CLI Command Hierarchy Reference\n====================================\n\n");
  for (const group of CLI_COMMAND_TREE) {
    process.stdout.write(`ROOT COMMAND: tara ${group.name}\n  ${group.description}\n`);
    if (group.subcommands) {
      for (const sub of group.subcommands) {
        process.stdout.write(`  ├── tara ${group.name} ${sub.name}\n`);
        process.stdout.write(`  │   Syntax: ${sub.syntax}\n`);
        process.stdout.write(`  │   ${sub.description}\n`);
        if (sub.options && sub.options.length > 0) {
          process.stdout.write(`  │   Options:\n`);
          for (const opt of sub.options) {
            process.stdout.write(`  │     ${opt.flag.padEnd(28)} - ${opt.description}\n`);
          }
        }
        process.stdout.write(`  │\n`);
      }
    }
    process.stdout.write("\n");
  }
}
