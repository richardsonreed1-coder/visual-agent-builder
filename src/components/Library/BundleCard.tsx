import React, { useState } from 'react';
import { InventoryItem, BundleComponent } from '../../services/api';
import {
  Package,
  ChevronRight,
  ChevronDown,
  Bot,
  Terminal,
  Sparkles,
  Anchor,
  GripVertical,
} from 'lucide-react';
import { NodeType } from '../../types/core';

interface BundleCardProps {
  bundle: InventoryItem;
  onDragStart: (e: React.DragEvent, item: InventoryItem | BundleComponent, isBundle?: boolean) => void;
}

// Map category to icon and color
const categoryConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; nodeType: NodeType }
> = {
  agents: { icon: Bot, color: 'text-blue-600', bgColor: 'bg-blue-100', nodeType: 'AGENT' },
  commands: { icon: Terminal, color: 'text-emerald-600', bgColor: 'bg-emerald-100', nodeType: 'COMMAND' },
  skills: { icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-100', nodeType: 'SKILL' },
  hooks: { icon: Anchor, color: 'text-rose-600', bgColor: 'bg-rose-100', nodeType: 'HOOK' },
};

export const BundleCard: React.FC<BundleCardProps> = ({ bundle, onDragStart }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!bundle.bundleData) return null;

  const { components, totalCount } = bundle.bundleData;

  // Count components by type
  const counts = {
    agents: components.agents.length,
    commands: components.commands.length,
    skills: components.skills.length,
    hooks: components.hooks.length,
  };

  // Filter to only show categories with components
  const activeCategories = (Object.keys(counts) as Array<keyof typeof counts>).filter(
    (key) => counts[key] > 0
  );

  const handleBundleDragStart = (e: React.DragEvent) => {
    onDragStart(e, bundle, true);
  };

  const handleComponentDragStart = (e: React.DragEvent, comp: BundleComponent) => {
    e.stopPropagation();
    onDragStart(e, comp, false);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Bundle Header */}
      <div
        className="p-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse */}
          <div className="text-slate-400">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* Bundle Icon */}
          <div className="p-1.5 bg-indigo-100 rounded">
            <Package size={16} className="text-indigo-600" />
          </div>

          {/* Name and Drag Handle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 truncate">{bundle.name}</span>
              <div
                className="p-1 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={handleBundleDragStart}
                onClick={(e) => e.stopPropagation()}
                title="Drag to add all components to canvas"
              >
                <GripVertical size={14} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Total Count Badge */}
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {totalCount}
          </span>
        </div>

        {/* Description */}
        {bundle.description && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-2 pl-7">{bundle.description}</p>
        )}

        {/* Category Badges */}
        <div className="flex flex-wrap gap-1.5 mt-2 pl-7">
          {activeCategories.map((cat) => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
              >
                <Icon size={10} />
                {counts[cat]} {cat}
              </span>
            );
          })}
        </div>
      </div>

      {/* Expanded Component List */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 space-y-2">
          {activeCategories.map((cat) => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            const comps = components[cat];

            return (
              <div key={cat}>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <Icon size={10} />
                  {cat}
                </div>
                <div className="space-y-0.5">
                  {comps.map((comp) => (
                    <div
                      key={comp.path}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-grab active:cursor-grabbing text-sm group"
                      draggable
                      onDragStart={(e) => handleComponentDragStart(e, comp)}
                    >
                      <Icon size={12} className={config.color} />
                      <span className="text-slate-700 truncate flex-1" title={comp.description}>
                        {comp.name}
                      </span>
                      <GripVertical
                        size={12}
                        className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
