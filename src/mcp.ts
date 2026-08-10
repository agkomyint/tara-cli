import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { apiRequest } from "./client.js";

type CanvasNode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  [key: string]: unknown;
};

type CanvasDocument = { version: 1; nodes: CanvasNode[] };

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  text: { width: 280, height: 100 },
  note: { width: 280, height: 180 },
  goal: { width: 320, height: 190 },
  image: { width: 420, height: 300 },
  video: { width: 480, height: 300 },
  document: { width: 420, height: 560 },
  html: { width: 640, height: 420 },
  component: { width: 480, height: 320 },
  embed: { width: 560, height: 360 },
  chart: { width: 520, height: 340 },
  map: { width: 560, height: 380 },
  model3d: { width: 520, height: 420 },
  compute: { width: 432, height: 260 },
};

const TOOLS: Tool[] = [
  {
    name: "tara_list_projects",
    description: "List all Tara Studio projects owned by the authenticated user",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "tara_get_canvas",
    description: "Get the visual canvas document and all node definitions for a given project ID, name, or slug",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID, UUID prefix, slug, or project name (e.g. 'AI Philosophy')",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "tara_get_node_types",
    description: "Get all 13 available canvas node types, default pixel dimensions, capabilities, and color presets",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "tara_add_node",
    description: "Add a single visual node (note, goal, chart, map, etc.) to a project canvas",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        text: { type: "string", description: "Node content text" },
        type: {
          type: "string",
          description: "Node type (note, goal, text, chart, map, compute, etc.)",
          default: "note",
        },
        x: { type: "number", description: "X coordinate (default: 100)" },
        y: { type: "number", description: "Y coordinate (default: 100)" },
        color: { type: "string", description: "Color preset (paper, sun, mint, sky, coral)" },
      },
      required: ["projectId", "text"],
    },
  },
  {
    name: "tara_add_batch_nodes",
    description: "Add multiple nodes at once with automatic non-overlapping grid layout calculation",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        nodes: {
          type: "array",
          description: "Array of node objects (text, type, color, etc.)",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              type: { type: "string" },
              color: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
            },
            required: ["text"],
          },
        },
        layout: { type: "string", enum: ["grid", "flow", "none"], default: "grid" },
      },
      required: ["projectId", "nodes"],
    },
  },
  {
    name: "tara_arrange_canvas",
    description: "Auto-arrange all nodes on a project canvas into a clean, non-overlapping grid",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        columns: { type: "number", description: "Number of grid columns (default: 3)", default: 3 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "tara_update_node",
    description: "Update text, coordinates (x, y), dimensions (width, height), or color of a canvas node",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        nodeId: { type: "string", description: "Node ID or prefix (e.g. 'f7fb')" },
        text: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        color: { type: "string" },
      },
      required: ["projectId", "nodeId"],
    },
  },
  {
    name: "tara_remove_node",
    description: "Delete a specific node from the canvas",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
        nodeId: { type: "string", description: "Node ID or prefix" },
      },
      required: ["projectId", "nodeId"],
    },
  },
  {
    name: "tara_clear_canvas",
    description: "Remove all nodes from a project canvas",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or name" },
      },
      required: ["projectId"],
    },
  },
];

