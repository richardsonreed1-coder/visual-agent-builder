import { useState, useCallback, useMemo } from 'react';
import useStore from '../../store/useStore';
import {
  Settings2,
  Bot,
  X,
  ChevronRight,
  Network,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { NodeType, NODE_TYPE_INFO, isContainerType } from '../../types/core';
import { getSchemaForType } from './schemas';
import { DynamicForm } from './DynamicForm';
import { useSocket } from '../../hooks/useSocket';
import { nodeTypeIcons, nodeTypeColors } from './nodeTypeConstants';
import { EdgeInspector } from './EdgeInspector';
import { ContainerMembersSection } from './ContainerMembersSection';

export const PropertiesPanel = () => {
  const { selectedNode, setSelectedNode, selectedEdge, setSelectedEdge, updateEdgeType, nodes, edges, isPropertiesPanelCollapsed, togglePropertiesPanel } = useStore();
  const { socket } = useSocket();
  const [isClosing, setIsClosing] = useState(false);

  // Hooks for container nodes — MUST be before any early returns (React rules of hooks)
  const nodeType = selectedNode?.data?.type as NodeType | undefined;
  const isContainer = nodeType ? isContainerType(nodeType) : false;

  const childNodes = useMemo(() => {
    if (!isContainer || !selectedNode) return [];
    return nodes.filter((n) => n.parentId === selectedNode.id);
  }, [isContainer, nodes, selectedNode]);

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return { outgoing: [] as typeof nodes, incoming: [] as typeof nodes };
    const outEdges = edges.filter((e) => e.source === selectedNode.id);
    const inEdges = edges.filter((e) => e.target === selectedNode.id);
    return {
      outgoing: outEdges.map((e) => nodes.find((n) => n.id === e.target)).filter(Boolean) as typeof nodes,
      incoming: inEdges.map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean) as typeof nodes,
    };
  }, [selectedNode, edges, nodes]);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedNode(null);
      setSelectedEdge(null);
      setIsClosing(false);
    }, 150);
  };

  // Phase 6.3: Handle edge type change with backend sync
  const handleEdgeTypeChange = useCallback((newType: string) => {
    if (!selectedEdge) return;

    // 1. Update UI immediately (optimistic update)
    updateEdgeType(selectedEdge.id, newType);

    // 2. Sync to Backend for persistence in layout.json
    // Socket event not in typed event map — cast socket for custom emit
    (socket as unknown as { emit: (event: string, data: Record<string, unknown>) => void })?.emit('canvas:update_edge', {
      edgeId: selectedEdge.id,
      changes: { data: { type: newType } }
    });

    console.log('[PropertiesPanel] Edge type changed:', selectedEdge.id, '->', newType);
  }, [selectedEdge, updateEdgeType, socket]);

  // Collapsed state - show minimal sidebar with expand button
  if (isPropertiesPanelCollapsed) {
    return (
      <aside className="w-12 bg-white border-l border-slate-200 flex flex-col items-center py-4 h-full z-10 shrink-0 transition-all duration-200">
        <button
          onClick={togglePropertiesPanel}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors group"
          title="Expand Properties Panel"
        >
          <PanelRightOpen size={18} />
        </button>
        {selectedNode && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${nodeTypeColors[nodeType!]?.bg || 'bg-slate-50'} flex items-center justify-center`} title={selectedNode.data.label || 'Selected'}>
              {(() => {
                const Icon = nodeTypeIcons[nodeType!] || Bot;
                return <Icon size={14} className={nodeTypeColors[nodeType!]?.text || 'text-slate-500'} />;
              })()}
            </div>
          </div>
        )}
        {selectedEdge && (
          <div className="mt-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center" title="Edge selected">
              <Network size={14} className="text-blue-500" />
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Phase 6.3: Render Edge Inspector Panel
  if (selectedEdge) {
    return (
      <EdgeInspector
        selectedEdge={selectedEdge}
        nodes={nodes}
        isClosing={isClosing}
        onClose={handleClose}
        onTogglePanel={togglePropertiesPanel}
        onEdgeTypeChange={handleEdgeTypeChange}
      />
    );
  }

  // Empty state - no node or edge selected
  if (!selectedNode) {
    return (
      <aside className="relative w-80 bg-white border-l border-slate-200 z-10 hidden lg:flex flex-col shrink-0 h-full transition-all duration-200">
        {/* Collapse Toggle */}
        <button
          onClick={togglePropertiesPanel}
          className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all"
          title="Collapse Properties Panel"
        >
          <PanelRightClose size={14} />
        </button>

        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100">
              <Settings2 className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Properties</h2>
              <p className="text-xs text-slate-400">No selection</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
              <ChevronRight className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">No selection</p>
            <p className="text-slate-400 text-xs">
              Click a node or edge on the canvas<br />to edit its properties
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // nodeType, isContainer, childNodes, connectedNodes already computed above (before early returns)
  const schema = getSchemaForType(nodeType!);
  const NodeIcon = nodeTypeIcons[nodeType!] || Bot;
  const colors = nodeTypeColors[nodeType!] || nodeTypeColors.AGENT;
  const typeInfo = NODE_TYPE_INFO[nodeType!];

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
        onClick={togglePropertiesPanel}
        className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all"
        title="Collapse Properties Panel"
      >
        <PanelRightClose size={14} />
      </button>

      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
              <NodeIcon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-800 truncate">
                {selectedNode.data.label || 'Untitled'}
              </h2>
              {selectedNode.data.repo && (
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {selectedNode.data.repo}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                  {typeInfo?.displayName || nodeType}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  #{selectedNode.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Deselect node"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto">
        {schema ? (
          <div className="p-4">
            <DynamicForm node={selectedNode} schema={schema} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No schema</p>
              <p className="text-xs text-slate-400 mt-1">
                This node type is not<br />yet configurable
              </p>
            </div>
          </div>
        )}

        {/* Members Section — for container nodes (Department, Agent Pool) */}
        {isContainer && (
          <ContainerMembersSection
            childNodes={childNodes}
            connectedNodes={connectedNodes}
            onSelectNode={setSelectedNode}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${typeInfo?.isContainer ? 'bg-orange-400' : 'bg-blue-400'}`} />
            {typeInfo?.isContainer ? 'Container' : 'Component'}
          </span>
          <span className="font-mono text-slate-400">
            {isContainer
              ? `${childNodes.length} member${childNodes.length !== 1 ? 's' : ''}`
              : `${Object.keys(selectedNode.data.config || {}).length} config props`
            }
          </span>
        </div>
      </div>
    </aside>
  );
};
