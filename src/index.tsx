#!/usr/bin/env node
import { Command } from "commander";
import { runLogin } from "./commands/auth/login.js";
import { runProjectsList } from "./commands/projects/list.js";
import { runProjectsCreate } from "./commands/projects/create.js";
import { runCanvasGet } from "./commands/canvas/get.js";
import { runCanvasAddNode } from "./commands/canvas/add-node.js";

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

// Projects
const projects = program.command("projects").description("Manage studio projects");

projects
  .command("list")
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

// Canvas
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
  .option("--type <type>", "Node type (text, note, goal, chart...)", "note")
  .option("--x <x>", "X position", (v) => parseInt(v, 10), 100)
  .option("--y <y>", "Y position", (v) => parseInt(v, 10), 100)
  .option("--color <color>", "Node color (paper, sun, mint, sky, coral)")
  .action(async (projectId: string, opts) => {
    await runCanvasAddNode(projectId, opts);
  });

program.parse();
