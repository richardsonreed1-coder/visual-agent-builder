// =============================================================================
// AgentOutputBlock — Collapsible block for displaying individual agent results
// =============================================================================

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  Timer,
  Hash,
} from 'lucide-react';
import type { AgentResultPayload } from '../../../shared/socket-events';

interface AgentOutputBlockProps {
  result: AgentResultPayload;
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-800/40',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-800/40',
    label: 'Error',
  },
  timeout: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-800/40',
    label: 'Timeout',
  },
};

export const AgentOutputBlock: React.FC<AgentOutputBlockProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[result.status];
  const StatusIcon = config.icon;
  const totalTokens = result.tokensUsed.input + result.tokensUsed.output;

  return (
    <div className={`my-1 rounded border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-500 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-500 shrink-0" />
        )}

        <StatusIcon size={14} className={`${config.color} shrink-0`} />

        <span className="text-slate-200 font-medium text-sm truncate">
          {result.agentLabel}
        </span>

        {/* Metrics row */}
        <div className="flex items-center gap-3 ml-auto text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1" title="Duration">
            <Timer size={11} />
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1" title="Tokens">
            <Hash size={11} />
            {totalTokens.toLocaleString()}
          </span>
          <span className="flex items-center gap-1" title="Cost">
            <Coins size={11} />
            ${result.cost.toFixed(4)}
          </span>
        </div>
      </button>

      {/* Expanded output */}
      {isExpanded && (
        <div className="border-t border-slate-700/50">
          <div className="px-3 py-2 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
              <span>Tokens: {result.tokensUsed.input} in / {result.tokensUsed.output} out</span>
              <span>•</span>
              <span>Status: {config.label}</span>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {result.output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentOutputBlock;
