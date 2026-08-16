import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { readFileSync, existsSync } from "fs";
import { basename, extname } from "path";
import { apiRequest, apiUpload, TaraAPIError } from "../../client.js";

type Props = {
  projectId: string;
  filePath: string;
  type?: string;
  x?: number;
  y?: number;
};

type UploadResult = {
  storageKey: string;
  publicUrl: string | null;
};

type CanvasNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: "paper" | "sun" | "mint" | "sky" | "coral";
  sourceUrl?: string;
  mimeType?: string;
  data?: Record<string, unknown>;
};

function UploadFileApp({ projectId, filePath, type: userType, x = 200, y = 200 }: Props) {
  const [state, setState] = useState<
    | { status: "loading"; message: string }
    | { status: "done"; nodeType: string; nodeId: string; url?: string }
    | { status: "error"; message: string }
  >({ status: "loading", message: "Preparing file upload..." });

  useEffect(() => {
    async function run() {
      try {
        if (!existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const fileName = basename(filePath);
        const ext = extname(filePath).toLowerCase();
        const fileBuffer = readFileSync(filePath);

        // Determine node type & upload endpoint based on file extension
        let uploadEndpoint = "/api/studio/projects/image-upload";
        let nodeType = userType || "image";
        let mimeType = "image/png";

        if (ext === ".csv" || ext === ".sqlite" || ext === ".sqlite3" || ext === ".db" || ext === ".geojson") {
          uploadEndpoint = "/api/studio/projects/dataset-upload";
          nodeType = userType || (ext === ".geojson" ? "maplibre" : "document");
          mimeType = ext === ".csv" ? "text/csv" : ext === ".geojson" ? "application/geo+json" : "application/x-sqlite3";
        } else if (ext === ".glb" || ext === ".gltf") {
          uploadEndpoint = "/api/studio/projects/model-upload";
          nodeType = userType || "model3d";
          mimeType = "model/gltf-binary";
        } else if (ext === ".mp4" || ext === ".webm" || ext === ".mov") {
          uploadEndpoint = "/api/studio/projects/asset-upload";
          nodeType = userType || "video";
          mimeType = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";
        } else if (ext === ".jpg" || ext === ".jpeg") {
          mimeType = "image/jpeg";
        } else if (ext === ".gif") {
          mimeType = "image/gif";
        } else if (ext === ".webp") {
          mimeType = "image/webp";
        } else if (ext === ".pdf") {
          uploadEndpoint = "/api/studio/projects/asset-upload";
          nodeType = userType || "document";
          mimeType = "application/pdf";
        }

        setState({ status: "loading", message: `Uploading ${fileName}...` });

        // 1. Create FormData & Upload
        const fileBlob = new Blob([fileBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", fileBlob, fileName);

        const uploadRes = await apiUpload<UploadResult>(uploadEndpoint, formData);

        // 2. Create the visual node through the atomic node API.
        setState({ status: "loading", message: "Adding canvas node..." });
        const newNodeId = crypto.randomUUID();
        const isDataset = ext === ".csv" || ext === ".sqlite" || ext === ".sqlite3" || ext === ".db" || ext === ".geojson";
        const sourceUrl = isDataset
          ? `/api/studio/projects/datasets/${uploadRes.storageKey}`
          : uploadRes.publicUrl ?? (nodeType === "image" ? `/api/uploads/images/${uploadRes.storageKey}` : `/api/uploads/assets/${uploadRes.storageKey}`);

        const csvPreview = ext === ".csv" ? parseCsvPreview(fileBuffer.toString("utf8")) : null;

        const newNode = {
          id: newNodeId,
          type: nodeType,
          text: fileName,
          x,
          y,
          sourceUrl,
          mimeType,
          data: {
            storageKey: uploadRes.storageKey,
            fileName,
            ...(ext === ".geojson"
              ? { kind: "maplibre", geometryFormat: "geojson", featureKey: "id" }
              : isDataset ? { kind: "dataset", extension: ext.slice(1), fileSize: fileBuffer.byteLength, columns: csvPreview?.columns ?? [], rows: csvPreview?.rows ?? [] } : {}),
          },
        };

        await apiRequest(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
          method: "POST",
          body: JSON.stringify({ node: newNode, idempotencyKey: newNodeId }),
        });

        setState({
          status: "done",
          nodeType,
          nodeId: newNodeId,
          url: sourceUrl,
        });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [projectId, filePath, userType, x, y]);

  if (state.status === "loading") return <Text color="yellow">{state.message}</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Uploaded file and added [{state.nodeType}] node to canvas!</Text>
      <Text dimColor>Node ID: {state.nodeId}</Text>
      {state.url && <Text dimColor>Asset URL: {state.url}</Text>}
    </Box>
  );
}

function parseCsvPreview(source: string, maxRows = 200) {
  const lines = source.split(/\r?\n/).filter(Boolean).slice(0, maxRows + 1);
  const columns = parseCsvLine(lines.shift() ?? "").map((value, index) => value.trim() || `Column ${index + 1}`);
  const rows = lines.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, index) => [column, parseCsvCell(cells[index] ?? "")]));
  });
  return { columns, rows };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { cells.push(value); value = ""; }
    else value += character;
  }
  cells.push(value);
  return cells;
}

function parseCsvCell(value: string): string | number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

export async function runUploadFile(
  projectId: string,
  filePath: string,
  options: { type?: string; x?: number; y?: number },
) {
  const { waitUntilExit } = render(
    <UploadFileApp
      projectId={projectId}
      filePath={filePath}
      type={options.type}
      x={options.x}
      y={options.y}
    />,
  );
  await waitUntilExit();
}