export async function runMcpServer() {
  const server = new Server(
    { name: "tara-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "tara_list_projects") {
        const res = await apiRequest<{ projects: any[] }>("/api/studio/projects");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: res.projects.length, projects: res.projects }, null, 2),
            },
          ],
        };
      }

      if (name === "tara_get_canvas") {
        const { projectId } = args as { projectId: string };
        const res = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(res, null, 2),
            },
          ],
        };
      }

      if (name === "tara_get_node_types") {
        try {
          const res = await apiRequest("/api/studio/canvas/node-types");
          return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    nodeTypes: Object.keys(DEFAULT_SIZES).map((t) => ({
                      type: t,
                      defaultSize: DEFAULT_SIZES[t],
                    })),
                    colors: ["paper", "sun", "mint", "sky", "coral"],
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      }

      if (name === "tara_add_node") {
        const { projectId, text, type = "note", x = 100, y = 100, color } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;
        const size = DEFAULT_SIZES[type] || DEFAULT_SIZES.note;

        const newNode: CanvasNode = {
          id: crypto.randomUUID(),
          type,
          text,
          x,
          y,
          width: size.width,
          height: size.height,
          color: color || (type === "note" ? "sun" : "paper"),
        };

        const updatedDoc = {
          version: 1 as const,
          nodes: [...current.document.nodes, newNode],
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updatedDoc,
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, addedNode: newNode }, null, 2),
            },
          ],
        };
      }

      if (name === "tara_add_batch_nodes") {
        const { projectId, nodes, layout = "grid" } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;

        const cols = 3;
        const gapX = 40;
        const gapY = 40;
        let currX = 100;
        let currY = 100;
        let maxHeightInRow = 0;

        const newNodes: CanvasNode[] = nodes.map((n: any, idx: number) => {
          const type = n.type || "note";
          const defaultSize = DEFAULT_SIZES[type] || DEFAULT_SIZES.note;
          const width = n.width || defaultSize.width;
          const height = n.height || defaultSize.height;

          let posX = n.x;
          let posY = n.y;

          if (layout !== "none" || (posX === undefined && posY === undefined)) {
            const col = idx % cols;
            if (col === 0 && idx > 0) {
              currX = 100;
              currY += maxHeightInRow + gapY;
              maxHeightInRow = 0;
            }
            posX = currX;
            posY = currY;

            currX += width + gapX;
            if (height > maxHeightInRow) maxHeightInRow = height;
          }

          return {
            id: n.id || crypto.randomUUID(),
            type,
            text: n.text || "",
            x: posX ?? 100,
            y: posY ?? 100,
            width,
            height,
            color: n.color || (type === "note" ? "sun" : "paper"),
            ...n,
          };
        });

        const updatedDoc = {
          version: 1 as const,
          nodes: [...current.document.nodes, ...newNodes],
        };

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: updatedDoc,
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, count: newNodes.length, addedNodes: newNodes }, null, 2),
            },
          ],
        };
      }

      if (name === "tara_arrange_canvas") {
        const { projectId, columns = 3 } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;

        let currX = 100;
        let currY = 100;
        let maxHeightInRow = 0;

        const arranged = current.document.nodes.map((node, idx) => {
          const col = idx % columns;
          if (col === 0 && idx > 0) {
            currX = 100;
            currY += maxHeightInRow + 40;
            maxHeightInRow = 0;
          }

          const res = { ...node, x: currX, y: currY };
          currX += node.width + 40;
          if (node.height > maxHeightInRow) maxHeightInRow = node.height;
          return res;
        });

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: arranged },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, arrangedCount: arranged.length }, null, 2),
            },
          ],
        };
      }

      if (name === "tara_update_node") {
        const { projectId, nodeId, text, x, y, width, height, color } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;
        let target: CanvasNode | undefined;

        const updatedNodes = current.document.nodes.map((node) => {
          if (node.id === nodeId || node.id.startsWith(nodeId)) {
            target = {
              ...node,
              ...(text !== undefined ? { text } : {}),
              ...(x !== undefined ? { x } : {}),
              ...(y !== undefined ? { y } : {}),
              ...(width !== undefined ? { width } : {}),
              ...(height !== undefined ? { height } : {}),
              ...(color !== undefined ? { color } : {}),
            };
            return target;
          }
          return node;
        });

        if (!target) throw new Error(`Node ${nodeId} not found.`);

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: updatedNodes },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        return { content: [{ type: "text", text: JSON.stringify({ success: true, node: target }, null, 2) }] };
      }

      if (name === "tara_remove_node") {
        const { projectId, nodeId } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;
        const filtered = current.document.nodes.filter(
          (n) => n.id !== nodeId && !n.id.startsWith(nodeId),
        );

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: filtered },
            camera: current.camera ?? { x: 160, y: 120, zoom: 1 },
          }),
        });

        return { content: [{ type: "text", text: JSON.stringify({ success: true, removedId: nodeId }, null, 2) }] };
      }

      if (name === "tara_clear_canvas") {
        const { projectId } = args as any;
        const current = await apiRequest<{ projectId: string; document: CanvasDocument; camera: any }>(
          `/api/studio/projects/${projectId}/canvas`,
        );
        const resolvedProjectId = current.projectId || projectId;

        await apiRequest("/api/studio/projects/canvas", {
          method: "PUT",
          body: JSON.stringify({
            projectId: resolvedProjectId,
            document: { version: 1, nodes: [] },
            camera: { x: 160, y: 120, zoom: 1 },
          }),
        });

        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Canvas cleared" }, null, 2) }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${err.message || String(err)}` }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
