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

const program = new Command();

program
  .name("tara")
  .description("Tara Workspace CLI — control your canvas and projects from the terminal")
  .version("0.1.0");

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
  .description("List all your projects (alias for tara projects list)")
  .action(async () => {
    await runProjectsList();
  });

program
  .command("create <name>")
  .description("Create a new project (alias for tara projects create)")
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
  .requiredOption("-d, --data <dataJson>", "JSON dataset array e.g. '[{\"label\":\"A\",\"value\":100}]'")
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
const canvas = program.command("canvas").description("Read and write the project canvas");

canvas
  .command("get <projectId>")
  .description("Get the canvas document for a project")
  .option("--json", "Output raw JSON (pipe-friendly)")
  .action(async (projectId: string, opts: { json?: boolean }) => {
    await runCanvasGet(projectId, opts);
  });

canvas
  .command("add-node <projectId>")
  .description("Add a node to the canvas")
  .requiredOption("-t, --text <text>", "Node text content")
  .option("--type <type>", "Node type (text, note, goal, image, chart, map, compute, model3d...)", "note")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 100)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 100)
  .option("--color <color>", "Node color (paper, sun, mint, sky, coral)")
  .action(async (projectId: string, opts) => {
    await runCanvasAddNode(projectId, opts);
  });

canvas
  .command("upload <projectId> <filePath>")
  .description("Upload an asset (image, dataset CSV, 3D GLB, document) and place on canvas")
  .option("--type <type>", "Node type override")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 200)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 200)
  .action(async (projectId: string, filePath: string, opts) => {
    await runUploadFile(projectId, filePath, opts);
  });

canvas
  .command("chart <projectId>")
  .description("Add a chart node")
  .requiredOption("-t, --title <title>", "Chart title")
  .requiredOption("-d, --data <dataJson>", "JSON dataset array")
  .option("--type <type>", "Chart type", "bar")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 160)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 160)
  .action(async (projectId: string, opts) => {
    await runAddChart(projectId, opts);
  });

canvas
  .command("map <projectId>")
  .description("Add a map node")
  .requiredOption("-t, --title <title>", "Map title")
  .option("--lat <lat>", "Latitude", parseFloat, 37.7749)
  .option("--lng <lng>", "Longitude", parseFloat, -122.4194)
  .option("--zoom <zoom>", "Map zoom level", parseInt, 4)
  .action(async (projectId: string, opts) => {
    await runAddMap(projectId, opts);
  });

program.parse();
