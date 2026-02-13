import React, { useState, useCallback } from 'react';
import { CheckCircle2, SkipForward, AlertTriangle, BarChart3, Wrench, Loader2, Clipboard, ExternalLink } from 'lucide-react';
import type { ConfigSuggestion, MissingRequirement } from '../../../shared/configure-types';
import { compileFixerPrompt } from '../../utils/compileFixerPrompt';
import { useSocket } from '../../hooks/useSocket';
import useStore from '../../store/useStore';

interface SummaryViewProps {
  suggestions: Map<string, ConfigSuggestion>;
  statuses: Map<string, string>;
  allMissingRequirements: MissingRequirement[];
  onClose: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  suggestions,
  statuses,
  allMissingRequirements,
  onClose,
}) => {
  const { nodes, setFixerRunning } = useStore();
  const { isConnected, sessionId, socket, startSession } = useSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  const acceptedCount = Array.from(statuses.values()).filter(s => s === 'accepted').length;
  const skippedCount = Array.from(statuses.values()).filter(s => s === 'skipped').length;
  const errorCount = Array.from(statuses.values()).filter(s => s === 'error').length;

  let totalFieldsChanged = 0;
  suggestions.forEach((sug) => {
    totalFieldsChanged += sug.suggestions.filter(f => f.accepted === true).length;
  });

  // Category counts
  const autoFixableCount = allMissingRequirements.filter(
    (r) => (r.category || 'manual') === 'auto_fixable'
  ).length;
  const manualCount = allMissingRequirements.length - autoFixableCount;

  // ---------- Open Fixer ----------

  const handleOpenFixer = useCallback(async () => {
    if (!isConnected || !socket) {
      console.warn('[Fixer] Cannot launch: not connected');
      return;
    }

    setIsLaunching(true);

    try {
      // Compile the prompt
      const workflowContext = {
        nodeCount: nodes.length,
        nodes: nodes.map((n) => ({
          id: n.id,
          label: (n.data as Record<string, unknown>)?.label as string || n.id,
          type: (n.data as Record<string, unknown>)?.type as string || n.type || 'UNKNOWN',
        })),
      };

      const compiledPrompt = compileFixerPrompt(allMissingRequirements, workflowContext);

      // Start session if needed
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await startSession();
      }

      // Mark fixer as running (shared state for terminal)
      setFixerRunning(true);

      // Emit fixer:start — runs as a standalone Claude call,
      // NOT through the multi-agent orchestrator
      socket.emit('fixer:start', {
        sessionId: activeSessionId,
        prompt: compiledPrompt,
      });

      // Close the configure modal — terminal will take over
      onClose();
    } catch (err) {
      console.error('[Fixer] Failed to launch:', err);
      setIsLaunching(false);
    }
  }, [isConnected, socket, sessionId, startSession, nodes, allMissingRequirements, onClose]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 mb-3">
          <BarChart3 size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Configuration Complete</h3>
        <p className="text-sm text-slate-400 mt-1">All components have been reviewed</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
          <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-emerald-300">{acceptedCount}</p>
          <p className="text-xs text-slate-400">Accepted</p>
        </div>
        <div className="bg-slate-500/10 rounded-lg p-3 text-center border border-slate-600/30">
          <SkipForward size={20} className="text-slate-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-300">{skippedCount}</p>
          <p className="text-xs text-slate-400">Skipped</p>
        </div>
        <div className="bg-violet-500/10 rounded-lg p-3 text-center border border-violet-500/20">
          <BarChart3 size={20} className="text-violet-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-violet-300">{totalFieldsChanged}</p>
          <p className="text-xs text-slate-400">Fields Changed</p>
        </div>
      </div>

      {/* Errors */}
      {errorCount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-300">{errorCount} node(s) encountered errors during analysis.</p>
        </div>
      )}

      {/* Remaining Missing Requirements */}
      {allMissingRequirements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Remaining Requirements ({allMissingRequirements.length})
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {autoFixableCount > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench size={10} className="text-blue-400" />
                  {autoFixableCount} auto-fixable
                </span>
              )}
              {manualCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clipboard size={10} className="text-amber-400" />
                  {manualCount} manual
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {allMissingRequirements.map((req, i) => (
              <RequirementCard key={i} req={req} />
            ))}
          </div>

          {/* Open Fixer Button */}
          <button
            onClick={handleOpenFixer}
            disabled={isLaunching || !isConnected}
            className="mt-4 w-full flex items-center justify-center gap-3 px-5 py-3 text-sm font-medium text-white
                       bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-xl transition-all shadow-lg shadow-violet-900/30
                       border border-violet-500/30"
          >
            {isLaunching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Launching Fixer...
              </>
            ) : (
              <>
                <Wrench size={16} />
                Open Fixer
                <span className="text-xs text-violet-300 opacity-75">
                  Compile & execute in terminal
                </span>
              </>
            )}
          </button>

          {!isConnected && (
            <p className="text-xs text-amber-400 text-center mt-2">
              Socket not connected. Fixer requires a server connection.
            </p>
          )}
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t border-slate-700/50">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     rounded-lg transition-all shadow-lg shadow-violet-900/30"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/* ---------- Requirement Card Sub-component ---------- */

const RequirementCard: React.FC<{ req: MissingRequirement }> = ({ req }) => {
  const isAutoFixable = (req.category || 'manual') === 'auto_fixable';

  return (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {req.nodeLabel && (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {req.nodeLabel}
              </span>
            )}
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isAutoFixable
                  ? 'text-blue-400 bg-blue-500/15'
                  : 'text-amber-400 bg-amber-500/15'
              }`}
            >
              {isAutoFixable ? 'Auto-fixable' : 'Manual'}
            </span>
          </div>
          <p className="text-sm text-slate-200">{req.description}</p>
          <p className="text-xs text-slate-400 mt-1">{req.solution}</p>
        </div>
        <div className="shrink-0 mt-1">
          {isAutoFixable ? (
            <Wrench size={14} className="text-blue-400" />
          ) : (
            <ExternalLink size={14} className="text-amber-400" />
          )}
        </div>
      </div>
    </div>
  );
};
