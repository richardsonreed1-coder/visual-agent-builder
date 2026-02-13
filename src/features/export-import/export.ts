// =============================================================================
// Export Engine
// Phase 8: Serializes canvas state to .agent-workflow format
// =============================================================================

import { Node, Edge, ReactFlowInstance } from 'reactflow';
import { WorkflowConfig } from '../../types/config';
import { WorkflowFileSchema, PartialExportSchema } from './schema';
import { FileHeader, WorkflowFile, PartialExport, ExportOptions } from './types';
import {
  sanitizeNodeForExport,
  sanitizeEdgeForExport,
  getDescendantNodeIds,
  filterEdgesForNodes,
  downloadWorkflowFile,
} from './utils';

// =============================================================================
// Constants
// =============================================================================

const FORMAT_VERSION = '1.0.0' as const;
const EXPORTER_ID = 'visual-agent-builder' as const;

// =============================================================================
// File Header Builder
// =============================================================================

function buildFileHeader(nodeCount: number, edgeCount: number): FileHeader {
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedFrom: EXPORTER_ID,
    nodeCount,
    edgeCount,
  };
}

// =============================================================================
// Full Canvas Export
// =============================================================================

/**
 * Export the entire canvas state as a WorkflowFile.
 * Strips transient properties, validates against Zod schema.
 */
export async function exportFullCanvas(
  nodes: Node[],
  edges: Edge[],
  workflowConfig: WorkflowConfig,
  reactFlowInstance?: ReactFlowInstance | null,
): Promise<WorkflowFile> {
  // Sanitize nodes and edges
  const sanitizedNodes = nodes.map(sanitizeNodeForExport);
  const sanitizedEdges = edges.map(sanitizeEdgeForExport);

  // Build the workflow file
  const workflowFile: WorkflowFile = {
    header: buildFileHeader(sanitizedNodes.length, sanitizedEdges.length),
    workflowConfig: {
      name: workflowConfig.name,
      description: workflowConfig.description,
      version: workflowConfig.version,
      framework: workflowConfig.framework,
      skillSchema: workflowConfig.skillSchema,
      frameworkOptions: workflowConfig.frameworkOptions as Record<string, unknown>,
      defaultModel: workflowConfig.defaultModel,
      environment: workflowConfig.environment,
      author: workflowConfig.author,
      tags: workflowConfig.tags,
      createdAt: workflowConfig.createdAt,
      updatedAt: new Date().toISOString(),
    },
    viewport: reactFlowInstance
      ? reactFlowInstance.getViewport()
      : undefined,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };

  // Validate against schema (catches any serialization issues)
  const result = WorkflowFileSchema.safeParse(workflowFile);
  if (!result.success) {
    console.warn('[Export] Schema validation warnings:', result.error.issues);
    // Still return the file — export should be permissive
    // Import is where strict validation matters
  }

  return workflowFile;
}

// =============================================================================
// Partial (Selection) Export
// =============================================================================

/**
 * Export only selected nodes, their descendants, and connecting edges.
 */
export async function exportSelection(
  allNodes: Node[],
  allEdges: Edge[],
  selectedNodeIds: string[],
  reactFlowInstance?: ReactFlowInstance | null,
): Promise<PartialExport> {
  // Find all descendant node IDs
  const selectedSet = new Set(selectedNodeIds);
  const allIncludedIds = getDescendantNodeIds(allNodes, selectedSet);

  // Filter nodes and edges
  const includedNodes = allNodes.filter((n) => allIncludedIds.has(n.id));
  const includedEdges = filterEdgesForNodes(allEdges, allIncludedIds);

  // Sanitize
  const sanitizedNodes = includedNodes.map(sanitizeNodeForExport);
  const sanitizedEdges = includedEdges.map(sanitizeEdgeForExport);

  const partialExport: PartialExport = {
    header: buildFileHeader(sanitizedNodes.length, sanitizedEdges.length),
    viewport: reactFlowInstance
      ? reactFlowInstance.getViewport()
      : undefined,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };

  // Validate
  const result = PartialExportSchema.safeParse(partialExport);
  if (!result.success) {
    console.warn('[Export] Partial export schema warnings:', result.error.issues);
  }

  return partialExport;
}

// =============================================================================
// Download Trigger
// =============================================================================

/**
 * Export and download the canvas as a .agent-workflow file.
 */
export async function exportAndDownload(
  nodes: Node[],
  edges: Edge[],
  workflowConfig: WorkflowConfig,
  options: ExportOptions,
  reactFlowInstance?: ReactFlowInstance | null,
): Promise<void> {
  const filename = options.filename
    || workflowConfig.name.toLowerCase().replace(/\s+/g, '-')
    || 'workflow';

  if (options.selectionOnly) {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) {
      throw new Error('No nodes selected for export');
    }
    const partial = await exportSelection(
      nodes,
      edges,
      selectedIds,
      options.includeViewport ? reactFlowInstance : null,
    );
    downloadWorkflowFile(partial, filename);
  } else {
    const full = await exportFullCanvas(
      nodes,
      edges,
      workflowConfig,
      options.includeViewport ? reactFlowInstance : null,
    );
    downloadWorkflowFile(full, filename);
  }
}
