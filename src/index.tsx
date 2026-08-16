#!/usr/bin/env node
import { Command } from "commander";
import { runLogin } from "./commands/auth/login.js";
import { runProjectsList } from "./commands/projects/list.js";
import { runProjectsCreate } from "./commands/projects/create.js";
import { runProjectsUpdate } from "./commands/projects/update.js";
import { runProjectsShare } from "./commands/projects/share.js";
import { runInitDemo } from "./commands/projects/init-demo.js";
import { runCanvasGet } from "./commands/canvas/get.js";
import { runCanvasGetNode } from "./commands/canvas/get-node.js";
import { runCanvasAddNode } from "./commands/canvas/add-node.js";
import { runUploadFile } from "./commands/canvas/upload.js";
import { runAddChart } from "./commands/canvas/add-chart.js";
import { runAddMap } from "./commands/canvas/add-map.js";
import { runCanvasAddBatch } from "./commands/canvas/add-batch.js";
import { runCanvasArrange } from "./commands/canvas/arrange.js";
import { runCanvasUpdateNode } from "./commands/canvas/update-node.js";
import { runCanvasRemoveNode } from "./commands/canvas/remove-node.js";
import { runCanvasClear } from "./commands/canvas/clear.js";
import { runCanvasApply } from "./commands/canvas/apply.js";
import { runCommandsList } from "./commands/meta/commands-list.js";
import { runNodeTypes } from "./commands/canvas/node-types.js";
import { runContext } from "./commands/meta/context.js";
import { runCanvasValidate } from "./commands/canvas/validate.js";
import { runCanvasDiff } from "./commands/canvas/diff.js";
import { runCanvasWatch } from "./commands/canvas/watch.js";
import { runCanvasAddEntity } from "./commands/canvas/add-entity.js";
import { runCanvasConnect } from "./commands/canvas/connect.js";
import { runCanvasRelationships, runCanvasUpdateRelationship } from "./commands/canvas/relationships.js";
import { runCanvasLayoutOntology } from "./commands/canvas/layout-ontology.js";
import { runLiveAdd, runLiveRefresh } from "./commands/canvas/live.js";
import { runCanvasArea, runCanvasDistance, runCanvasNearby, runCanvasPosition } from "./commands/canvas/spatial.js";
import { markCommandFailure, TaraAPIError } from "./client.js";

for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE") process.exit(0);
    else process.exitCode = 1;
  });
}

const program = new Command();

program
  .name("tara")
  .description(
    "Tara Workspace CLI — complete canvas and project control from your terminal.\n\n🤖 AI Agents: Run `tara context` (or `tara context --json`) to self-discover full automation capabilities, supported node types, and syntax.",
  )
  .version("0.1.0");

// Context & Agent Guidance
program
  .command("context [project]")
  .alias("guide")
  .alias("info")
  .description("Output full AI agent context, canvas possibilities, node types, and executable action manifest")
  .option("--json", "Output machine-readable context block for LLM prompts")
  .action(async (project: string | undefined, opts: { json?: boolean }) => {
    await runContext(project, opts);
  });



// Command Discovery
program
  .command("commands")
  .description("List all available CLI commands in a structured root & 2nd-level hierarchy")
  .option("--json", "Output structured JSON command registry")
  .action((opts: { json?: boolean }) => {
    runCommandsList(opts);
  });

program
  .command("node-types")
  .alias("types")
  .description("Discover node types, defaults, renderer status, capabilities, and colors from the live Tara API")
  .option("--json", "Output machine-readable JSON array of node types")
  .action(async (opts: { json?: boolean }) => {
    await runNodeTypes(opts);
  });

// Auth
program
  .command("login")
  .description("Authenticate with your Tara API key")
  .option("--url <url>", "Tara server URL (default: http://localhost:3000)")
  .action(async (opts: { url?: string }) => {
    await runLogin(opts.url);
  });

// Top-level aliases for common actions
program
  .command("list")
  .alias("ls")
  .description("List all your projects")
  .option("--json", "Output a stable machine-readable response")
  .action(async (opts: { json?: boolean }) => {
    await runProjectsList(opts);
  });

program
  .command("nodes <projectId>")
  .description("List all canvas nodes for a project")
  .option("--json", "Output raw JSON (pipe-friendly)")
  .action(async (projectId: string, opts: { json?: boolean }) => {
    await runCanvasGet(projectId, opts);
  });

program
  .command("create <name>")
  .description("Create a new project")
  .option("-d, --description <desc>", "Project description")
  .option("--tags <tags>", "Comma-separated discovery tags")
  .action(async (name: string, opts: { description?: string; tags?: string }) => {
    await runProjectsCreate(name, opts);
  });

