import { Node, Edge } from 'reactflow';
import {
  X,
  Network,
  ArrowRight,
  PanelRightClose,
} from 'lucide-react';
import { EDGE_TYPES } from '../../config/edgeConfig';

interface EdgeInspectorProps {
  selectedEdge: Edge;
  nodes: Node[];
  isClosing: boolean;
  onClose: () => void;
  onTogglePanel: () => void;
  onEdgeTypeChange: (newType: string) => void;
}

export const EdgeInspector = ({
  selectedEdge,
  nodes,
  isClosing,
  onClose,
  onTogglePanel,
  onEdgeTypeChange,
}: EdgeInspectorProps) => {
  const currentType = (selectedEdge.data as Record<string, unknown> | undefined)?.type as string || 'default';
  const sourceNode = nodes.find(n => n.id === selectedEdge.source);
  const targetNode = nodes.find(n => n.id === selectedEdge.target);
  const sourceLabel = sourceNode?.data?.label || 'Source';
  const targetLabel = targetNode?.data?.label || 'Target';

  return (
    <aside
      className={`
        relative w-80 bg-white border-l border-slate-200
        z-10 flex flex-col shrink-0 h-full
        transition-all duration-200
        ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* Collapse Toggle */}
      <button
        onClick={onTogglePanel}
        className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all"
        title="Collapse Properties Panel"
      >
        <PanelRightClose size={14} />
      </button>

      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
              <Network className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-800">Connection</h2>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {selectedEdge.id.slice(0, 16)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Deselect edge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Visual Flow Map */}
        <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200">
          <div className="text-xs font-medium text-slate-700 truncate w-24 text-center">
            {sourceLabel}
          </div>
          <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
          <div className="text-xs font-medium text-slate-700 truncate w-24 text-center">
            {targetLabel}
          </div>
        </div>

        {/* Type Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Relationship Type
          </label>
          <div className="space-y-2">
            {Object.entries(EDGE_TYPES).map(([key, config]) => (
              <button
                key={key}
                onClick={() => onEdgeTypeChange(key)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                  currentType === key
                    ? 'ring-2 ring-blue-500 border-transparent bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.stroke }}
                />
                <span className="text-xs font-medium text-slate-700">
                  {config.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Edge
          </span>
          <span className="font-mono text-slate-400">
            Type: {currentType}
          </span>
        </div>
      </div>
    </aside>
  );
};
