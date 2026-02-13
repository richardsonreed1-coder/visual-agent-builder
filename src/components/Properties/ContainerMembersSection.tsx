import { useState } from 'react';
import {
  Bot,
  ChevronRight,
  ChevronDown,
  Network,
  Layers,
  MousePointerClick,
} from 'lucide-react';
import { NodeType, NODE_TYPE_INFO } from '../../types/core';
import { nodeTypeIcons, nodeTypeColors } from './nodeTypeConstants';
import useStore from '../../store/useStore';

interface ContainerMembersSectionProps {
  childNodes: ReturnType<typeof useStore.getState>['nodes'];
  connectedNodes: {
    outgoing: ReturnType<typeof useStore.getState>['nodes'];
    incoming: ReturnType<typeof useStore.getState>['nodes'];
  };
  onSelectNode: (node: ReturnType<typeof useStore.getState>['nodes'][0]) => void;
}

export const ContainerMembersSection = ({ childNodes, connectedNodes, onSelectNode }: ContainerMembersSectionProps) => {
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
