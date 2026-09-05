import test from "node:test";
import assert from "node:assert/strict";
import { readCanvasSpec } from "./spec.js";

test("rejects duplicate explicit node IDs in canvas specs", () => {
  assert.throws(
    () => readCanvasSpec(JSON.stringify({ nodes: [{ id: "edge-us", type: "relationship" }, { id: "edge-us", type: "relationship" }] })),
    /Duplicate node id.*edge-us/,
  );
});

test("allows nodes without IDs so the server can generate them", () => {
  assert.doesNotThrow(() => readCanvasSpec(JSON.stringify({ nodes: [{ type: "entity" }, { type: "entity" }] })));
});
