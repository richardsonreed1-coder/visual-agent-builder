// =============================================================================
// Import Dropzone
// Phase 8: Drag-and-drop overlay for importing .agent-workflow files
// =============================================================================

import { useState, useCallback, useRef, DragEvent } from 'react';
import { Upload, FileJson, FileType } from 'lucide-react';
import useStore from '../../../store/useStore';
import { importFromDrop, importFromFile, ImportedData } from '../import';
import { ImportOptions, ImportResult } from '../types';
import { ValidationReport } from './ValidationReport';

interface ImportDropzoneProps {
  /** Whether the dropzone overlay is active (visible) */
  isActive: boolean;
  /** Callback to deactivate the dropzone */
  onDeactivate: () => void;
  /** Cursor position for centering imported nodes */
  cursorPosition?: { x: number; y: number };
}

export const ImportDropzone = ({ isActive, onDeactivate, cursorPosition }: ImportDropzoneProps) => {
  const { nodes, edges, setNodes, setEdges, setWorkflowConfig } = useStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const dragCounterRef = useRef(0);

  const defaultOptions: ImportOptions = {
    conflictStrategy: 'regenerate',
    cursorPosition,
    replaceCanvas: false,
  };

  // Apply imported data to store
  const applyImport = useCallback(
    (imported: ImportedData, replace: boolean) => {
      if (replace) {
        // Replace entire canvas
        setNodes(imported.nodes);
        setEdges(imported.edges);
      } else {
        // Merge into existing canvas
        setNodes([...nodes, ...imported.nodes]);
        setEdges([...edges, ...imported.edges]);
      }

      // Apply workflow config for full imports
      if (imported.workflowConfig && !imported.isPartial) {
        const wc = imported.workflowConfig;
        setWorkflowConfig({
          name: wc.name,
          description: wc.description,
          version: wc.version,
          framework: wc.framework as 'vab-native' | 'langgraph' | 'crewai' | 'autogen',
          skillSchema: wc.skillSchema as 'agentskills' | 'simple',
          environment: (wc.environment || 'development') as 'development' | 'staging' | 'production',
          author: wc.author,
          tags: wc.tags,
        });
      }

      onDeactivate();
      setImportResult(null);
      setImportedData(null);
    },
    [nodes, edges, setNodes, setEdges, setWorkflowConfig, onDeactivate]
  );

  // Process an imported file
  const processImport = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setImportResult(null);
      setImportedData(null);

      try {
        const { result, imported } = await importFromDrop(file, defaultOptions, nodes, edges);

        setImportResult(result);

        if (result.success && imported) {
          setImportedData(imported);
          // Auto-apply for small imports, show confirmation for large
          if (imported.nodes.length <= 50) {
            applyImport(imported, false);
          } else {
            setShowValidation(true);
          }
        } else {
          setShowValidation(true);
        }
      } catch (err) {
        setImportResult({
          success: false,
          errors: [{
            path: '',
            message: err instanceof Error ? err.message : 'Import failed',
            code: 'import_error',
          }],
        });
        setShowValidation(true);
      } finally {
        setIsImporting(false);
      }
    },
    [nodes, edges, defaultOptions, applyImport]
  );

  // Drag handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      const workflowFile = files.find(
        (f) => f.name.endsWith('.agent-workflow') || f.name.endsWith('.json')
      );

      if (workflowFile) {
        await processImport(workflowFile);
      }
    },
    [processImport]
  );

  // Open file picker
  const handleFilePickerClick = useCallback(async () => {
    setIsImporting(true);
    try {
      const result = await importFromFile(defaultOptions, nodes, edges);
      if (!result) {
        // User cancelled
        onDeactivate();
        return;
      }

      setImportResult(result.result);

      if (result.result.success && result.imported) {
        setImportedData(result.imported);
        if (result.imported.nodes.length <= 50) {
          applyImport(result.imported, false);
        } else {
          setShowValidation(true);
        }
      } else {
        setShowValidation(true);
      }
    } catch (err) {
      setImportResult({
        success: false,
        errors: [{
          path: '',
          message: err instanceof Error ? err.message : 'Import failed',
          code: 'import_error',
        }],
      });
      setShowValidation(true);
    } finally {
      setIsImporting(false);
    }
  }, [nodes, edges, defaultOptions, applyImport, onDeactivate]);

  // Validation report handlers
  const handleConfirmImport = useCallback(() => {
    if (importedData) {
      applyImport(importedData, false);
    }
    setShowValidation(false);
  }, [importedData, applyImport]);

  const handleReplaceImport = useCallback(() => {
    if (importedData) {
      applyImport(importedData, true);
    }
    setShowValidation(false);
  }, [importedData, applyImport]);

  const handleCancelImport = useCallback(() => {
    setShowValidation(false);
    setImportResult(null);
    setImportedData(null);
    onDeactivate();
  }, [onDeactivate]);

  if (!isActive) return null;

  // Show validation report if needed
  if (showValidation) {
    return (
      <ValidationReport
        result={importResult}
        importedData={importedData}
        onConfirm={handleConfirmImport}
        onReplace={handleReplaceImport}
        onCancel={handleCancelImport}
      />
    );
  }

  // Main dropzone overlay
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-colors duration-200 ${
          isDragOver
            ? 'bg-indigo-500/20 backdrop-blur-sm'
            : 'bg-black/30 backdrop-blur-[2px]'
        }`}
        onClick={onDeactivate}
      />

      {/* Drop area */}
      <div
        className={`relative z-10 max-w-md w-full mx-4 p-8 rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-400 bg-white shadow-2xl scale-105'
            : 'border-gray-300 bg-white/95 shadow-xl'
        }`}
      >
        {isImporting ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-600">Validating workflow file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-2xl transition-colors ${
              isDragOver ? 'bg-indigo-100' : 'bg-gray-100'
            }`}>
              {isDragOver ? (
                <FileJson className="w-10 h-10 text-indigo-600" />
              ) : (
                <Upload className="w-10 h-10 text-gray-400" />
              )}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {isDragOver ? 'Drop to import' : 'Import Workflow'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop a workflow file here
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded">
                  <FileJson className="w-3 h-3" />
                  .agent-workflow
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded">
                  <FileType className="w-3 h-3" />
                  .json
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              onClick={handleFilePickerClick}
              className="px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Browse Files
            </button>

            <button
              onClick={onDeactivate}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
