export type { TaraCanvasNode as CanvasNode, TaraCanvasDocument as CanvasDocument, TaraCanvasCamera as CanvasCamera } from "@tara/canvas-core";
import type { TaraCanvasCamera, TaraCanvasDocument } from "@tara/canvas-core";

export type CanvasResponse = {
  projectId: string;
  document: TaraCanvasDocument;
  camera: TaraCanvasCamera;
  revision: string | null;
};

export type NodeTypeDefinition = {
  type: string;
  label: string;
  defaultSize: { width: number; height: number };
  capabilities: string[];
  acceptedMimeTypes?: string[];
  renderer: "native" | "fallback" | "experimental";
  schemaVersion: number;
};

export type NodeRegistryResponse = {
  contractVersion: number;
  documentVersion: number;
  nodeTypes: NodeTypeDefinition[];
  colors: Array<{ name: string; label: string; hex: string }>;
  capabilities: string[];
  api: {
    validate: string;
    canvas: string;
    nodes: string;
    node: string;
    spatial?: string;
    transactions: string;
    supportsRevisionConflicts: boolean;
    supportsIdempotencyKeys: boolean;
    supportsNodePrefixLookup: boolean;
    supportsCascadeDelete: boolean;
    supportsDataFieldRemoval: boolean;
    supportsSpatialQueries?: boolean;
  };
  limits: Record<string, number>;
};