program
  .command("share <projectId>")
  .description("Share a project publicly and get its public URL")
  .option("--private", "Make project private instead of public")
  .action(async (projectId: string, opts: { private?: boolean }) => {
    await runProjectsShare(projectId, opts);
  });

program
  .command("demo [name]")
  .alias("init")
  .description("Create a new project pre-populated with a Hello World node")
  .action(async (name?: string) => {
    await runInitDemo(name);
  });

program
  .command("upload <projectId> <filePath>")
  .description("Upload an asset (image, dataset CSV/SQLite, 3D model GLB, or PDF) and create a visual node on canvas")
  .option("--type <type>", "Override node type (image, compute, model3d, document)")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 200)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 200)
  .action(async (projectId: string, filePath: string, opts) => {
    await runUploadFile(projectId, filePath, opts);
  });

program
  .command("maplibre <projectId> <geojsonPath>")
  .description("Upload GeoJSON and create a reusable WebGL map node")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 200)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 200)
  .action(async (projectId: string, geojsonPath: string, opts: { x?: number; y?: number }) => {
    await runUploadFile(projectId, geojsonPath, { type: "maplibre", ...opts });
  });

program
  .command("chart <projectId>")
  .description("Add a visual chart node (bar, line, area, pie, scatter) with structured data to canvas")
  .requiredOption("-t, --title <title>", "Chart title")
  .requiredOption("-d, --data <dataJson>", "JSON dataset array")
  .option("--type <type>", "Chart type (bar, line, area, pie, scatter)", "bar")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 160)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 160)
  .action(async (projectId: string, opts) => {
    await runAddChart(projectId, opts);
  });

program
  .command("map <projectId>")
  .description("Add an interactive map node to canvas")
  .requiredOption("-t, --title <title>", "Map title")
  .option("-d, --data <dataJson>", "JSON dataset array for map heatmap")
  .option("--location-key <locationKey>", "Key in data representing location (e.g., 'country')", "country")
  .option("--value-key <valueKey>", "Key in data representing the metric (e.g., 'value')", "value")
  .option("--gradient <colors>", "Comma-separated CSS colors for map heatmap gradient (e.g. '#3b82f6,#ef4444')")
  .option("--region <region>", "Map region to focus on (world, europe, asia, asean, africa, northAmerica, southAmerica, oceania, usa)")
  .option("--topology <topology>", "Map topology to use (world, usStates)", "world")
  .option("--lat <lat>", "Latitude", parseFloat, 37.7749)
  .option("--lng <lng>", "Longitude", parseFloat, -122.4194)
  .option("--zoom <zoom>", "Map zoom level", parseInt, 4)
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 180)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 180)
  .action(async (projectId: string, opts) => {
    await runAddMap(projectId, opts);
  });

program
  .command("arrange <projectId>")
  .description("Auto-layout all nodes on canvas into a clean grid")
  .option("-c, --columns <cols>", "Number of grid columns", (v) => parseInt(v, 10), 3)
  .action(async (projectId: string, opts: { columns?: number }) => {
    await runCanvasArrange(projectId, opts);
  });

program
  .command("apply <projectId> <specOrFile>")
  .description("Declaratively apply a canvas specification file, JSON string, or '-' for stdin")
  .option("--dry-run", "Validate and preview without saving")
  .option("--json", "Output the preview or result as JSON")
  .action(async (projectId: string, specOrFile: string, opts: { dryRun?: boolean; json?: boolean }) => {
    await runCanvasApply(projectId, specOrFile, opts);
  });

program
  .command("clear <projectId>")
  .description("Clear all nodes from project canvas")
  .action(async (projectId: string) => {
    await runCanvasClear(projectId);
  });

// Projects namespace
const projects = program.command("projects").description("Manage studio projects");

projects
  .command("list")
  .alias("ls")
  .description("List all your projects")
  .option("--json", "Output a stable machine-readable response")
  .action(async (opts: { json?: boolean }) => {
    await runProjectsList(opts);
  });

projects
  .command("create <name>")
  .description("Create a new project")
  .option("-d, --description <desc>", "Project description")
  .option("--tags <tags>", "Comma-separated discovery tags")
  .action(async (name: string, opts: { description?: string; tags?: string }) => {
    await runProjectsCreate(name, opts);
  });

