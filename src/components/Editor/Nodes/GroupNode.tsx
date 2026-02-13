import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '../../../types/core';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

export interface GroupNodeProps extends NodeProps<NodeData> {
  icon: LucideIcon;
  colorClass: string;
  borderColorClass: string;
  headerBgClass: string;
  childCount?: number;
  badges?: { label: string; value: string | number; color?: string }[];
}

/**
 * Base GroupNode component for container types (Department, Agent Pool)
 * Provides resizable container with header, collapse/expand, and child count
 */
export const GroupNode = memo(({
  data,
  selected,
  icon: Icon,
  colorClass,
  borderColorClass,
  headerBgClass,
  childCount = 0,
  badges = [],
}: GroupNodeProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(prev => !prev);
  }, []);

  const minHeight = isCollapsed ? 60 : 150;
  const minWidth = 280;

  return (
    <>
      {/* Resizer - only show when selected and not collapsed */}
      <NodeResizer
        isVisible={selected && !isCollapsed}
        minWidth={minWidth}
        minHeight={minHeight}
        handleClassName="!w-2 !h-2 !bg-white !border-2 !border-indigo-500 !rounded-sm"
        lineClassName="!border-indigo-400"
      />

      <div
        className={`
          rounded-xl border-2 shadow-lg transition-all duration-200
          ${borderColorClass}
          ${selected ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}
          ${isCollapsed ? 'h-[60px]' : 'min-h-[150px] h-full'}
        `}
        style={{ minWidth: `${minWidth}px`, pointerEvents: 'none' }}
      >
        {/* Header */}
        <div
          className={`
            flex items-center gap-3 px-4 py-3 rounded-t-xl cursor-pointer
            ${headerBgClass}
            ${isCollapsed ? 'rounded-b-xl' : ''}
          `}
          onClick={handleToggleCollapse}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Collapse Toggle */}
          <button
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={handleToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight size={16} className="text-gray-600" />
            ) : (
              <ChevronDown size={16} className="text-gray-600" />
            )}
          </button>

          {/* Icon */}
          <div className={`p-2 rounded-lg bg-white/60 border border-black/5`}>
            <Icon size={20} className={colorClass} />
          </div>

          {/* Label and Type */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate">
              {data.label}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
              {data.type.replace('_', ' ')}
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            {childCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-white/80 text-gray-700 rounded-full border border-black/5">
                {childCount} {childCount === 1 ? 'item' : 'items'}
              </span>
            )}
            {badges.map((badge, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-xs font-medium rounded-full border border-black/5 ${badge.color || 'bg-white/80 text-gray-700'}`}
              >
                {badge.label}: {badge.value}
              </span>
            ))}
          </div>
        </div>

        {/* Content Area (when expanded) */}
        {!isCollapsed && (
          <div className="p-4 bg-white/30 rounded-b-xl min-h-[90px]" style={{ pointerEvents: 'none' }}>
            {/* This is where child nodes will be rendered by React Flow */}
            {childCount === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Drop components here
              </div>
            )}
          </div>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-2 !rounded-sm !bg-gray-400 !border-2 !border-white hover:!bg-indigo-500 transition-colors !-top-1"
          style={{ pointerEvents: 'auto' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-4 !h-2 !rounded-sm !bg-gray-400 !border-2 !border-white hover:!bg-indigo-500 transition-colors !-bottom-1"
          style={{ pointerEvents: 'auto' }}
        />
      </div>
    </>
  );
});

GroupNode.displayName = 'GroupNode';
