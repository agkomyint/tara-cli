# Agent workflow

Run `tara agent` for an offline operating contract and `tara commands --json` for the command tree generated from the installed binary. Each command also supports `--help`. Use `--json` when a command offers it; the new `agent`, `use`, `status`, and `draft` commands always return JSON.

## Target an existing project

```sh
tara use 62294c75-dd62-4592-a77c-4492f622214a
tara status
tara canvas get @current --json
```

`use` performs one read to resolve the project and stores its canonical ID and server in `.tara-project.json` in the current directory. `status` performs no network requests. Keep the working directory consistent across agent turns. The CLI cannot infer the current browser tab. Bind explicitly. Switching servers invalidates the saved target.

## Work locally, then save

```sh
tara draft init @current ai-industry.json
tara draft preview ai-industry.json
# Only when saving is authorized:
tara draft commit ai-industry.json
```

Initialization reads the canvas once and writes two local files: an editable operation draft and a `.snapshot.json` containing the original canvas. Existing files are not overwritten. Edit `operations` locally, including positions and source attributes. Preview makes no network requests and checks the envelope and basic operation structure; it does not replace the server's full schema validation. Commit submits one transaction with the captured revision and marks the local file committed after success. It never silently rebases or repeats a successful commit.

Example operation for an existing node:

```json
{"op":"update","nodeId":"amd","updates":{"x":600,"y":400},"dataPatch":{"entityType":"company"}}
```

Example new connection (its endpoints must already exist or be created in the same batch):

```json
{"op":"create","node":{"id":"edge-example","type":"relationship","text":"Develops","x":450,"y":250,"data":{"sourceNodeId":"company-example","targetNodeId":"model-example","relationshipType":"develops","attributes":{"source":"https://example.com/evidence"}}}}
```

Supported operations: `create`, `update`, `delete`, `create-layer`, `update-layer`, `delete-layer`, `update-timeline`. Full replacement is excluded. The separate `apply` command replaces all nodes and clears timeline tracks; avoid it for incremental work.

## Resume and recover

- Hand the next agent the working directory, draft path, and research notes. Do not put credentials in those files.
- Inspect the snapshot for IDs and existing layers before generating new nodes. Use stable, unique IDs and explicit entity types such as `company`, `product`, `system`, and `process`. The CLI rejects duplicate explicit IDs in specs, batches, and draft creates before writing.
- Add animation keyframes locally with `tara draft keyframe <file> <nodeId> <x|y|opacity|scale> <timeMs> <value>`, then run `tara draft preview` and commit when ready.
- A revision conflict exits with code 4 and leaves the draft intact. Read the latest canvas once, compare changes, and prepare a new draft with reviewed operations. Never blindly replace the revision token.
- If the commit response is lost, inspect the server before retrying. A successful write followed by a local file failure is possible; the old revision protects against blind replay.
- Drafts are separate from unsaved browser edits. The CLI cannot see browser memory. Coordinate ownership of the project before committing.
- Regular mutation commands still save immediately. Draft files do not change the browser canvas until committed; offline preview is textual, not a browser import.
- Avoid `watch` and repeated polling when database traffic matters. Lay out nodes and relationship labels locally; `layout-ontology` is a separate remote write.

Exit codes: 0 success, 1 local/unexpected error, 2 invalid API request, 3 authentication/permission, 4 revision conflict, 5 network/server/rate limit. JSON errors are not yet uniform across legacy commands; read stderr and the exit code.

## Development

```sh
bun run build
bun test src/agent-workflow.test.ts
```

Tests use a local mock server and temporary files, never a real account. The build uses strict TypeScript. Some legacy interactive commands still use Ink; prefer the JSON inspection commands and draft path for unattended work.
