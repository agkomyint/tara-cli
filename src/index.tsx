#!/usr/bin/env node
import { Command } from "commander";
import { runLogin } from "./commands/auth/login.js";
import { runProjectsList } from "./commands/projects/list.js";
import { runProjectsCreate } from "./commands/projects/create.js";
import { runProjectsShare } from "./commands/projects/share.js";
import { runInitDemo } from "./commands/projects/init-demo.js";
import { runCanvasGet } from "./commands/canvas/get.js";
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

const program = new Command();

program
  .name("tara")
  .description("Tara Workspace CLI — complete canvas and project control from your terminal")
  .version("0.1.0");

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
  .description("List all 13 supported canvas node types, default dimensions, capabilities, and color presets")
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
  .action(async () => {
    await runProjectsList();
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
  .action(async (name: string, opts: { description?: string }) => {
    await runProjectsCreate(name, opts.description);
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
  .description("Declaratively apply a canvas specification file or JSON string")
  .action(async (projectId: string, specOrFile: string) => {
    await runCanvasApply(projectId, specOrFile);
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
  .action(async () => {
    await runProjectsList();
  });

projects
  .command("create <name>")
  .description("Create a new project")
  .option("-d, --description <desc>", "Project description")
  .action(async (name: string, opts: { description?: string }) => {
    await runProjectsCreate(name, opts.description);
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

canvas
  .command("node-types")
  .description("List all 13 supported canvas node types, default dimensions, capabilities, and color presets")
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
  .command("add-node <projectId>")
  .description("Add a single node to canvas")
  .requiredOption("-t, --text <text>", "Node text content")
  .option("--type <type>", "Node type (text, note, goal, image, chart, map, compute, model3d...)", "note")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 100)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 100)
  .option("--color <color>", "Node color (paper, sun, mint, sky, coral)")
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
  .command("update-node <projectId> <nodeId>")
  .description("Update or move a node on canvas")
  .option("--text <text>", "Updated text")
  .option("--x <x>", "X position", (v) => parseInt(v, 10))
  .option("--y <y>", "Y position", (v) => parseInt(v, 10))
  .option("--width <width>", "Width", (v) => parseInt(v, 10))
  .option("--height <height>", "Height", (v) => parseInt(v, 10))
  .option("--color <color>", "Node color")
  .action(async (projectId: string, nodeId: string, opts) => {
    await runCanvasUpdateNode(projectId, nodeId, opts);
  });

canvas
  .command("remove-node <projectId> <nodeId>")
  .description("Delete a node from canvas")
  .action(async (projectId: string, nodeId: string) => {
    await runCanvasRemoveNode(projectId, nodeId);
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
  .description("Apply a full canvas spec (JSON file or string)")
  .action(async (projectId: string, specOrFile: string) => {
    await runCanvasApply(projectId, specOrFile);
  });

canvas
  .command("clear <projectId>")
  .description("Clear all nodes from canvas")
  .action(async (projectId: string) => {
    await runCanvasClear(projectId);
  });

program.parse();
