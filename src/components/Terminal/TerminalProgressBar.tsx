// =============================================================================
// TerminalProgressBar — Shows phase progress during execution
// =============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

interface TerminalProgressBarProps {
  currentPhase: number;   // 1-based
  totalPhases: number;
  phaseName: string;
  isRunning: boolean;
}

export const TerminalProgressBar: React.FC<TerminalProgressBarProps> = ({
  currentPhase,
  totalPhases,
  phaseName,
  isRunning,
}) => {
  if (!isRunning || totalPhases === 0) return null;

  const progress = Math.min((currentPhase / totalPhases) * 100, 100);

  return (
    <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs">
          <Loader2 size={12} className="text-emerald-400 animate-spin" />
          <span className="text-slate-400">
            Phase {currentPhase}/{totalPhases}
          </span>
          <span className="text-slate-300 font-medium">{phaseName}</span>
        </div>
        <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default TerminalProgressBar;
