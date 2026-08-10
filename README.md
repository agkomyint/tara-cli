# Tara CLI

Terminal interface for [Tara Workspace](https://taraspace.space) — control your canvas and projects from the terminal or use it in agent scripts.

## Installation

**For local development (use `tara` from anywhere on this machine):**

```bash
cd D:\tara-work-cli
npm install
npm run build
npm link        # registers `tara` globally — re-run this after re-cloning
```

**From npm (once published):**

```bash
npm install -g @tara/cli
```

Or use without installing:

```bash
npx @tara/cli login
```

## Setup

**1. Generate an API key** — go to your Tara workspace at `/settings/api-keys`, create a key, and copy it (shown once).

**2. Log in:**

```bash
tara login
# Paste your API key when prompted
# Config saved to ~/.tara/config.json
```

By default the CLI talks to `http://localhost:3000`. Point it at production:

```bash
tara login --url https://taraspace.space
```

## Commands

### Auth
```bash
tara login [--url <url>]       # Authenticate with an API key
```

### Projects
```bash
tara projects list             # List all your projects
tara projects create <name>    # Create a new project
  -d, --description <desc>
```

### Canvas
```bash
tara canvas get <projectId>          # View canvas nodes
tara canvas get <projectId> --json   # Output raw JSON (pipe-friendly)
tara canvas add-node <projectId>     # Add a node to the canvas
  -t, --text <text>                  # (required) Node text
  --type <type>                      # note | text | goal | chart | map | compute (default: note)
  --x <x>                            # X position (default: 100)
  --y <y>                            # Y position (default: 100)
  --color <color>                    # paper | sun | mint | sky | coral
```

## Pipe-friendly usage (for agents)

```bash
# Read canvas as JSON and pipe into jq
tara canvas get <projectId> --json | jq '.nodes[] | select(.type == "goal")'

# Add a node from a script
tara canvas add-node <projectId> --text "Ship v2" --type goal --x 200 --y 300
```

## Config

Config is stored at `~/.tara/config.json`:

```json
{
  "apiKey": "tara_...",
  "baseUrl": "https://taraspace.space"
}
```

## Development

```bash
npm install
npm run build        # compile TypeScript → dist/
npm run dev          # watch mode
node dist/index.js --help
```

## Publishing

```bash
npm publish --access public
```
