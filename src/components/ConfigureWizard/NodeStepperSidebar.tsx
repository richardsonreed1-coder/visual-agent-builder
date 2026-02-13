import React from 'react';
import { Loader2, CheckCircle2, Circle, SkipForward, AlertCircle } from 'lucide-react';
import type { ConfigureNodeStatus } from '../../../shared/configure-types';

interface NodeStep {
  id: string;
  label: string;
  type: string;
  status: ConfigureNodeStatus;
}

interface NodeStepperSidebarProps {
  nodes: NodeStep[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const statusIcon = (status: ConfigureNodeStatus) => {
  switch (status) {
    case 'analyzing':
      return <Loader2 size={16} className="text-violet-400 animate-spin" />;
    case 'ready':
      return <Circle size={16} className="text-amber-400 fill-amber-400/20" />;
    case 'accepted':
      return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'skipped':
      return <SkipForward size={16} className="text-slate-500" />;
    case 'error':
      return <AlertCircle size={16} className="text-red-400" />;
    default:
      return <Circle size={16} className="text-slate-600" />;
  }
};

const typeColor = (type: string) => {
  const colors: Record<string, string> = {
    AGENT: 'bg-blue-500/20 text-blue-300',
    MCP_SERVER: 'bg-emerald-500/20 text-emerald-300',
    HOOK: 'bg-amber-500/20 text-amber-300',
    COMMAND: 'bg-purple-500/20 text-purple-300',
    SKILL: 'bg-cyan-500/20 text-cyan-300',
  };
  return colors[type] || 'bg-slate-500/20 text-slate-300';
};

export const NodeStepperSidebar: React.FC<NodeStepperSidebarProps> = ({
  nodes,
  currentIndex,
  onSelect,
}) => {
  return (
    <div className="w-56 border-r border-slate-700 bg-slate-900/50 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Components ({nodes.length})
        </p>
      </div>
      <div className="py-2">
        {nodes.map((node, idx) => (
          <button
            key={node.id}
            onClick={() => onSelect(idx)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              idx === currentIndex
                ? 'bg-violet-500/15 border-l-2 border-violet-400'
                : 'border-l-2 border-transparent hover:bg-slate-800/50'
            }`}
          >
            {statusIcon(node.status)}
            <div className="min-w-0 flex-1">
              <p className={`text-sm truncate ${
                idx === currentIndex ? 'text-slate-100 font-medium' : 'text-slate-300'
              }`}>
                {node.label}
              </p>
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ${typeColor(node.type)}`}>
                {node.type}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
