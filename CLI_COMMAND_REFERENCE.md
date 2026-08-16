# Tara CLI Command Reference & Canvas Specification Guide

This reference documents the complete hierarchical command tree for `@tara/cli`. You can query this structure live in the terminal at any time using:

```bash
tara commands        # Human-readable tree view
tara commands --json # Machine-readable JSON tree
```

---

## 1. Hierarchy & Commands Overview

```
tara
├── commands [--json]                           # Discover all commands as JSON or tree
├── login [--url <url>]                         # Terminal API key login flow
│
├── projects                                    # Studio Project Management
│   ├── list (alias: ls)                       # List user projects
│   ├── create <name> [-d <description>]        # Create studio project
│   └── share <projectId> [--private]           # Public/private toggle & share link
│
└── canvas                                      # Visual Canvas & Node Control Suite
    ├── get <projectId> [--json] (alias: nodes) # List all nodes on canvas
    ├── position <projectId> <nodeId> [--json]  # Stable node coordinates and sector
    ├── distance <projectId> <from> <to>        # Distance and direction between nodes
    ├── nearby <projectId> --x --y --radius     # Find nodes near a world coordinate
    ├── area <projectId> --left --top --right --bottom # Find nodes in a world area
    ├── add-node <projectId> -t <text>          # Add single node (note, text, goal, etc.)
    ├── add-batch <projectId> -n <jsonArray>    # Batch create nodes with auto-grid
    ├── update-node <projectId> <nodeId>        # Move, resize, restyle, or edit node
    ├── remove-node <projectId> <nodeId>        # Delete single node
    ├── upload <projectId> <filePath>           # Upload asset & add visual canvas node
    ├── chart <projectId> -t <title> -d <data>  # Add structured visual chart node
    ├── map <projectId> -t <title>              # Add interactive map node
    ├── arrange <projectId> [-c <columns>]      # Auto-layout all nodes into clean grid
    ├── apply <projectId> <specOrFile>          # Declaratively set full canvas state
    └── clear <projectId>                       # Wipe all nodes from project
```

---

## 2. Command Details & Examples

### 🔐 Authentication

#### `tara login`
Authenticates the CLI using a Tara API Key (`tara_...`).
```bash
tara login
# Prompts for API key. Keys can be created at http://localhost:3000/settings/api-keys
```

---

### 📂 Projects Namespace (`tara projects`)

#### `tara projects list` (Aliases: `tara list`, `tara ls`)
Lists all studio projects owned by the user.
```bash
tara list
```

#### `tara projects create <name>` (Alias: `tara create <name>`)
Creates a new project canvas.
```bash
tara create "Neural Architecture Research" --description "Deep learning experiments"
```

#### `tara projects share <projectId>` (Alias: `tara share <projectId>`)
Toggles public sharing and outputs the shareable web URL.
```bash
tara share "Neural Architecture"
tara share "Neural Architecture" --private
```

---

### 🎨 Canvas Namespace (`tara canvas`)

#### `tara canvas get <projectId>` (Aliases: `tara nodes <projectId>`, `--json`)
Lists every node on the canvas with type, position, dimensions, color, and content preview.
```bash
# Terminal summary
tara nodes "Neural Architecture"

# Raw JSON output for script automation
tara canvas get "Neural Architecture" --json
```

#### `tara canvas position <projectId> <nodeId>` and `tara canvas distance <projectId> <fromNodeId> <toNodeId>`
Read stable coordinates or measure two nodes in world units. The distance command includes both coordinates, direction, nearest-edge distance, and an advisory layout signal; it does not create an ontology relationship.
```bash
tara canvas position "Neural Architecture" node_abc --json
tara canvas distance "Neural Architecture" node_abc node_xyz --json
```

#### `tara canvas add-node <projectId> -t <text>`
Adds a single node to the canvas.
```bash
tara canvas add-node "Neural Architecture" \
  -t "Transformer Attention Mechanisms" \
  --type note \
  --color sun \
  --x 100 --y 100
```
**Supported Node Types:** `text`, `note`, `goal`, `chart`, `map`, `compute`, `image`, `document`, `model3d`.  
**Color Presets:** `paper`, `sun`, `mint`, `sky`, `coral`.

#### `tara canvas add-batch <projectId> -n <jsonArray>`
Creates multiple nodes in one request. Automatically positions them in a clean grid flow.
```bash
tara canvas add-batch "Neural Architecture" --nodes '[
  {"text":"Step 1: Data Ingestion", "type":"goal", "color":"mint"},
  {"text":"Step 2: Model Training", "type":"goal", "color":"sky"},
  {"text":"Step 3: Evaluation", "type":"goal", "color":"coral"}
]' --layout grid
```

#### `tara arrange <projectId>` (Alias: `tara canvas arrange`)
Auto-rearranges all existing nodes on canvas into a clean $N$-column grid layout, calculating node heights and preventing overlaps.
```bash
tara arrange "Neural Architecture" --columns 3
```

#### `tara canvas update-node <projectId> <nodeId>`
Edits position, text, color, or dimensions of a specific node. Accepts node UUID or short prefix (e.g. `f7fb`).
```bash
tara canvas update-node "Neural Architecture" f7fb \
  --text "Updated Hyperparameters" \
  --x 250 --y 400 \
  --color sky
```

#### `tara canvas remove-node <projectId> <nodeId>`
Deletes a node from the canvas.
```bash
tara canvas remove-node "Neural Architecture" f7fb
```

#### `tara upload <projectId> <filePath>`
Uploads a local asset (image, dataset CSV/SQLite, GLB 3D model, PDF) and places a corresponding visual node on the canvas.
```bash
tara upload "Neural Architecture" ./architecture_diagram.png
tara upload "Neural Architecture" ./metrics.csv
```

#### `tara chart <projectId>`
Adds a visual chart node (bar, line, area, pie, scatter) with structured data.
```bash
tara chart "Neural Architecture" \
  -t "Model Performance (Accuracy %)" \
  -d '[{"name":"V1","value":82},{"name":"V2","value":94}]' \
  --type line
```

#### `tara map <projectId>`
Adds an interactive map node.
```bash
tara map "Neural Architecture" \
  -t "Research Hubs" \
  --lat 37.7749 --lng -122.4194 --zoom 12
```

#### `tara apply <projectId> <specOrFile>`
Declaratively replaces the canvas document state from a spec file or raw JSON.
```bash
tara apply "Neural Architecture" ./full-spec.json
```

#### `tara clear <projectId>`
Wipes all nodes from the canvas.
```bash
tara clear "Neural Architecture"
```

---

## 3. JSON Spec Format (`apply` & `add-batch`)

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "optional-uuid",
      "type": "note",
      "text": "Header / Content",
      "x": 100,
      "y": 100,
      "width": 280,
      "height": 180,
      "color": "sun"
    },
    {
      "type": "chart",
      "text": "Loss Curve",
      "data": {
        "title": "Loss Curve",
        "chartType": "line",
        "dataset": [
          { "epoch": 1, "loss": 0.8 },
          { "epoch": 2, "loss": 0.2 }
        ]
      }
    }
  ]
}
```