projects
  .command("update <projectId>")
  .description("Update project metadata and discovery tags")
  .option("--name <name>", "Project name")
  .option("--description <description>", "Project description")
  .option("--tags <tags>", "Replace tags with a comma-separated list; use an empty value to clear")
  .option("--json", "Output the machine-readable response")
  .action(async (projectId: string, opts: { name?: string; description?: string; tags?: string; json?: boolean }) => {
    await runProjectsUpdate(projectId, opts);
  });

projects
  .command("share <projectId>")
  .description("Make a project public or private")
  .option("--private", "Make project private instead")
  .action(async (projectId: string, opts: { private?: boolean }) => {
    await runProjectsShare(projectId, opts);
  });

// Canvas namespace
const canvas = program.command("canvas").description("Read, write, layout, and control project canvas");

const live = program.command("live").description("Create and refresh secure server-side API data bindings");
live.command("add <projectId>").requiredOption("--title <title>").requiredOption("--url <url>").option("--selector <path>", "Dot selector such as $.current.temperature_2m", "$").option("--display <mode>", "metric, status, or json", "metric").option("--unit <unit>").option("--x <x>", "X position", (value) => parseInt(value, 10), 160).option("--y <y>", "Y position", (value) => parseInt(value, 10), 160).option("--id <id>", "Stable node ID").option("--refresh", "Fetch immediately after creation").action(runLiveAdd);
live.command("refresh <projectId> <nodeId>").description("Fetch, validate, select, and persist the latest value").action(runLiveRefresh);

canvas
  .command("node-types")
  .description("Discover node types, defaults, renderer status, capabilities, and colors from the live Tara API")
  .option("--json", "Output machine-readable JSON array of node types")
  .action(async (opts: { json?: boolean }) => {
    await runNodeTypes(opts);
  });

canvas
  .command("get <projectId>")
  .description("Get the canvas document for a project")
  .option("--json", "Output raw JSON (pipe-friendly)")
  .action(async (projectId: string, opts: { json?: boolean }) => {
    await runCanvasGet(projectId, opts);
  });

canvas
  .command("get-node <projectId> <nodeId>")
  .description("Get one canvas node by full ID or unambiguous ID prefix")
  .option("--json", "Output machine-readable node details")
  .action(async (projectId: string, nodeId: string, opts: { json?: boolean }) => {
    await runCanvasGetNode(projectId, nodeId, opts);
  });

canvas
  .command("position <projectId> <nodeId>")
  .description("Get a node's stable world coordinates, center, dimensions, and sector")
  .option("--json", "Output machine-readable geometry")
  .action(async (projectId: string, nodeId: string, opts: { json?: boolean }) => {
    await runCanvasPosition(projectId, nodeId, opts);
  });

canvas
  .command("distance <projectId> <fromNodeId> <toNodeId>")
  .description("Measure the world-space distance and direction between two canvas nodes")
  .option("--json", "Output machine-readable measurement")
  .action(async (projectId: string, fromNodeId: string, toNodeId: string, opts: { json?: boolean }) => {
    await runCanvasDistance(projectId, fromNodeId, toNodeId, opts);
  });

canvas
  .command("nearby <projectId>")
  .description("List nodes near a world coordinate, ordered by distance")
  .requiredOption("--x <x>", "World X coordinate", parseFloat)
  .requiredOption("--y <y>", "World Y coordinate", parseFloat)
  .requiredOption("--radius <radius>", "Search radius in world units", parseFloat)
  .option("--limit <limit>", "Maximum nodes to return", (value) => parseInt(value, 10), 30)
  .option("--json", "Output machine-readable results")
  .action(async (projectId: string, opts: { x: number; y: number; radius: number; limit?: number; json?: boolean }) => {
    await runCanvasNearby(projectId, opts);
  });

canvas
  .command("area <projectId>")
  .description("List nodes that intersect a world-coordinate rectangle")
  .requiredOption("--left <x>", "Left world X coordinate", parseFloat)
  .requiredOption("--top <y>", "Top world Y coordinate", parseFloat)
  .requiredOption("--right <x>", "Right world X coordinate", parseFloat)
  .requiredOption("--bottom <y>", "Bottom world Y coordinate", parseFloat)
  .option("--limit <limit>", "Maximum nodes to return", (value) => parseInt(value, 10), 30)
  .option("--json", "Output machine-readable results")
  .action(async (projectId: string, opts: { left: number; top: number; right: number; bottom: number; limit?: number; json?: boolean }) => {
    await runCanvasArea(projectId, opts);
  });

