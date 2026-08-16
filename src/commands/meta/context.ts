import { getBaseUrl, getApiKey } from "../../config.js";
import { apiRequest } from "../../client.js";
import type { NodeRegistryResponse } from "../../contracts.js";

type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  updatedAt: string;
  tags: string[];
};

type CanvasResponse = {
  projectId: string;
  document: { version: number; nodes: unknown[] };
  camera: unknown;
};

export async function runContext(projectRef: string | undefined, options: { json?: boolean }) {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const isAuthenticated = Boolean(apiKey);

  const capabilities = [
    {
      action: "create_tagged_project",
      syntax: "tara projects create <name> --tags <tag1,tag2>",
      description: "Create a project with normalized discovery tags that appear in Explore",
    },
    {
      action: "update_project_tags",
      syntax: "tara projects update <project> --tags <tag1,tag2> [--json]",
      description: "Replace a project's tags; pass an empty value to clear them",
    },
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
      action: "inspect_node",
      syntax: "tara canvas get-node <project> <nodeId> [--json]",
      description: "Fetch one node by full ID or an unambiguous ID prefix",
    },
    {
      action: "inspect_position",
      syntax: "tara canvas position <project> <nodeId> [--json]",
      description: "Read a node's stable world position, center, dimensions, and sector",
    },
    {
      action: "measure_distance",
      syntax: "tara canvas distance <project> <fromNodeId> <toNodeId> [--json]",
      description: "Measure center distance, direction, and an advisory layout signal between nodes; this does not create an ontology relationship",
    },
    {
      action: "find_nearby_nodes",
      syntax: "tara canvas nearby <project> --x <x> --y <y> --radius <worldUnits> [--json]",
      description: "Find nearby nodes using authoritative world coordinates",
    },
    {
      action: "update_node",
      syntax: "tara canvas update-node <project> <nodeId> [--text] [--attributes <json>] [--entity-type <type>] [--json]",
      description: "Edit one node's presentation, ontology fields, source link, status, or structured data",
    },
    {
      action: "connect_entities",
      syntax: "tara canvas connect <project> <sourceId> <targetId> --relationship <type>",
      description: "Create one typed directional relationship with optional provenance and visual style",
    },
    {
      action: "delete_node",
      syntax: "tara canvas remove-node <project> <nodeId> [--keep-relationships] [--json]",
      description: "Delete one node; connected relationships are removed by default to preserve graph integrity",
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
      syntax: "tara map <project> -t <title> -d '[...]' --location-key <key> --value-key <key> [--region europe|africa|etc]",
      description: "Create interactive geospatial map node on canvas, supports region zooming",
    },
    {
      action: "add_source",
      syntax: "tara canvas add-node <project> --type embed --source-url <url> -d '{\"kind\":\"source\",\"host\":\"...\"}'",
      description: "Add a citation or source reference to the canvas project sidebar",
    },
  ];

  if (projectRef) {
    try {
      const [canvas, projectData, registry] = await Promise.all([
        apiRequest<CanvasResponse>(`/api/studio/projects/${encodeURIComponent(projectRef)}/canvas`),
        apiRequest<{ projects: ProjectSummary[] }>("/api/studio/projects"),
        apiRequest<NodeRegistryResponse>("/api/studio/canvas/node-types"),
      ]);
      const project = projectData.projects.find((candidate) => candidate.id === canvas.projectId);
      const context = {
        project: project ?? { id: canvas.projectId, name: projectRef },
        canvas: {
          nodeCount: canvas.document.nodes.length,
          document: canvas.document,
          camera: canvas.camera,
        },
        registry,
        commands: {
          inspect: `tara canvas get ${canvas.projectId} --json`,
          addNode: `tara canvas add-node ${canvas.projectId} --text <text>`,
          addBatch: `tara canvas add-batch ${canvas.projectId} --nodes <json>`,
          inspectNode: `tara canvas get-node ${canvas.projectId} <nodeId> --json`,
          inspectPosition: `tara canvas position ${canvas.projectId} <nodeId> --json`,
          measureDistance: `tara canvas distance ${canvas.projectId} <fromNodeId> <toNodeId> --json`,
          updateTags: `tara projects update ${canvas.projectId} --tags <tag1,tag2> --json`,
          addEntity: `tara canvas add-entity ${canvas.projectId} <name> --entity-type <type> --id <stableId> --json`,
          connect: `tara canvas connect ${canvas.projectId} <sourceId> <targetId> --relationship <type> --json`,
        },
      };

      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: true, data: context, warnings: [] }, null, 2) + "\n");
      } else {
        process.stdout.write(
          `Project: ${project?.name ?? projectRef}\nProject ID: ${canvas.projectId}\nTags: ${project?.tags.join(", ") || "none"}\nCanvas nodes: ${canvas.document.nodes.length}\nUpdated: ${project?.updatedAt ?? "unknown"}\n`,
        );
      }
    } catch (error) {
      if (options.json) {
        process.stdout.write(
          JSON.stringify({ ok: false, error: { code: "CONTEXT_FAILED", message: String(error) }, warnings: [] }, null, 2) + "\n",
        );
      } else {
        process.stderr.write(`Unable to load project context: ${String(error)}\n`);
      }
    }
    return;
  }

  const registry = isAuthenticated ? await apiRequest<NodeRegistryResponse>("/api/studio/canvas/node-types") : null;
  const nodeTypes = registry?.nodeTypes ?? [];
  const colors = registry?.colors.map((color) => `${color.name} (${color.label})`) ?? [];

  if (options.json) {
    process.stdout.write(
      JSON.stringify(
        {
          cli: "tara",
          version: "0.1.0",
          auth: { isAuthenticated, baseUrl },
          capabilities,
          registry,
          colors,
          agentInstructions:
            "AI Agents can execute tara CLI commands via standard shell tools. Create discoverable work with 'tara projects create <name> --tags tag1,tag2' and update it with 'tara projects update <project> --tags tag1,tag2 --json'. Use 'tara list --json', 'tara nodes <project> --json', 'tara canvas position <project> <nodeId> --json', and 'tara canvas distance <project> <fromNodeId> <toNodeId> --json' to inspect state. Distance is an advisory spatial signal, never an implied ontology fact. Use stable IDs for add-entity/connect, update individual entity attributes with update-node --attributes, preview full replacements with diff or apply --dry-run, and add citations as source embeds.",
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
2. SUPPORTED CANVAS NODE TYPES (${nodeTypes.length} TYPES FROM LIVE API)
--------------------------------------------------------------------------------
${nodeTypes.length ? nodeTypes.map((nodeType) => `  - ${nodeType.type.padEnd(12)} (${nodeType.label.padEnd(10)}) Default: ${`${nodeType.defaultSize.width}x${nodeType.defaultSize.height}px`.padEnd(12)} [${nodeType.capabilities.join(", ")}] · ${nodeType.renderer}`).join("\n") : "  Authenticate to discover the live node registry."}

Color Presets: ${colors.join(", ")}

--------------------------------------------------------------------------------
3. AGENT WORKFLOW CHEAT SHEET
--------------------------------------------------------------------------------
• List projects:       tara list
• Create with tags:    tara projects create "Climate atlas" --tags climate,maps,mekong
• Update tags:         tara projects update "Climate atlas" --tags climate,forests --json
• Inspect canvas:      tara nodes "<projectName>" --json
• Add multiple nodes:  tara canvas add-batch "<projectName>" --nodes '[{"text":"Task 1","type":"goal"}]'
• Auto-grid layout:    tara arrange "<projectName>" --columns 3
• Upload file:         tara upload "<projectName>" ./file.png
• Move / Edit node:    tara canvas update-node "<projectName>" <nodeId> --text "New text" --x 200
• Inspect one node:     tara canvas get-node "<projectName>" <nodeId> --json
• Inspect position:     tara canvas position "<projectName>" <nodeId> --json
• Measure distance:     tara canvas distance "<projectName>" <fromNodeId> <toNodeId> --json
• Find nearby nodes:    tara canvas nearby "<projectName>" --x 0 --y 0 --radius 500 --json
• Edit entity fields:   tara canvas update-node "<projectName>" <nodeId> --entity-type hospital --attributes '{"status":"open"}' --json
• Connect entities:     tara canvas connect "<projectName>" <sourceId> <targetId> --relationship serves --json
• Safe node deletion:   tara canvas remove-node "<projectName>" <nodeId> --json
• Update node data:    tara canvas update-node "<projectName>" <nodeId> -d '[{"country": "Mali", "temp": 35}]'
• Add a Source:        tara canvas add-node "<projectName>" --type embed --source-url "https://example.com" -d '{"kind":"source","host":"example.com"}'
• Discover commands:   tara commands --json

================================================================================
`);
}
