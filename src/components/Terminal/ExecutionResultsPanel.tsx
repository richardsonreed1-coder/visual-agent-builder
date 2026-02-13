// =============================================================================
// ExecutionResultsPanel — Post-execution dashboard with agent results
// =============================================================================

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Timer,
  Coins,
  Hash,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import type { ExecutionReportPayload } from '../../../shared/socket-events';

interface ExecutionResultsPanelProps {
  report: ExecutionReportPayload;
  height?: number;
}

const statusBadge = {
  success: { label: 'Success', bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-700' },
  partial: { label: 'Partial', bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-700' },
  failed: { label: 'Failed', bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-700' },
};

const agentStatusIcon = {
  success: { Icon: CheckCircle, color: 'text-emerald-400' },
  error: { Icon: XCircle, color: 'text-red-400' },
  timeout: { Icon: Clock, color: 'text-yellow-400' },
};

export const ExecutionResultsPanel: React.FC<ExecutionResultsPanelProps> = ({ report, height }) => {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const badge = statusBadge[report.status];
  const totalAgents = report.phases.reduce((sum, p) => sum + p.results.length, 0);
  const successCount = report.phases.reduce(
    (sum, p) => sum + p.results.filter((r) => r.status === 'success').length,
    0
  );

  return (
    <div className="overflow-y-auto bg-[#0d1117]" style={{ height: height || 256 }}>
      {/* Summary header */}
      <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-slate-200">
              {report.workflow || 'Workflow'} Results
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              {badge.label}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {successCount}/{totalAgents} agents succeeded
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1" title="Total duration">
            <Timer size={12} />
            {(report.totalDurationMs / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1" title="Total cost">
            <Coins size={12} />
            ${report.totalCost.toFixed(4)}
          </span>
          <span className="flex items-center gap-1" title="Total tokens">
            <Hash size={12} />
            {(report.totalTokens.input + report.totalTokens.output).toLocaleString()} tokens
          </span>
          <span className="flex items-center gap-1" title="Phases">
            <Zap size={12} />
            {report.phases.length} phases
          </span>
        </div>
      </div>

      {/* Agent list by phase */}
      <div className="p-3 space-y-3">
        {report.phases.map((phase, phaseIdx) => (
          <div key={phaseIdx}>
            {/* Phase header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-blue-400">
                Phase {phaseIdx + 1}
              </span>
              <span className="text-xs text-slate-500">{phase.name}</span>
              <span className="text-xs text-slate-600">
                ({(phase.durationMs / 1000).toFixed(1)}s)
              </span>
            </div>

            {/* Agent rows */}
            <div className="space-y-1">
              {phase.results.map((result) => {
                const { Icon, color } = agentStatusIcon[result.status];
                const isExpanded = expandedAgent === result.agentId;
                const totalTokens = result.tokensUsed.input + result.tokensUsed.output;

                return (
                  <div
                    key={result.agentId}
                    className="rounded border border-slate-700/50 bg-slate-800/30 overflow-hidden"
                  >
                    {/* Agent row */}
                    <button
                      onClick={() =>
                        setExpandedAgent(isExpanded ? null : result.agentId)
                      }
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/30 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} className="text-slate-500 shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-slate-500 shrink-0" />
                      )}
                      <Icon size={14} className={`${color} shrink-0`} />
                      <span className="text-sm text-slate-200 font-medium truncate">
                        {result.agentLabel}
                      </span>

                      <div className="flex items-center gap-3 ml-auto text-xs text-slate-500 shrink-0">
                        <span>{(result.durationMs / 1000).toFixed(1)}s</span>
                        <span>{totalTokens.toLocaleString()} tok</span>
                        <span>${result.cost.toFixed(4)}</span>
                      </div>
                    </button>

                    {/* Expanded output */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/50 px-3 py-2">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setExpandedAgent(null)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <ChevronLeft size={12} />
                            Back to list
                          </button>
                          <span className="text-xs text-slate-600">|</span>
                          <span className="text-xs text-slate-500">
                            {result.tokensUsed.input} in / {result.tokensUsed.output} out
                          </span>
                        </div>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
                          {result.output}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutionResultsPanel;