canvas
  .command("add-node <projectId>")
  .description("Add a single node to canvas")
  .requiredOption("-t, --text <text>", "Node text content")
  .option("--type <type>", "Node type (text, note, goal, image, chart, map, compute, model3d...)", "note")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 100)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 100)
  .option("--color <color>", "Node color (paper, sun, mint, sky, coral)")
  .option("--source-url <url>", "Source URL for embed nodes")
  .option("-d, --data <dataJson>", "JSON data block")
  .option("--data-file <path>", "Read the JSON data block from a file")
  .option("--data-stdin", "Read the JSON data block from standard input")
  .option("--idempotency-key <key>", "Stable retry key; the server reuses it as the node ID")
  .action(async (projectId: string, opts) => {
    await runCanvasAddNode(projectId, opts);
  });

canvas
  .command("add-batch <projectId>")
  .description("Add multiple nodes at once with automatic grid/flow positioning")
  .requiredOption("-n, --nodes <jsonArray>", "JSON array of nodes")
  .option("--layout <layout>", "Layout mode (grid, flow, none)", "grid")
  .action(async (projectId: string, opts) => {
    await runCanvasAddBatch(projectId, opts);
  });

canvas
  .command("add-entity <projectId> <name>")
  .description("Add a typed entity to an ontology canvas")
  .requiredOption("--entity-type <type>", "Entity category, such as person, company, student, or organization")
  .option("--attributes <json>", "Entity attributes as a JSON object")
  .option("--external-id <id>", "Stable identifier from a source system")
  .option("--status <status>", "Entity status")
  .option("--x <x>", "X position", (value) => parseInt(value, 10))
  .option("--y <y>", "Y position", (value) => parseInt(value, 10))
  .option("--color <color>", "Canvas color", "paper")
  .option("--id <id>", "Stable canvas node ID")
  .option("--json", "Output machine-readable JSON")
  .action(async (projectId: string, name: string, opts) => {
    await runCanvasAddEntity(projectId, name, opts);
  });

canvas
  .command("connect <projectId> <sourceNodeId> <targetNodeId>")
  .description("Connect two entities with a typed directional relationship")
  .requiredOption("--relationship <type>", "Relationship predicate, such as works_at or owns")
  .option("--label <label>", "Human-readable relationship label")
  .option("--attributes <json>", "Relationship attributes as a JSON object")
  .option("--x <x>", "X position", (value) => parseInt(value, 10))
  .option("--y <y>", "Y position", (value) => parseInt(value, 10))
  .option("--id <id>", "Stable relationship node ID")
  .option("--color <hex>", "Edge color as a six-digit hex value")
  .option("--line-style <style>", "Line style: solid, dashed, or dotted")
  .option("--arrow-style <style>", "Target marker: arrow, dot, diamond, or none")
  .option("--animated", "Animate directional flow along the edge")
  .option("--json", "Output machine-readable JSON")
  .action(async (projectId: string, sourceNodeId: string, targetNodeId: string, opts) => {
    await runCanvasConnect(projectId, sourceNodeId, targetNodeId, opts);
  });

canvas
  .command("update-node <projectId> <nodeId>")
  .description("Update or move a node on canvas")
  .option("--text <text>", "Updated text")
  .option("--type <type>", "Change the canvas node type")
  .option("--x <x>", "X position", (v) => parseInt(v, 10))
  .option("--y <y>", "Y position", (v) => parseInt(v, 10))
  .option("--width <width>", "Width", (v) => parseInt(v, 10))
  .option("--height <height>", "Height", (v) => parseInt(v, 10))
  .option("--color <color>", "Node color")
  .option("--gradient <colors>", "Update the gradient color scale")
  .option("--region <region>", "Update the map region focus (or 'auto')")
  .option("--location-key <key>", "Row field used to join map data")
  .option("--value-key <key>", "Numeric row field used to color the map")
  .option("--feature-key <key>", "GeoJSON feature property used to join rows")
  .option("--source-url <url>", "Replace the node source URL")
  .option("--source-dataset-id <id>", "Link the node to a dataset node")
  .option("--entity-type <type>", "Update an ontology entity category")
  .option("--attributes <json>", "Replace ontology entity attributes with a JSON object")
  .option("--external-id <id>", "Update an ontology entity external ID")
  .option("--status <status>", "Update entity or goal status")
  .option("--remove-data <keys...>", "Remove one or more top-level node data fields")
  .option("-d, --data <dataJson>", "Replace the node's data rows with a new JSON array")
  .option("--data-file <path>", "Read replacement data rows from a JSON file")
  .option("--data-stdin", "Read replacement data rows from standard input")
  .option("--json", "Output the updated node as JSON")
  .action(async (projectId: string, nodeId: string, opts) => {
    await runCanvasUpdateNode(projectId, nodeId, opts);
  });

