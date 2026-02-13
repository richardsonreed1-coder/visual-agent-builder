import React, { useState } from 'react';
import { Check, X, Loader2, AlertTriangle, Star, ChevronDown, ChevronRight, CheckCircle2, Wrench, ExternalLink, RefreshCw } from 'lucide-react';
import type { ConfigSuggestion, FieldSuggestion } from '../../../shared/configure-types';

interface NodeConfigViewProps {
  node: { id: string; type: string; label: string; config: Record<string, unknown> };
  suggestion: ConfigSuggestion | null;
  isStreaming: boolean;
  streamingText: string;
  onAcceptField: (field: string) => void;
  onRejectField: (field: string) => void;
  onAcceptAll: () => void;
  onSkip: () => void;
  onRetry: () => void;
}

const priorityColor: Record<string, string> = {
  high: 'text-red-400 bg-red-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  low: 'text-blue-400 bg-blue-500/15',
  none: 'text-emerald-400 bg-emerald-500/15',
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'string') return val.length > 120 ? val.slice(0, 120) + '…' : val;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.length === 0 ? '(empty array)' : val.join(', ');
  return JSON.stringify(val, null, 2);
};

/** Check if a field represents an actual change vs. "already optimal" */
const isChanged = (field: FieldSuggestion): boolean => {
  if (field.priority === 'none') return false;
  // Deep equality fallback: AI might set priority != none but values are the same
  return JSON.stringify(field.currentValue) !== JSON.stringify(field.suggestedValue);
};

export const NodeConfigView: React.FC<NodeConfigViewProps> = ({
  node,
  suggestion,
  isStreaming,
  streamingText,
  onAcceptField,
  onRejectField,
  onAcceptAll,
  onSkip,
  onRetry,
}) => {
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Streaming state — show thinking text
  if (isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 size={20} className="text-violet-400 animate-spin" />
          <h3 className="text-base font-semibold text-slate-100">
            Analyzing {node.label}…
          </h3>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 font-mono text-sm text-slate-300 whitespace-pre-wrap max-h-80 overflow-y-auto">
          {streamingText || 'Thinking…'}
          <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-0.5" />
        </div>
      </div>
    );
  }

  // No suggestion yet
  if (!suggestion) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Waiting for analysis…</p>
      </div>
    );
  }

  // Parse failed — show error state with retry
  const parseFailed = suggestion._parseFailed || (
    suggestion.suggestions.length === 0 &&
    suggestion.summary.includes('Failed to parse')
  );

  if (parseFailed) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{node.label}</h3>
            <p className="text-sm text-red-400 mt-0.5">{suggestion.summary}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
            <Star size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-slate-100">{suggestion.overallScore}</span>
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>

        {/* Error message */}
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300 mb-1">Analysis failed to produce valid results</p>
          <p className="text-xs text-slate-400">
            The AI response was truncated or malformed. This can happen with large configurations.
          </p>
        </div>

        {/* Action Buttons with Retry */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">0 suggestions received</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200
                         bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Skip Node
            </button>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                         bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                         rounded-lg transition-all shadow-lg shadow-violet-900/20"
            >
              <RefreshCw size={14} />
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Split into changed vs unchanged
  const changedFields = suggestion.suggestions.filter(isChanged);
  const unchangedFields = suggestion.suggestions.filter((f) => !isChanged(f));

  const acceptedCount = changedFields.filter((s) => s.accepted === true).length;
  const rejectedCount = changedFields.filter((s) => s.accepted === false).length;
  const pendingCount = changedFields.length - acceptedCount - rejectedCount;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header with score */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{node.label}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{suggestion.summary}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
          <Star size={14} className="text-amber-400" />
          <span className="text-sm font-bold text-slate-100">{suggestion.overallScore}</span>
          <span className="text-xs text-slate-500">/10</span>
        </div>
      </div>

      {/* Section A: Suggested Changes */}
      {changedFields.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Suggested Changes ({changedFields.length})
          </h4>
          <div className="space-y-3">
            {changedFields.map((field, i) => (
              <FieldDiff
                key={i}
                field={field}
                onAccept={() => onAcceptField(field.field)}
                onReject={() => onRejectField(field.field)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section B: Unchanged / Optimal Settings */}
      {unchangedFields.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-300 transition-colors"
          >
            {showUnchanged ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Current Settings — No Changes Needed ({unchangedFields.length})
          </button>
          {showUnchanged && (
            <div className="space-y-1.5">
              {unchangedFields.map((field, i) => (
                <UnchangedField key={i} field={field} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Missing Requirements */}
      {suggestion.missingRequirements.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            Missing Requirements
          </h4>
          <div className="space-y-2">
            {suggestion.missingRequirements.map((req, i) => {
              const isAutoFixable = (req.category || 'manual') === 'auto_fixable';
              return (
                <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                        isAutoFixable
                          ? 'text-blue-400 bg-blue-500/15'
                          : 'text-amber-400 bg-amber-500/15'
                      }`}
                    >
                      {isAutoFixable ? <Wrench size={8} /> : <ExternalLink size={8} />}
                      {isAutoFixable ? 'Auto-fixable' : 'Manual'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{req.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{req.solution}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <span className="text-xs text-slate-500">
          {changedFields.length} suggestion{changedFields.length !== 1 ? 's' : ''} · {unchangedFields.length} unchanged · {acceptedCount} accepted
          {pendingCount > 0 && ` · ${pendingCount} pending`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200
                       bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Skip Node
          </button>
          <button
            onClick={onAcceptAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                       bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500
                       rounded-lg transition-all shadow-lg shadow-emerald-900/20"
          >
            <Check size={14} />
            Accept & Next
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Field Diff Sub-component (for changed fields) ---------- */

const FieldDiff: React.FC<{
  field: FieldSuggestion;
  onAccept: () => void;
  onReject: () => void;
}> = ({ field, onAccept, onReject }) => {
  const isDecided = field.accepted !== undefined;
  const isAccepted = field.accepted === true;

  return (
    <div className={`rounded-lg border transition-colors ${
      isDecided
        ? isAccepted
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-slate-700/30 bg-slate-800/30 opacity-60'
        : 'border-slate-700/50 bg-slate-800/30'
    }`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{field.field}</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityColor[field.priority]}`}>
              {field.priority}
            </span>
          </div>
          {!isDecided && (
            <div className="flex items-center gap-1">
              <button
                onClick={onAccept}
                className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                title="Accept"
              >
                <Check size={14} />
              </button>
              <button
                onClick={onReject}
                className="p-1.5 rounded-md text-red-400 hover:bg-red-500/15 transition-colors"
                title="Reject"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {isDecided && (
            <span className={`text-xs font-medium ${isAccepted ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isAccepted ? '✓ Accepted' : '✗ Rejected'}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-2">{field.reason}</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded p-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Current</span>
            <p className="text-xs text-slate-300 mt-0.5 break-words font-mono">
              {formatValue(field.currentValue)}
            </p>
          </div>
          <div className="bg-violet-500/5 border border-violet-500/20 rounded p-2">
            <span className="text-[10px] text-violet-400 uppercase tracking-wider">Suggested</span>
            <p className="text-xs text-slate-200 mt-0.5 break-words font-mono">
              {formatValue(field.suggestedValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Unchanged Field Sub-component ---------- */

const UnchangedField: React.FC<{ field: FieldSuggestion }> = ({ field }) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/20 border border-slate-700/30">
      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">{field.field}</span>
          <span className="text-xs text-slate-500 font-mono truncate">
            {formatValue(field.currentValue)}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{field.reason}</p>
      </div>
    </div>
  );
};
