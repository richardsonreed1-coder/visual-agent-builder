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

export interface SystemBundle {
  manifest: SystemManifest;
  canvasJson: unknown;
  agentConfigs: Record<string, unknown>;
  mcpConfigs: unknown[];
  pm2Ecosystem: unknown;
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
