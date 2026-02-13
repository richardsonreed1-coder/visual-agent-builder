import { useState, useCallback, useMemo } from 'react';
import useStore from '../../store/useStore';
import {
  Settings2,
  Bot,
  Code2,
  Plug,
  Wrench,
  Cloud,
  Anchor,
  Terminal,
  BrainCircuit,
  Building2,
  Users,
  Server,
  LucideIcon,
  X,
  ChevronRight,
  ChevronDown,
  Network,
  ArrowRight,
  Layers,
  MousePointerClick,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { NodeType, NODE_TYPE_INFO, isContainerType } from '../../types/core';
import { getSchemaForType } from './schemas';
import { DynamicForm } from './DynamicForm';
import { EDGE_TYPES } from '../../config/edgeConfig';
import { useSocket } from '../../hooks/useSocket';

// Map node types to icons
const nodeTypeIcons: Record<NodeType, LucideIcon> = {
  AGENT: Bot,
  SKILL: Code2,
  PLUGIN: Plug,
  TOOL: Wrench,
  PROVIDER: Cloud,
  HOOK: Anchor,
  COMMAND: Terminal,
  REASONING: BrainCircuit,
  DEPARTMENT: Building2,
  AGENT_POOL: Users,
  MCP_SERVER: Server,
};

// Map node types to colors
const nodeTypeColors: Record<NodeType, { bg: string; text: string; border: string }> = {
  AGENT: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  SKILL: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  PLUGIN: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  TOOL: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  PROVIDER: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  HOOK: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  COMMAND: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  REASONING: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  DEPARTMENT: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  AGENT_POOL: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  MCP_SERVER: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
};

// ============================================================================
// Container Members Section — shows child nodes inside Department / Agent Pool
// ============================================================================

interface ContainerMembersSectionProps {
  childNodes: ReturnType<typeof useStore.getState>['nodes'];
  connectedNodes: {
    outgoing: ReturnType<typeof useStore.getState>['nodes'];
    incoming: ReturnType<typeof useStore.getState>['nodes'];
  };
  onSelectNode: (node: ReturnType<typeof useStore.getState>['nodes'][0]) => void;
}

const ContainerMembersSection = ({ childNodes, connectedNodes, onSelectNode }: ContainerMembersSectionProps) => {
  const [membersOpen, setMembersOpen] = useState(true);
  const [connectionsOpen, setConnectionsOpen] = useState(true);

  const hasOutgoing = connectedNodes.outgoing.length > 0;
  const hasIncoming = connectedNodes.incoming.length > 0;
  const hasConnections = hasOutgoing || hasIncoming;

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Members (children inside the container) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setMembersOpen(!membersOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Members
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
              {childNodes.length}
            </span>
          </div>
          {membersOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          }
        </button>

        {membersOpen && (
          <div className="divide-y divide-slate-100">
            {childNodes.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-slate-400">No members yet</p>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Drag components into this container
                </p>
              </div>
            ) : (
              childNodes.map((child) => {
                const childType = child.data.type as NodeType;
                const ChildIcon = nodeTypeIcons[childType] || Bot;
                const childColors = nodeTypeColors[childType] || nodeTypeColors.AGENT;
                const childTypeInfo = NODE_TYPE_INFO[childType];

                return (
                  <button
                    key={child.id}
                    onClick={() => onSelectNode(child)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors group text-left"
                  >
                    <div className={`p-1 rounded-md ${childColors.bg} ${childColors.border} border flex-shrink-0`}>
                      <ChildIcon className={`w-3.5 h-3.5 ${childColors.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-700">
                        {child.data.label || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {childTypeInfo?.displayName || childType}
                      </p>
                    </div>
                    <MousePointerClick className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Connections (edge-linked nodes) */}
      {hasConnections && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setConnectionsOpen(!connectionsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Connections
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                {connectedNodes.outgoing.length + connectedNodes.incoming.length}
              </span>
            </div>
            {connectionsOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            }
          </button>

          {connectionsOpen && (
            <div className="divide-y divide-slate-100">
              {/* Incoming connections */}
              {hasIncoming && connectedNodes.incoming.map((node) => {
                const nType = node.data.type as NodeType;
                const NIcon = nodeTypeIcons[nType] || Bot;
                const nColors = nodeTypeColors[nType] || nodeTypeColors.AGENT;
                return (
                  <button
                    key={`in-${node.id}`}
                    onClick={() => onSelectNode(node)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors group text-left"
                  >
                    <div className={`p-1 rounded-md ${nColors.bg} ${nColors.border} border flex-shrink-0`}>
                      <NIcon className={`w-3.5 h-3.5 ${nColors.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-700">
                        {node.data.label || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-slate-400">← incoming</p>
                    </div>
                    <MousePointerClick className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                );
              })}

              {/* Outgoing connections */}
              {hasOutgoing && connectedNodes.outgoing.map((node) => {
                const nType = node.data.type as NodeType;
                const NIcon = nodeTypeIcons[nType] || Bot;
                const nColors = nodeTypeColors[nType] || nodeTypeColors.AGENT;
                return (
                  <button
                    key={`out-${node.id}`}
                    onClick={() => onSelectNode(node)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors group text-left"
                  >
                    <div className={`p-1 rounded-md ${nColors.bg} ${nColors.border} border flex-shrink-0`}>
                      <NIcon className={`w-3.5 h-3.5 ${nColors.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-700">
                        {node.data.label || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-slate-400">→ outgoing</p>
                    </div>
                    <MousePointerClick className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
          onClick={togglePropertiesPanel}
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
              onClick={handleClose}
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
                  onClick={() => handleEdgeTypeChange(key)}
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
