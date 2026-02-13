// =============================================================================
// Export/Import Feature Module — Public API
// Phase 8: Canvas state persistence
// =============================================================================

// Schemas (for advanced usage / testing)
export { WorkflowFileSchema, PartialExportSchema } from './schema';

// Types
export type {
  FileHeader,
  WorkflowFile,
  PartialExport,
  ExportOptions,
  ImportResult,
  ImportSuccess,
  ImportError,
  ImportValidationError,
  ImportOptions,
} from './types';

// Export engine
export {
  exportFullCanvas,
  exportSelection,
  exportAndDownload,
} from './export';

// Import engine
export {
  validateWorkflowFile,
  importWorkflow,
  importFromFile,
  importFromDrop,
} from './import';
export type { ImportedData } from './import';

// UI components
export { ExportDialog } from './components/ExportDialog';
export { ImportDropzone } from './components/ImportDropzone';
export { ValidationReport } from './components/ValidationReport';

// Utilities
export {
  downloadWorkflowFile,
  openWorkflowFile,
  calculateBoundingBox,
} from './utils';
