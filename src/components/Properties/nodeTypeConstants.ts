import {
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
} from 'lucide-react';
import { NodeType } from '../../types/core';

// Map node types to icons
export const nodeTypeIcons: Record<NodeType, LucideIcon> = {
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
export const nodeTypeColors: Record<NodeType, { bg: string; text: string; border: string }> = {
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
