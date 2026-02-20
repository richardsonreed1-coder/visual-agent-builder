import { Node, Edge } from 'reactflow';
import { WorkflowConfig, ExportFramework, SkillSchema } from './config';

// =============================================================================
// Export Result Types
// =============================================================================

export interface ExportFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'binary';
}

export interface ExportResult {
  success: boolean;
  files: ExportFile[];
  errors: ExportError[];
  warnings: ExportWarning[];
  metadata: ExportMetadata;
}

export interface ExportError {
  code: string;
  message: string;
  path?: string;
  nodeId?: string;
}

export interface ExportWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface ExportMetadata {
  framework: ExportFramework;
  skillSchema: SkillSchema;
  exportedAt: string;
  fileCount: number;
  totalSize: number;
  version: string;
}

// =============================================================================
// Export Function Signature
// =============================================================================

export type ExportGenerator = (
  nodes: Node[],
  edges: Edge[],
  config: WorkflowConfig
) => ExportResult;

// =============================================================================
// Framework-Specific Export Structures
// =============================================================================

export interface VABNativeExport {
  'CLAUDE.md': string;
  'README.md'?: string;
  '.claude/settings.json'?: string;
  '.claude/mcp.json'?: string;
  '.claude/hooks/hooks.json'?: string;
  [agentPath: `agents/${string}`]: string | undefined;
  [skillPath: `skills/${string}`]: string | undefined;
  [commandPath: `commands/${string}`]: string | undefined;
}

// =============================================================================
// Export Context (passed to generators)
// =============================================================================

export interface ExportContext {
  nodes: Node[];
  edges: Edge[];
  config: WorkflowConfig;
  timestamp: string;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ExportError[];
  warnings: ExportWarning[];
}

export interface NodeValidation {
  nodeId: string;
  nodeType: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}
