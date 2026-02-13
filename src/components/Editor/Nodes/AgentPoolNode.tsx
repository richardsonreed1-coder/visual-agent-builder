import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeData, AgentPoolConfig } from '../../../types/core';
import { GroupNode } from './GroupNode';
import { Users } from 'lucide-react';
import useStore from '../../../store/useStore';

/**
 * Agent Pool Node - Container for grouping Agents with scaling configuration
 * Represents pools like Browser Agent, Market Intel, News Monitor, etc.
 */
export const AgentPoolNode = memo((props: NodeProps<NodeData>) => {
  const { nodes } = useStore();
  const config = props.data.config as AgentPoolConfig;

  // Count child agent nodes
  const childCount = nodes.filter(n => n.parentId === props.id).length;

  // Build badges for scaling info
  const badges = [];

  if (config?.scaling) {
    const { minInstances, maxInstances, concurrency } = config.scaling;
    badges.push({
      label: 'Scale',
      value: `${minInstances}-${maxInstances}`,
      color: 'bg-teal-100 text-teal-700',
    });
    if (concurrency && concurrency > 1) {
      badges.push({
        label: 'Conc',
        value: concurrency,
        color: 'bg-blue-100 text-blue-700',
      });
    }
  }

  if (config?.loadBalancing && config.loadBalancing !== 'round-robin') {
    badges.push({
      label: 'LB',
      value: config.loadBalancing === 'least-loaded' ? 'Least' : 'Random',
      color: 'bg-purple-100 text-purple-700',
    });
  }

  if (config?.failoverChain && config.failoverChain.length > 0) {
    badges.push({
      label: 'Failover',
      value: config.failoverChain.length,
      color: 'bg-amber-100 text-amber-700',
    });
  }

  return (
    <GroupNode
      {...props}
      icon={Users}
      colorClass="text-teal-600"
      borderColorClass="border-teal-400"
      headerBgClass="bg-gradient-to-r from-teal-100 to-teal-50"
      childCount={childCount}
      badges={badges}
    />
  );
});

AgentPoolNode.displayName = 'AgentPoolNode';
