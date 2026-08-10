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

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

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

        if (ext === ".csv" || ext === ".sqlite" || ext === ".db") {
          uploadEndpoint = "/api/studio/projects/dataset-upload";
          nodeType = userType || "compute";
          mimeType = ext === ".csv" ? "text/csv" : "application/x-sqlite3";
        } else if (ext === ".glb" || ext === ".gltf") {
          uploadEndpoint = "/api/studio/projects/model-upload";
          nodeType = userType || "model3d";
          mimeType = "model/gltf-binary";
        } else if (ext === ".jpg" || ext === ".jpeg") {
          mimeType = "image/jpeg";
        } else if (ext === ".gif") {
          mimeType = "image/gif";
        } else if (ext === ".webp") {
          mimeType = "image/webp";
        } else if (ext === ".pdf") {
          uploadEndpoint = "/api/studio/projects/image-upload"; // Fallback asset endpoint
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

        // 2. Fetch current canvas
        setState({ status: "loading", message: "Updating canvas document..." });
        const canvasRes = await apiRequest<{ projectId: string; document: CanvasDocument; camera: unknown }>(
          `/api/studio/projects/${projectId}/canvas`,
        );

        const resolvedProjectId = canvasRes.projectId || projectId;

        // 3. Create Visual Node
        const newNodeId = crypto.randomUUID();
        const sourceUrl = uploadRes.publicUrl ?? `/api/uploads/images/${uploadRes.storageKey}`;

        const newNode: CanvasNode = {
          id: newNodeId,
          type: nodeType,
          text: fileName,
          x,
          y,
          width: nodeType === "compute" ? 432 : nodeType === "model3d" ? 520 : 420,
          height: nodeType === "compute" ? 260 : nodeType === "model3d" ? 420 : 300,
          color: "paper",
          sourceUrl,
          mimeType,
          data: {
            storageKey: uploadRes.storageKey,
            fileName,
          },
        };

        const updatedDoc: CanvasDocument = {
          version: 1,
          nodes: [...canvasRes.document.nodes, newNode],
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updatedDoc,
            camera: canvasRes.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
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
