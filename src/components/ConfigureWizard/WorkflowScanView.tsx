import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Info, XCircle, DollarSign, Cpu } from 'lucide-react';
import type { WorkflowAnalysis } from '../../../shared/configure-types';

interface WorkflowScanViewProps {
  analysis: WorkflowAnalysis;
  onStart: () => void;
}

const healthConfig = {
  good: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Healthy' },
  'needs-attention': { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Needs Attention' },
  critical: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Critical Issues' },
};

const severityConfig = {
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export const WorkflowScanView: React.FC<WorkflowScanViewProps> = ({ analysis, onStart }) => {
  const health = healthConfig[analysis.overallHealth];
  const HealthIcon = health.icon;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Health Badge */}
      <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${health.bg} mb-6`}>
        <HealthIcon size={22} className={health.color} />
        <div>
          <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
          <p className="text-xs text-slate-400">Workflow pre-scan complete</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={14} className="text-violet-400" />
            <span className="text-xs text-slate-400">Configurable Nodes</span>
          </div>
          <p className="text-lg font-bold text-slate-100">{analysis.configurableNodeCount}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-emerald-400" />
            <span className="text-xs text-slate-400">Estimated Cost</span>
          </div>
          <p className="text-lg font-bold text-slate-100">~${analysis.estimatedCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Issues List */}
      {analysis.nodeIssues.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Issues Found</h3>
          <div className="space-y-2">
            {analysis.nodeIssues.map((issue, i) => {
              const sev = severityConfig[issue.severity];
              const SevIcon = sev.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${sev.bg} border border-slate-700/30`}>
                  <SevIcon size={16} className={`${sev.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-sm text-slate-200">
                      <span className="font-medium">{issue.nodeLabel}:</span> {issue.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{issue.solution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Requirements */}
      {analysis.missingRequirements.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Missing Requirements</h3>
          <div className="space-y-2">
            {analysis.missingRequirements.map((req, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-slate-700/30">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-slate-200">{req.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{req.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="flex justify-end pt-4 border-t border-slate-700/50">
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     rounded-lg transition-all shadow-lg shadow-violet-900/30"
        >
          Start Configuration
        </button>
      </div>
    </div>
  );
};