canvas
  .command("relationships <projectId>")
  .description("List ontology relationships and their visual styles")
  .option("--json", "Output machine-readable JSON")
  .action(async (projectId: string, opts: { json?: boolean }) => {
    await runCanvasRelationships(projectId, opts);
  });

canvas
  .command("layout-ontology <projectId>")
  .description("Organize a dense ontology using a layered directed-graph layout")
  .option("--direction <direction>", "Layout direction: left-right or top-down", "left-right")
  .option("--rank-gap <px>", "Space between hierarchy ranks", (value) => parseInt(value, 10), 180)
  .option("--node-gap <px>", "Space between peers in a rank", (value) => parseInt(value, 10), 96)
  .option("--dry-run", "Preview without saving")
  .option("--json", "Output machine-readable JSON")
  .action(async (projectId: string, opts) => {
    await runCanvasLayoutOntology(projectId, opts);
  });

canvas
  .command("update-relationship <projectId> <relationshipId>")
  .description("Update one relationship predicate, endpoints, routing, or visual style")
  .option("--relationship <type>", "Predicate type, such as occupation, part_of, leads, or works_at")
  .option("--label <label>", "Human-readable predicate label")
  .option("--source <nodeId>", "Replace the source entity")
  .option("--target <nodeId>", "Replace the target entity")
  .option("--attributes <json>", "Relationship attributes as a JSON object")
  .option("--color <hex>", "Edge color as a six-digit hex value")
  .option("--line-style <style>", "Line style: solid, dashed, or dotted")
  .option("--arrow-style <style>", "Target marker: arrow, dot, diamond, or none")
  .option("--flow <mode>", "Directional animation: on or off")
  .option("--x <x>", "Predicate label and routing waypoint X", (value) => parseInt(value, 10))
  .option("--y <y>", "Predicate label and routing waypoint Y", (value) => parseInt(value, 10))
  .option("--json", "Output machine-readable JSON")
  .action(async (projectId: string, relationshipId: string, opts) => {
    await runCanvasUpdateRelationship(projectId, relationshipId, opts);
  });

canvas
  .command("remove-node <projectId> <nodeId>")
  .description("Delete a node and its connected relationships from canvas")
  .option("--keep-relationships", "Delete only the node and leave connected relationship nodes")
  .option("--json", "Output removed node IDs as JSON")
  .action(async (projectId: string, nodeId: string, opts: { keepRelationships?: boolean; json?: boolean }) => {
    await runCanvasRemoveNode(projectId, nodeId, opts);
  });

canvas
  .command("arrange <projectId>")
  .description("Auto-layout all nodes into a grid")
  .option("-c, --columns <cols>", "Columns", (v) => parseInt(v, 10), 3)
  .action(async (projectId: string, opts) => {
    await runCanvasArrange(projectId, opts);
  });

canvas
  .command("apply <projectId> <specOrFile>")
  .description("Apply a full canvas spec (JSON file, string, or '-' for stdin)")
  .option("--dry-run", "Validate and preview without saving")
  .option("--json", "Output the preview or result as JSON")
  .action(async (projectId: string, specOrFile: string, opts: { dryRun?: boolean; json?: boolean }) => {
    await runCanvasApply(projectId, specOrFile, opts);
  });

canvas
  .command("validate <specOrFile>")
  .description("Validate a canvas spec against the live Tara node contract")
  .option("--json", "Output machine-readable validation results")
  .action(async (specOrFile: string, opts: { json?: boolean }) => {
    await runCanvasValidate(specOrFile, opts);
  });

canvas
  .command("diff <projectId> <specOrFile>")
  .description("Preview the node-level difference between a project and a canvas spec")
  .option("--json", "Output machine-readable diff results")
  .action(async (projectId: string, specOrFile: string, opts: { json?: boolean }) => {
    await runCanvasDiff(projectId, specOrFile, opts);
  });

canvas
  .command("watch <projectId>")
  .description("Watch canvas revisions and stream change events")
  .option("--json", "Output newline-delimited JSON events")
  .option("--interval <ms>", "Polling interval in milliseconds", (value) => parseInt(value, 10), 1_000)
  .action(async (projectId: string, opts: { json?: boolean; interval?: number }) => {
    await runCanvasWatch(projectId, opts);
  });

canvas
  .command("clear <projectId>")
  .description("Clear all nodes from canvas")
  .action(async (projectId: string) => {
    await runCanvasClear(projectId);
  });

try {
  await program.parseAsync();
} catch (error) {
  markCommandFailure(error);
  process.stderr.write(`tara: ${error instanceof TaraAPIError || error instanceof Error ? error.message : String(error)}\n`);
}
