// =============================================================================
// Deployment Registry Types (server-side, no React Flow dependency)
// =============================================================================

export type TriggerPattern = 'cron' | 'webhook' | 'messaging' | 'always-on';

export type SystemCategory =
  | 'web-development'
  | 'content-production'
  | 'research'
  | 'data-analysis'
  | 'monitoring';

export type SystemOutputType = 'web_artifact' | 'document' | 'data' | 'notification';

export type DeploymentStatus = 'deployed' | 'stopped' | 'errored' | 'archived';

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

// PM2 config types (server-side mirror of frontend export types)
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

// Minimal agent config shape for deploy bridge (avoids React Flow dependency)
export interface AgentConfigSlim {
  name: string;
  role: string;
  description?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  mcps: string[];
  [key: string]: unknown;
}

// Minimal MCP server config shape for deploy bridge
export interface MCPServerConfigSlim {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  [key: string]: unknown;
}

export interface SystemBundle {
  manifest: SystemManifest;
  canvasJson: unknown;
  agentConfigs: Record<string, AgentConfigSlim>;
  mcpConfigs: MCPServerConfigSlim[];
  pm2Ecosystem: PM2EcosystemConfig;
  envExample: Record<string, string>;
  createdAt: string;
}

export interface DeploymentRecord {
  id: string;
  systemName: string;
  systemSlug: string;
  manifestJson: SystemManifest;
  canvasJson: unknown;
  openclawConfig: unknown;
  triggerType: TriggerPattern;
  triggerConfig: unknown;
  pm2ProcessName: string;
  status: DeploymentStatus;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}
