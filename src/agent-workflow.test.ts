import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseDraft } from "./agent-workflow.js";

test("draft rejects replacements and unstable create IDs", () => {
  const base = { version: 1, projectId: "p", baseUrl: "http://localhost", baseRevision: null, status: "draft" };
  assert.throws(() => parseDraft({ ...base, operations: [{ op: "replace", nodes: [] }] }), /replacement/);
  assert.throws(() => parseDraft({ ...base, operations: [{ op: "create", node: { type: "entity" } }] }), /stable IDs/);
});

test("binary supports current target, offline checkpoints, explicit commit and clean JSON exit", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "tara-agent-test-"));
  const binary = resolve("dist/index.js");
  const calls: string[] = [];
  let revision = "2026-09-05T00:00:00.000Z";
  const server = createServer(async (req, res) => {
    calls.push(`${req.method} ${req.url}`);
    let body = "";
    for await (const chunk of req) body += chunk;
    res.setHeader("Content-Type", "application/json");
    if (req.method === "POST") {
      if (JSON.parse(body).baseRevision !== revision) { res.statusCode = 409; res.end(JSON.stringify({ error: "Revision conflict" })); return; }
      revision = "2026-09-05T00:00:01.000Z";
    }
    res.end(JSON.stringify(req.method === "PATCH" ? { node: { id: "n", x: 1, y: 2 } } : { projectId: "p", revision, document: { version: 3, nodes: [], layers: [], timeline: {} }, camera: { x: 0, y: 0, zoom: 1 } }));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const port = (server.address() as { port: number }).port;
  const run = (...args: string[]) => promisify(execFile)(process.execPath, [binary, ...args], { cwd, timeout: 10000, env: { ...process.env, TARA_BASE_URL: `http://127.0.0.1:${port}`, TARA_API_KEY: "test-only" } });
  try {
    await run("use", "p");
    assert.equal(JSON.parse((await run("status")).stdout).projectId, "p");
    const count = calls.length;
    const manifest = JSON.parse((await run("commands", "--json")).stdout);
    assert.ok(manifest.commands.some((command: { name: string }) => command.name === "draft"));
    await run("agent");
    assert.equal(calls.length, count);
    await run("draft", "init", "@current", "task.json");
    assert.equal(calls.at(-1), "GET /api/studio/projects/p/canvas");
    const path = join(cwd, "task.json");
    const draft = JSON.parse(readFileSync(path, "utf8"));
    draft.operations = [{ op: "create", node: { id: "stable", type: "entity", text: "Test" } }];
    writeFileSync(path, JSON.stringify(draft));
    const beforePreview = calls.length;
    await run("draft", "preview", "task.json");
    assert.equal(calls.length, beforePreview);
    await run("draft", "commit", "task.json");
    assert.equal(calls.length, beforePreview + 1);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).status, "committed");
    await assert.rejects(run("draft", "commit", "task.json"));
    writeFileSync(path, JSON.stringify(draft));
    await assert.rejects(run("draft", "commit", "task.json"), (error: unknown) => (error as { code: number }).code === 4);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).status, "draft");
    const update = await run("canvas", "update-node", "@current", "n", "--text", "New", "--json");
    assert.equal(JSON.parse(update.stdout).node.id, "n");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    rmSync(cwd, { recursive: true, force: true });
  }
});
