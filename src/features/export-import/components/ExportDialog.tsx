// =============================================================================
// Export Dialog
// Phase 8: Options for exporting full canvas or selection
// =============================================================================

import { useState, useCallback } from 'react';
import { ReactFlowInstance } from 'reactflow';
import { Download, X, CheckSquare, Square, FileJson } from 'lucide-react';
import useStore from '../../../store/useStore';
import { exportAndDownload } from '../export';
import { ExportOptions } from '../types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reactFlowInstance: ReactFlowInstance | null;
}

export const ExportDialog = ({ isOpen, onClose, reactFlowInstance }: ExportDialogProps) => {
  const { nodes, edges, workflowConfig } = useStore();

  const [selectionOnly, setSelectionOnly] = useState(false);
  const [includeViewport, setIncludeViewport] = useState(true);
  const [filename, setFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = nodes.filter((n) => n.selected).length;
  const canExportSelection = selectedCount > 0;

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        selectionOnly,
        includeViewport,
        filename: filename.trim() || undefined,
      };

      await exportAndDownload(nodes, edges, workflowConfig, options, reactFlowInstance);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [nodes, edges, workflowConfig, selectionOnly, includeViewport, filename, reactFlowInstance, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Save Workflow</h3>
                <p className="text-xs text-indigo-200">Export as .agent-workflow file</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filename</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={workflowConfig.name.toLowerCase().replace(/\s+/g, '-')}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-sm text-gray-400 shrink-0">.agent-workflow</span>
            </div>
          </div>

          {/* Export scope */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Export Scope</label>

            {/* Full canvas */}
            <button
              type="button"
              onClick={() => setSelectionOnly(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                !selectionOnly
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FileJson size={16} className="text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-gray-800">Full Canvas</p>
                <p className="text-xs text-gray-500">
                  {nodes.length} nodes, {edges.length} edges
                </p>
              </div>
              {!selectionOnly ? (
                <CheckSquare size={18} className="text-indigo-600" />
              ) : (
                <Square size={18} className="text-gray-300" />
              )}
            </button>

            {/* Selection only */}
            <button
              type="button"
              onClick={() => canExportSelection && setSelectionOnly(true)}
              disabled={!canExportSelection}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectionOnly
                  ? 'border-indigo-300 bg-indigo-50'
                  : canExportSelection
                    ? 'border-gray-200 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <CheckSquare size={16} className="text-amber-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-gray-800">Selection Only</p>
                <p className="text-xs text-gray-500">
                  {canExportSelection
                    ? `${selectedCount} node${selectedCount > 1 ? 's' : ''} selected`
                    : 'Select nodes on canvas first'
                  }
                </p>
              </div>
              {selectionOnly ? (
                <CheckSquare size={18} className="text-indigo-600" />
              ) : (
                <Square size={18} className="text-gray-300" />
              )}
            </button>
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIncludeViewport(!includeViewport)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {includeViewport ? (
                <CheckSquare size={16} className="text-indigo-600" />
              ) : (
                <Square size={16} className="text-gray-400" />
              )}
              Include viewport position (zoom & pan)
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (selectionOnly && !canExportSelection)}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Save File'}
          </button>
        </div>
      </div>
    </div>
  );
};
