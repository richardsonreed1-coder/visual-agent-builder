// =============================================================================
// Validation Report
// Phase 8: Shows Zod validation errors or import confirmation
// =============================================================================

import { AlertTriangle, CheckCircle, XCircle, Download, Replace, X } from 'lucide-react';
import { ImportResult, ImportValidationError } from '../types';
import { ImportedData } from '../import';

interface ValidationReportProps {
  result: ImportResult | null;
  importedData: ImportedData | null;
  onConfirm: () => void;   // Merge into canvas
  onReplace: () => void;    // Replace entire canvas
  onCancel: () => void;
}

export const ValidationReport = ({
  result,
  importedData,
  onConfirm,
  onReplace,
  onCancel,
}: ValidationReportProps) => {
  const isSuccess = result?.success === true;
  const errors = !isSuccess && result ? result.errors : [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 ${
            isSuccess
              ? 'bg-gradient-to-r from-emerald-500 to-green-600'
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                {isSuccess ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {isSuccess ? 'Import Ready' : 'Validation Failed'}
                </h3>
                <p className="text-xs text-white/70">
                  {isSuccess
                    ? `${importedData?.nodes.length || 0} nodes, ${importedData?.edges.length || 0} edges`
                    : `${errors.length} error${errors.length !== 1 ? 's' : ''} found`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[400px] overflow-y-auto">
          {isSuccess && importedData ? (
            <SuccessContent importedData={importedData} />
          ) : (
            <ErrorContent errors={errors} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {isSuccess && importedData && (
            <>
              <button
                onClick={onReplace}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Replace size={14} />
                Replace Canvas
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg transition-all shadow-sm flex items-center gap-2"
              >
                <Download size={14} />
                Merge Into Canvas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

function SuccessContent({ importedData }: { importedData: ImportedData }) {
  // Count node types
  const typeCounts = new Map<string, number>();
  for (const node of importedData.nodes) {
    const type = node.data?.type as string || 'UNKNOWN';
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{importedData.nodes.length}</p>
          <p className="text-xs text-blue-600">Nodes</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-2xl font-bold text-purple-700">{importedData.edges.length}</p>
          <p className="text-xs text-purple-600">Edges</p>
        </div>
      </div>

      {/* Type breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Node Types</h4>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(typeCounts.entries()).map(([type, count]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
            >
              {type}
              <span className="text-gray-400">({count})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Import type */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <p className="text-xs text-gray-600">
          {importedData.isPartial
            ? 'This is a partial export. It will be merged into your current canvas.'
            : 'This is a full workflow. You can merge it or replace your current canvas.'
          }
        </p>
      </div>

      {/* Workflow config preview (for full imports) */}
      {importedData.workflowConfig && !importedData.isPartial && (
        <div className="p-3 bg-indigo-50 rounded-lg space-y-1">
          <p className="text-sm font-medium text-indigo-800">
            {importedData.workflowConfig.name}
          </p>
          {importedData.workflowConfig.description && (
            <p className="text-xs text-indigo-600">
              {importedData.workflowConfig.description}
            </p>
          )}
          <p className="text-xs text-indigo-500">
            v{importedData.workflowConfig.version} | {importedData.workflowConfig.framework}
          </p>
        </div>
      )}
    </div>
  );
}

function ErrorContent({ errors }: { errors: ImportValidationError[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        The file could not be imported due to validation errors:
      </p>

      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {errors.map((error, index) => (
          <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-start gap-2">
              <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                {error.path && (
                  <p className="text-xs font-mono text-red-700 break-all mb-0.5">
                    {error.path}
                  </p>
                )}
                <p className="text-sm text-red-600">{error.message}</p>
                <p className="text-xs text-red-400 mt-0.5">Code: {error.code}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 italic">
        Ensure the file was exported from Visual Agent Builder v1.0.0+
      </p>
    </div>
  );
}
