// =============================================================================
// Export/Import TypeScript Types
// Phase 8: Inferred from Zod schemas — single source of truth
// =============================================================================

import { z } from 'zod';
import {
  FileHeaderSchema,
  WorkflowFileSchema,
  PartialExportSchema,
  VisualNodeSchema,
  ConnectionSchema,
  ViewportSchema,
  WorkflowConfigExportSchema,
  NodeDataSchema,
} from './schema';

// Inferred types from Zod schemas
export type FileHeader = z.infer<typeof FileHeaderSchema>;
export type WorkflowFile = z.infer<typeof WorkflowFileSchema>;
export type PartialExport = z.infer<typeof PartialExportSchema>;
export type ExportVisualNode = z.infer<typeof VisualNodeSchema>;
export type ExportConnection = z.infer<typeof ConnectionSchema>;
export type ExportViewport = z.infer<typeof ViewportSchema>;
export type ExportWorkflowConfig = z.infer<typeof WorkflowConfigExportSchema>;
export type ExportNodeData = z.infer<typeof NodeDataSchema>;

// =============================================================================
// Export Options
// =============================================================================

export interface ExportOptions {
  /** Export only selected nodes + their descendants and connecting edges */
  selectionOnly: boolean;
  /** Include viewport position for restoring view */
  includeViewport: boolean;
  /** Custom filename (without extension) */
  filename?: string;
}

// =============================================================================
// Import Result
// =============================================================================

export interface ImportSuccess {
  success: true;
  data: WorkflowFile | PartialExport;
  isPartial: boolean;
  nodeCount: number;
  edgeCount: number;
}

export interface ImportError {
  success: false;
  errors: ImportValidationError[];
}

export interface ImportValidationError {
  path: string;
  message: string;
  code: string;
}

export type ImportResult = ImportSuccess | ImportError;

// =============================================================================
// Import Options
// =============================================================================

export interface ImportOptions {
  /** How to handle ID conflicts with existing canvas nodes */
  conflictStrategy: 'regenerate' | 'skip' | 'overwrite';
  /** Position offset for imported nodes (centers under cursor if provided) */
  cursorPosition?: { x: number; y: number };
  /** Replace entire canvas vs merge into existing */
  replaceCanvas: boolean;
}

// =============================================================================
// ID Remap Table
// =============================================================================

export type IdRemapTable = Map<string, string>;
