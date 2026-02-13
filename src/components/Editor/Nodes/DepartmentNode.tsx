import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeData, DepartmentConfig } from '../../../types/core';
import { GroupNode } from './GroupNode';
import { Building2 } from 'lucide-react';
import useStore from '../../../store/useStore';

/**
 * Department Node - Top-level container for organizing Agent Pools
 * Represents organizational units like Research, DevOps, AI-ML, Communications, Operations
 */
export const DepartmentNode = memo((props: NodeProps<NodeData>) => {
  const { nodes } = useStore();
  const config = props.data.config as DepartmentConfig;

  // Count child nodes (Agent Pools and direct Agents)
  const childCount = nodes.filter(n => n.parentId === props.id).length;

  // Get color theme from config
  const colorTheme = config?.color || 'slate';

  // Color mappings for different department themes
  const colorMappings: Record<string, {
    colorClass: string;
    borderColorClass: string;
    headerBgClass: string;
  }> = {
    blue: {
      colorClass: 'text-blue-600',
      borderColorClass: 'border-blue-400',
      headerBgClass: 'bg-gradient-to-r from-blue-100 to-blue-50',
    },
    green: {
      colorClass: 'text-green-600',
      borderColorClass: 'border-green-400',
      headerBgClass: 'bg-gradient-to-r from-green-100 to-green-50',
    },
    purple: {
      colorClass: 'text-purple-600',
      borderColorClass: 'border-purple-400',
      headerBgClass: 'bg-gradient-to-r from-purple-100 to-purple-50',
    },
    orange: {
      colorClass: 'text-orange-600',
      borderColorClass: 'border-orange-400',
      headerBgClass: 'bg-gradient-to-r from-orange-100 to-orange-50',
    },
    teal: {
      colorClass: 'text-teal-600',
      borderColorClass: 'border-teal-400',
      headerBgClass: 'bg-gradient-to-r from-teal-100 to-teal-50',
    },
    pink: {
      colorClass: 'text-pink-600',
      borderColorClass: 'border-pink-400',
      headerBgClass: 'bg-gradient-to-r from-pink-100 to-pink-50',
    },
    slate: {
      colorClass: 'text-slate-600',
      borderColorClass: 'border-slate-400',
      headerBgClass: 'bg-gradient-to-r from-slate-100 to-slate-50',
    },
  };

  const colors = colorMappings[colorTheme] || colorMappings.slate;

  // Build badges
  const badges = [];
  if (config?.priority && config.priority !== 5) {
    badges.push({
      label: 'Priority',
      value: config.priority,
      color: config.priority > 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700',
    });
  }

  return (
    <GroupNode
      {...props}
      icon={Building2}
      colorClass={colors.colorClass}
      borderColorClass={colors.borderColorClass}
      headerBgClass={colors.headerBgClass}
      childCount={childCount}
      badges={badges}
    />
  );
});

DepartmentNode.displayName = 'DepartmentNode';
