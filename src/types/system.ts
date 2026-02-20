import { SystemManifest, TriggerPattern } from '@/export/types';

// =============================================================================
// Deployment Record (maps to `deployments` table)
// =============================================================================

export type DeploymentStatus = 'deployed' | 'stopped' | 'errored' | 'archived';

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
  secretsEncrypted: Uint8Array | null;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Execution Log (maps to `execution_logs` table)
// =============================================================================

export type ExecutionTriggeredBy = 'cron' | 'webhook' | 'messaging' | 'manual' | 'operator';

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'qa_failed';

export type ExecutionOutputType = 'web_artifact' | 'document' | 'data' | 'notification';

export interface QAScores {
  [dimension: string]: number;
}

export interface ExecutionLog {
  id: string;
  deploymentId: string;
  triggeredBy: ExecutionTriggeredBy;
  triggerInput: unknown;
  status: ExecutionStatus;
  phasesCompleted: number;
  phasesTotal: number;
  outputUrl: string | null;
  outputType: ExecutionOutputType;
  costUsd: number;
  durationSeconds: number;
  qaScores: QAScores | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}
