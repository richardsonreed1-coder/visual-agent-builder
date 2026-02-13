// =============================================================================
// Export/Import Utility Functions
// Phase 8: ID remapping, sanitization, bounding box calculation
// =============================================================================

import { Node, Edge } from 'reactflow';
import { IdRemapTable, ExportVisualNode, ExportConnection } from './types';

// =============================================================================
// UUID Generation
// =============================================================================

let counter = 0;

/** Generate a unique ID with optional prefix */
export function generateUniqueId(prefix = 'node'): string {
  counter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}_${counter}`;
}

/** Reset counter (for testing) */
export function resetIdCounter(): void {
  counter = 0;
}

// =============================================================================
// ID Remapping
// =============================================================================

/**
 * Build an ID remap table for a set of nodes.
 * Maps old IDs to new unique IDs to prevent conflicts.
 */
export function buildIdRemapTable(nodes: ExportVisualNode[]): IdRemapTable {
  const remap: IdRemapTable = new Map();
  for (const node of nodes) {
    remap.set(node.id, generateUniqueId('imp'));
  }
  return remap;
}

/**
 * Apply ID remapping to a set of nodes.
 * Updates node.id and node.parentId references.
 */
export function remapNodeIds(
  nodes: ExportVisualNode[],
  remap: IdRemapTable
): ExportVisualNode[] {
  return nodes.map((node) => ({
    ...node,
    id: remap.get(node.id) || node.id,
    parentId: node.parentId ? (remap.get(node.parentId) || node.parentId) : undefined,
  }));
}

/**
 * Apply ID remapping to a set of edges.
 * Updates edge.id, edge.source, and edge.target references.
 */
export function remapEdgeIds(
  edges: ExportConnection[],
  remap: IdRemapTable
): ExportConnection[] {
  return edges.map((edge) => ({
    ...edge,
    id: generateUniqueId('edge'),
    source: remap.get(edge.source) || edge.source,
    target: remap.get(edge.target) || edge.target,
  }));
}

// =============================================================================
// Node Sanitization (strip transient React Flow properties)
// =============================================================================

/** Transient properties in node.data that should not be persisted */
const TRANSIENT_DATA_KEYS = new Set([
  'status',
  'logs',
]);

/**
 * Sanitize a React Flow Node for export.
 * Strips transient rendering properties and runtime data.
 */
export function sanitizeNodeForExport(node: Node): ExportVisualNode {
  // Build clean node object — only include known persistent fields
  const clean: ExportVisualNode = {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: sanitizeNodeData(node.data),
  };

  // Hierarchy fields
  if (node.parentId) {
    clean.parentId = node.parentId;
  }
  if ((node as Record<string, unknown>).extent === 'parent') {
    clean.extent = 'parent';
  }
  if ((node as Record<string, unknown>).expandParent) {
    clean.expandParent = true;
  }

  // Container sizing
  if (node.style?.width || node.style?.height) {
    clean.style = {};
    if (typeof node.style.width === 'number') clean.style.width = node.style.width;
    if (typeof node.style.height === 'number') clean.style.height = node.style.height;
  }

  return clean;
}

/** Sanitize node data by removing transient fields */
function sanitizeNodeData(data: Record<string, unknown>): ExportVisualNode['data'] {
  const cleanData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!TRANSIENT_DATA_KEYS.has(key)) {
      cleanData[key] = value;
    }
  }

  return cleanData as ExportVisualNode['data'];
}

/**
 * Sanitize a React Flow Edge for export.
 * Preserves visual styling and type info, strips rendering internals.
 */
export function sanitizeEdgeForExport(edge: Edge): ExportConnection {
  const clean: ExportConnection = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  };

  if (edge.sourceHandle != null) clean.sourceHandle = edge.sourceHandle;
  if (edge.targetHandle != null) clean.targetHandle = edge.targetHandle;
  if (edge.type) clean.type = edge.type;
  if (edge.animated) clean.animated = edge.animated;
  if (edge.label) clean.label = edge.label as string;
  if (edge.data) clean.data = edge.data as Record<string, unknown>;

  // Preserve style
  if (edge.style) {
    clean.style = {
      stroke: edge.style.stroke as string | undefined,
      strokeWidth: edge.style.strokeWidth as number | undefined,
      strokeDasharray: edge.style.strokeDasharray as string | undefined,
    };
  }

  // Preserve markers
  if (edge.markerEnd && typeof edge.markerEnd === 'object') {
    clean.markerEnd = edge.markerEnd as ExportConnection['markerEnd'];
  }

  if ((edge as Record<string, unknown>).interactionWidth) {
    clean.interactionWidth = (edge as Record<string, unknown>).interactionWidth as number;
  }
  if ((edge as Record<string, unknown>).zIndex) {
    clean.zIndex = (edge as Record<string, unknown>).zIndex as number;
  }

  return clean;
}

// =============================================================================
// Bounding Box Calculation
// =============================================================================

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculate the bounding box of a set of nodes.
 * Used for centering imported nodes under the cursor.
 */
export function calculateBoundingBox(nodes: ExportVisualNode[]): BoundingBox {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  // Default node dimensions (React Flow doesn't guarantee width/height in export)
  const DEFAULT_WIDTH = 200;
  const DEFAULT_HEIGHT = 80;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    // Only consider top-level nodes (not children constrained to parent)
    if (node.parentId) continue;

    const w = node.style?.width || DEFAULT_WIDTH;
    const h = node.style?.height || DEFAULT_HEIGHT;

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  // Handle case where all nodes are children
  if (minX === Infinity) {
    for (const node of nodes) {
      const w = node.style?.width || DEFAULT_WIDTH;
      const h = node.style?.height || DEFAULT_HEIGHT;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Offset all top-level node positions so the bounding box center
 * aligns with the target position (e.g., cursor location).
 * Child nodes retain their relative positions to parents.
 */
export function offsetNodesToPosition(
  nodes: ExportVisualNode[],
  targetX: number,
  targetY: number
): ExportVisualNode[] {
  const bbox = calculateBoundingBox(nodes);
  const offsetX = targetX - bbox.centerX;
  const offsetY = targetY - bbox.centerY;

  return nodes.map((node) => {
    // Only offset top-level nodes; children are relative to parent
    if (node.parentId) return node;

    return {
      ...node,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
    };
  });
}

// =============================================================================
// Selection Helpers
// =============================================================================

/**
 * Given a set of selected node IDs, find all descendant nodes
 * (children, grandchildren, etc.) to include in a partial export.
 */
export function getDescendantNodeIds(
  allNodes: Node[],
  selectedIds: Set<string>
): Set<string> {
  const result = new Set(selectedIds);
  let changed = true;

  // Iteratively find children until no new descendants are found
  while (changed) {
    changed = false;
    for (const node of allNodes) {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        changed = true;
      }
    }
  }

  return result;
}

/**
 * Filter edges to only include those where both source and target
 * are in the given node ID set.
 */
export function filterEdgesForNodes(
  edges: Edge[],
  nodeIds: Set<string>
): Edge[] {
  return edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
}

// =============================================================================
// File Operations (File System Access API)
// =============================================================================

const FILE_EXTENSION = '.agent-workflow';
const MIME_TYPE = 'application/json';

/** All importable file extensions */
const IMPORTABLE_EXTENSIONS = [FILE_EXTENSION, '.json'];

/**
 * Trigger a browser download for the given JSON data.
 */
export function downloadWorkflowFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: MIME_TYPE });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith(FILE_EXTENSION) ? filename : `${filename}${FILE_EXTENSION}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker for workflow files.
 * Accepts .agent-workflow (Phase 8) and .json (Legacy Export JSON) formats.
 * Uses File System Access API with fallback to <input type="file">.
 */
export async function openWorkflowFile(): Promise<string | null> {
  // Try modern File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [
          {
            description: 'Agent Workflow (.agent-workflow)',
            accept: { [MIME_TYPE]: [FILE_EXTENSION] },
          },
          {
            description: 'Workflow JSON (.json)',
            accept: { [MIME_TYPE]: ['.json'] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      return await file.text();
    } catch (err) {
      // User cancelled or API not available
      if ((err as DOMException)?.name === 'AbortError') return null;
      // Fall through to legacy approach
    }
  }

  // Legacy fallback: invisible <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = IMPORTABLE_EXTENSIONS.join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
}
