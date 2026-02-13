import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, NodeType } from '../../../types/core';
import {
  Bot as BotIcon,
  Code2 as SkillIcon,
  Plug as PluginIcon,
  Hammer as ToolIcon,
  Cloud as ProviderIcon,
  Workflow as HookIcon,
  Terminal as CommandIcon,
  BrainCircuit as ReasoningIcon,
  Building2 as DepartmentIcon,
  Users as AgentPoolIcon,
  Server as MCPServerIcon,
  LucideIcon,
} from 'lucide-react';

const icons: Record<NodeType, LucideIcon> = {
  AGENT: BotIcon,
  SKILL: SkillIcon,
  PLUGIN: PluginIcon,
  TOOL: ToolIcon,
  PROVIDER: ProviderIcon,
  HOOK: HookIcon,
  COMMAND: CommandIcon,
  REASONING: ReasoningIcon,
  DEPARTMENT: DepartmentIcon,
  AGENT_POOL: AgentPoolIcon,
  MCP_SERVER: MCPServerIcon,
};

const typeColors: Record<NodeType, string> = {
  AGENT: 'border-blue-500 bg-blue-50 hover:border-blue-600',
  SKILL: 'border-green-500 bg-green-50 hover:border-green-600',
  PLUGIN: 'border-purple-500 bg-purple-50 hover:border-purple-600',
  TOOL: 'border-amber-500 bg-amber-50 hover:border-amber-600',
  PROVIDER: 'border-cyan-500 bg-cyan-50 hover:border-cyan-600',
  HOOK: 'border-pink-500 bg-pink-50 hover:border-pink-600',
  COMMAND: 'border-slate-500 bg-slate-50 hover:border-slate-600',
  REASONING: 'border-indigo-500 bg-indigo-50 hover:border-indigo-600',
  DEPARTMENT: 'border-orange-500 bg-orange-50 hover:border-orange-600',
  AGENT_POOL: 'border-teal-500 bg-teal-50 hover:border-teal-600',
  MCP_SERVER: 'border-violet-500 bg-violet-50 hover:border-violet-600',
};

export const CustomNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const Icon = icons[data.type] || BotIcon;
  const colorClass = typeColors[data.type] || 'border-gray-500 bg-white';

  return (
    <div className={`shadow-lg rounded-lg border-2 p-3 min-w-[180px] transition-all duration-200 ${colorClass} ${selected ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white hover:!bg-indigo-500 transition-colors" 
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-full bg-white/50 border border-black/5`}>
            <Icon size={20} className="text-gray-700" />
        </div>
        <div>
            <div className="font-bold text-sm text-gray-900 leading-tight">{data.label}</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mt-0.5">{data.type}</div>
        </div>
      </div>

      {Object.keys(data.config || {}).length > 0 && (
        <div className="mt-2 pt-2 border-t border-black/5 text-xs text-gray-600">
           {Object.keys(data.config).length} config props
        </div>
      )}

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white hover:!bg-indigo-500 transition-colors" 
      />
    </div>
  );
});