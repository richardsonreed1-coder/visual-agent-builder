// =============================================================================
// Import Engine
// Phase 8: Validates and reconstructs canvas state from .agent-workflow files
// =============================================================================

import { Node, Edge } from 'reactflow';
import { ZodIssue } from 'zod';
import { WorkflowFileSchema, PartialExportSchema, LegacyWorkflowSchema } from './schema';
import {
  ImportResult,
  ImportValidationError,
  ImportOptions,
  WorkflowFile,
  ExportVisualNode,
  ExportConnection,
} from './types';
import {
  buildIdRemapTable,
  remapNodeIds,
  remapEdgeIds,
  offsetNodesToPosition,
  openWorkflowFile,
} from './utils';
import { getEdgeParams } from '../../config/edgeConfig';

// =============================================================================
// Validation
// =============================================================================

/**
 * Convert Zod issues to our ImportValidationError format.
 */
function zodIssuesToErrors(issues: ZodIssue[]): ImportValidationError[] {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Try parsing as Phase 8 WorkflowFile, then PartialExport, then Legacy JSON.
 * Supports all export formats from the toolbar.
 */
export async function validateWorkflowFile(rawJson: unknown): Promise<ImportResult> {
  // 1. Try Phase 8 full workflow (.agent-workflow)
  const fullResult = WorkflowFileSchema.safeParse(rawJson);
  if (fullResult.success) {
    return {
      success: true,
      data: fullResult.data,
      isPartial: false,
      nodeCount: fullResult.data.nodes.length,
      edgeCount: fullResult.data.edges.length,
    };
  }

  // 2. Try Phase 8 partial export (.agent-workflow selection)
  const partialResult = PartialExportSchema.safeParse(rawJson);
  if (partialResult.success) {
    return {
      success: true,
      data: partialResult.data,
      isPartial: true,
      nodeCount: partialResult.data.nodes.length,
      edgeCount: partialResult.data.edges.length,
    };
  }

  // 3. Try Legacy JSON format from "Export JSON" button (generateWorkflowJson)
  const legacyResult = LegacyWorkflowSchema.safeParse(rawJson);
  if (legacyResult.success) {
    const converted = convertLegacyToWorkflowFile(legacyResult.data);
    return {
      success: true,
      data: converted,
      isPartial: false,
      nodeCount: converted.nodes.length,
      edgeCount: converted.edges.length,
    };
  }

  // All formats failed — return the most helpful errors
  // If it looks like a legacy file (has 'id' and 'name' at root), show legacy errors
  const obj = rawJson as Record<string, unknown>;
  if (obj && typeof obj === 'object' && 'id' in obj && 'name' in obj && !('header' in obj)) {
    return {
      success: false,
      errors: zodIssuesToErrors(legacyResult.error.issues),
    };
  }

  return {
    success: false,
    errors: zodIssuesToErrors(fullResult.error.issues),
  };
}

// =============================================================================
// Legacy Format Conversion
// =============================================================================

/** Container types that need default dimensions if style is missing */
const CONTAINER_TYPES = new Set(['DEPARTMENT', 'AGENT_POOL']);
const DEFAULT_CONTAINER_STYLE = { width: 400, height: 300 };

/**
 * Convert legacy generateWorkflowJson() output to Phase 8 WorkflowFile format.
 * Legacy shape: { id, name, nodes[], edges[], createdAt, updatedAt }
 * Legacy nodes have: { id, type (NodeType), position, data }
 * Newer legacy exports also preserve: parentId, style, extent, expandParent
 * Legacy edges have: { id, source, target, type? }
 */
function convertLegacyToWorkflowFile(
  legacy: Record<string, unknown>
): WorkflowFile {
  const legacyNodes = (legacy.nodes as Array<Record<string, unknown>>) || [];
  const legacyEdges = (legacy.edges as Array<Record<string, unknown>>) || [];

  // Convert legacy nodes → Phase 8 VisualNode format
  const nodes: ExportVisualNode[] = legacyNodes.map((ln) => {
    const data = (ln.data || {}) as Record<string, unknown>;
    const nodeType = (data.type || ln.type || 'AGENT') as string;

    // Determine React Flow component type from NodeType
    const rfType = nodeType === 'DEPARTMENT' ? 'departmentNode'
      : nodeType === 'AGENT_POOL' ? 'agentPoolNode'
      : nodeType === 'MCP_SERVER' ? 'mcpServerNode'
      : 'customNode';

    // Container nodes need dimensions — use exported style or defaults
    const isContainer = CONTAINER_TYPES.has(nodeType);
    const style = ln.style
      ? (ln.style as { width?: number; height?: number })
      : isContainer ? DEFAULT_CONTAINER_STYLE : undefined;

    return {
      id: ln.id as string,
      type: rfType,
      position: (ln.position || { x: 0, y: 0 }) as { x: number; y: number },
      data: {
        label: (data.label || `${nodeType} Node`) as string,
        type: nodeType as ExportVisualNode['data']['type'],
        repo: data.repo as string | undefined,
        config: (data.config || {}) as Record<string, unknown>,
        componentId: data.componentId as string | undefined,
      },
      // Hierarchy — preserved from newer legacy exports, or absent from older ones
      ...(ln.parentId ? {
        parentId: ln.parentId as string,
        extent: 'parent' as const,
        expandParent: true,
      } : {}),
      // Container sizing
      ...(style ? { style } : {}),
    };
  });

  // Convert legacy edges → Phase 8 Connection format
  const edges: ExportConnection[] = legacyEdges.map((le) => ({
    id: le.id as string,
    source: le.source as string,
    target: le.target as string,
    type: (le.type || 'default') as string,
  }));

  return {
    header: {
      formatVersion: '1.0.0',
      exportedAt: (legacy.updatedAt || new Date().toISOString()) as string,
      exportedFrom: 'visual-agent-builder',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
    workflowConfig: {
      name: (legacy.name || 'Imported Workflow') as string,
      description: (legacy.description || '') as string,
      version: '1.0.0',
      framework: 'vab-native',
      skillSchema: 'agentskills',
    },
    nodes,
    edges,
  };
}

// =============================================================================
// Reconstruction
// =============================================================================

/**
 * Convert validated export nodes back into React Flow Nodes.
 * Applies ID remapping and position offsets.
 */
function reconstructNodes(
  exportNodes: ExportVisualNode[],
  options: ImportOptions,
  existingNodeIds: Set<string>,
): { nodes: Node[]; remap: Map<string, string> } {
  let processedNodes = [...exportNodes];

  // Check for ID conflicts
  const hasConflicts = processedNodes.some((n) => existingNodeIds.has(n.id));

  // Build remap table if needed
  let remap = new Map<string, string>();
  if (hasConflicts && options.conflictStrategy === 'regenerate') {
    remap = buildIdRemapTable(processedNodes);
    processedNodes = remapNodeIds(processedNodes, remap);
  } else if (hasConflicts && options.conflictStrategy === 'skip') {
    processedNodes = processedNodes.filter((n) => !existingNodeIds.has(n.id));
  }
  // 'overwrite' leaves IDs as-is — existing nodes will be replaced

  // Apply cursor position offset
  if (options.cursorPosition && !options.replaceCanvas) {
    processedNodes = offsetNodesToPosition(
      processedNodes,
      options.cursorPosition.x,
      options.cursorPosition.y,
    );
  }

  // Convert to React Flow Nodes
  const rfNodes: Node[] = processedNodes.map((exportNode) => {
    const node: Node = {
      id: exportNode.id,
      type: exportNode.type || 'customNode',
      position: exportNode.position,
      data: {
        ...exportNode.data,
        // Restore transient defaults
        status: 'idle',
        logs: [],
      },
    };

    // Hierarchy fields
    if (exportNode.parentId) {
      node.parentId = exportNode.parentId;
      (node as Record<string, unknown>).extent = 'parent';
      (node as Record<string, unknown>).expandParent = true;
    }

    // Container sizing
    if (exportNode.style) {
      node.style = {};
      if (exportNode.style.width) node.style.width = exportNode.style.width;
      if (exportNode.style.height) node.style.height = exportNode.style.height;
    }

    return node;
  });

  return { nodes: rfNodes, remap };
}

/**
 * Convert validated export edges back into React Flow Edges.
 * Applies ID remapping and restores visual params from edge config.
 */
function reconstructEdges(
  exportEdges: ExportConnection[],
  remap: Map<string, string>,
  existingEdgeIds: Set<string>,
  options: ImportOptions,
): Edge[] {
  let processedEdges = [...exportEdges];

  // Remap IDs if needed
  if (remap.size > 0) {
    processedEdges = remapEdgeIds(processedEdges, remap);
  }

  // Skip existing edges if strategy is 'skip'
  if (options.conflictStrategy === 'skip') {
    processedEdges = processedEdges.filter((e) => !existingEdgeIds.has(e.id));
  }

  // Convert to React Flow Edges with restored visual params
  return processedEdges.map((exportEdge) => {
    // Get the semantic edge type from data or type
    const edgeType = (exportEdge.data as Record<string, unknown>)?.type as string
      || (exportEdge.data as Record<string, unknown>)?.edgeType as string
      || exportEdge.type
      || 'default';

    // Restore visual params from centralized edge config
    const edgeParams = getEdgeParams(edgeType);

    const edge: Edge = {
      id: exportEdge.id,
      source: exportEdge.source,
      target: exportEdge.target,
      ...edgeParams,
      // Override with exported data if present
      data: exportEdge.data || { type: edgeType },
    };

    if (exportEdge.sourceHandle != null) edge.sourceHandle = exportEdge.sourceHandle;
    if (exportEdge.targetHandle != null) edge.targetHandle = exportEdge.targetHandle;
    if (exportEdge.label) edge.label = exportEdge.label;

    return edge;
  });
}

// =============================================================================
// Main Import Pipeline
// =============================================================================

export interface ImportedData {
  nodes: Node[];
  edges: Edge[];
  workflowConfig?: WorkflowFile['workflowConfig'];
  viewport?: WorkflowFile['viewport'];
  isPartial: boolean;
}

/**
 * Full import pipeline:
 * 1. Parse JSON string
 * 2. Validate against Zod schema
 * 3. Remap IDs to prevent conflicts
 * 4. Reconstruct React Flow nodes and edges
 * 5. Return ready-to-merge data
 */
export async function importWorkflow(
  jsonString: string,
  options: ImportOptions,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = [],
): Promise<{ result: ImportResult; imported?: ImportedData }> {
  // Step 1: Parse JSON
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonString);
  } catch {
    return {
      result: {
        success: false,
        errors: [{
          path: '',
          message: 'Invalid JSON: file could not be parsed',
          code: 'invalid_json',
        }],
      },
    };
  }

  // Step 2: Validate
  const validationResult = await validateWorkflowFile(rawJson);
  if (!validationResult.success) {
    return { result: validationResult };
  }

  // Step 3: Extract data
  const { data, isPartial } = validationResult;
  const exportNodes = data.nodes;
  const exportEdges = data.edges;

  // Step 4: Reconstruct
  const existingNodeIds = new Set(existingNodes.map((n) => n.id));
  const existingEdgeIds = new Set(existingEdges.map((e) => e.id));

  const { nodes: reconstructedNodes, remap } = reconstructNodes(
    exportNodes,
    options,
    existingNodeIds,
  );

  const reconstructedEdges = reconstructEdges(
    exportEdges,
    remap,
    existingEdgeIds,
    options,
  );

  // Step 5: Build result
  const imported: ImportedData = {
    nodes: reconstructedNodes,
    edges: reconstructedEdges,
    isPartial,
  };

  // Include workflow config for full imports
  if (!isPartial) {
    const fullData = data as WorkflowFile;
    imported.workflowConfig = fullData.workflowConfig;
    imported.viewport = fullData.viewport;
  }

  return { result: validationResult, imported };
}

// =============================================================================
// File-based Import (user-facing)
// =============================================================================

/**
 * Open file picker, validate, and return imported data.
 * This is the main entry point for the UI.
 */
export async function importFromFile(
  options: ImportOptions,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = [],
): Promise<{ result: ImportResult; imported?: ImportedData } | null> {
  const fileContent = await openWorkflowFile();
  if (!fileContent) return null; // User cancelled

  return importWorkflow(fileContent, options, existingNodes, existingEdges);
}

/**
 * Import from a drag-and-drop DataTransfer event.
 */
export async function importFromDrop(
  file: File,
  options: ImportOptions,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = [],
): Promise<{ result: ImportResult; imported?: ImportedData }> {
  const fileContent = await file.text();
  return importWorkflow(fileContent, options, existingNodes, existingEdges);
}
