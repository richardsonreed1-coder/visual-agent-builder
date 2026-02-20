import { Node, Edge } from 'reactflow';
import { AgentConfig, MCPServerConfig } from '@/types/core';

// =============================================================================
// System Manifest
// =============================================================================

export type SystemCategory =
  | 'web-development'
  | 'content-production'
  | 'research'
  | 'data-analysis'
  | 'monitoring';

export type SystemOutputType = 'web_artifact' | 'document' | 'data' | 'notification';

export type TriggerPattern = 'cron' | 'webhook' | 'messaging' | 'always-on';

export interface RequiredInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface SystemManifest {
  name: string;
  slug: string;
  description: string;
  version: string;
  category: SystemCategory;
  requiredInputs: RequiredInput[];
  outputType: SystemOutputType;
  estimatedCostUsd: number;
  triggerPattern: TriggerPattern;
  nodeCount: number;
  edgeCount: number;
}

// =============================================================================
// PM2 Ecosystem Config
// =============================================================================

export interface PM2AppConfig {
  name: string;
  script: string;
  args?: string[];
  cwd?: string;
  interpreter?: string;
  env?: Record<string, string>;
  instances?: number;
  max_memory_restart?: string;
  cron_restart?: string;
  autorestart?: boolean;
  watch?: boolean;
  max_restarts?: number;
  restart_delay?: number;
}

export interface PM2EcosystemConfig {
  apps: PM2AppConfig[];
}

// =============================================================================
// System Bundle
// =============================================================================

export interface SystemBundle {
  manifest: SystemManifest;
  canvasJson: {
    nodes: Node[];
    edges: Edge[];
  };
  agentConfigs: Record<string, AgentConfig>;
  mcpConfigs: MCPServerConfig[];
  pm2Ecosystem: PM2EcosystemConfig;
  envExample: Record<string, string>;
  createdAt: string;
}
