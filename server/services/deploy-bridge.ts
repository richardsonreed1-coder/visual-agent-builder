// =============================================================================
// Deploy Bridge Service
// Translates AUTOPILATE canvas state → OpenClaw runtime configuration
// Atomic deployment: if any step fails, all partial artifacts are cleaned up
// =============================================================================

import * as fs from 'fs/promises';
import * as path from 'path';
import { pool } from '../db';
import {
  SystemBundle,
  DeploymentRecord,
  AgentConfigSlim,
  MCPServerConfigSlim,
} from '../types/registry';
import { registerSystem, updateSystemStatus } from './registry';
import {
  createTriggerConfig,
  removeTriggerConfig,
  TriggerConfig,
} from './trigger-factory';
import { startProcess, deleteProcess } from './pm2-manager';
import { DeploymentError } from '../../shared/errors';

// Re-export for backward compat in route handlers
export { DeploymentError as DeployError };

interface DeployArtifacts {
  systemDir: string | null;
  mcpConfigDir: string | null;
  triggerConfig: TriggerConfig | null;
  deploymentRecord: DeploymentRecord | null;
  pm2ProcessName: string | null;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Deploy a system bundle to the OpenClaw runtime.
 *
 * Steps (atomic — rolls back on failure):
 *   1. Write per-agent CLAUDE.md config files
 *   2. Write MCP server configs
 *   3. Generate trigger configuration
 *   4. Register in PostgreSQL deployment registry
 *   5. Start the PM2 process
 */
export async function deploySystem(
  bundle: SystemBundle,
  openclawRoot: string
): Promise<DeploymentRecord> {
  const { manifest } = bundle;
  const systemSlug = manifest.slug;

  const artifacts: DeployArtifacts = {
    systemDir: null,
    mcpConfigDir: null,
    triggerConfig: null,
    deploymentRecord: null,
    pm2ProcessName: null,
  };

  try {
    // Step 1: Write agent config files
    artifacts.systemDir = await writeAgentConfigs(
      bundle.agentConfigs,
      systemSlug,
      openclawRoot
    );

    // Step 2: Write MCP server configs
    artifacts.mcpConfigDir = await writeMcpConfigs(
      bundle.mcpConfigs,
      systemSlug,
      openclawRoot
    );

    // Step 3: Generate trigger configuration
    artifacts.triggerConfig = await createTriggerConfig(
      manifest.triggerPattern,
      manifest,
      openclawRoot
    );

    // Step 4: Register in deployment registry
    artifacts.deploymentRecord = await registerDeployment(
      bundle,
      artifacts.triggerConfig
    );

    // Step 5: Start PM2 process
    const pm2ProcessName = `autopilate-${systemSlug}`;
    artifacts.pm2ProcessName = pm2ProcessName;

    const mainApp = bundle.pm2Ecosystem.apps[0];
    if (!mainApp) {
      throw new DeploymentError(
        'PM2_NO_CONFIG',
        'No PM2 app config found in bundle',
        'pm2-start'
      );
    }

    // Override cwd to point to the OpenClaw system directory
    await startProcess({
      ...mainApp,
      name: pm2ProcessName,
      cwd: path.join(openclawRoot, 'agents', systemSlug),
    });

    return artifacts.deploymentRecord;
  } catch (err) {
    await rollback(artifacts, systemSlug, openclawRoot);

    if (err instanceof DeploymentError) throw err;
    throw new DeploymentError(
      'FAILED',
      `Deployment failed for ${systemSlug}: ${err instanceof Error ? err.message : String(err)}`,
      'unknown',
      err
    );
  }
}

// -----------------------------------------------------------------------------
// Step 1: Write per-agent CLAUDE.md files
// -----------------------------------------------------------------------------

async function writeAgentConfigs(
  agentConfigs: Record<string, AgentConfigSlim>,
  systemSlug: string,
  openclawRoot: string
): Promise<string> {
  const systemDir = path.join(openclawRoot, 'agents', systemSlug);

  for (const [agentSlug, config] of Object.entries(agentConfigs)) {
    const agentDir = path.join(systemDir, agentSlug);
    await fs.mkdir(agentDir, { recursive: true });

    const claudeMd = generateAgentClaudeMd(config, agentSlug, systemSlug);
    await fs.writeFile(path.join(agentDir, 'CLAUDE.md'), claudeMd, 'utf-8');
  }

  return systemDir;
}

function generateAgentClaudeMd(
  config: AgentConfigSlim,
  _agentSlug: string,
  systemSlug: string
): string {
  const sections: string[] = [`# ${config.name}\n\nSystem: ${systemSlug}\nRole: ${config.role}`];
  if (config.description) sections.push(`## Description\n\n${config.description}`);
  if (config.systemPrompt) sections.push(`## System Prompt\n\n${config.systemPrompt}`);
  if (config.provider) {
    const model = config.model ? `\n- Model: ${config.model}` : '';
    sections.push(`## Model Configuration\n\n- Provider: ${config.provider}${model}`);
  }
  if (config.mcps.length > 0) {
    sections.push(`## MCP Servers\n\n${config.mcps.map((m) => `- ${m}`).join('\n')}`);
  }
  return sections.join('\n\n') + '\n';
}

// -----------------------------------------------------------------------------
// Step 2: Write MCP server configs
// -----------------------------------------------------------------------------

async function writeMcpConfigs(
  mcpConfigs: MCPServerConfigSlim[],
  systemSlug: string,
  openclawRoot: string
): Promise<string> {
  const mcpDir = path.join(openclawRoot, 'config', 'mcp', systemSlug);
  await fs.mkdir(mcpDir, { recursive: true });

  for (const config of mcpConfigs) {
    const fileName = `${config.name}.json`;
    const configPayload = {
      name: config.name,
      command: config.command,
      args: config.args ?? [],
      env: config.env ?? {},
    };

    await fs.writeFile(
      path.join(mcpDir, fileName),
      JSON.stringify(configPayload, null, 2),
      'utf-8'
    );
  }

  return mcpDir;
}

// -----------------------------------------------------------------------------
// Step 4: Register deployment with trigger config
// -----------------------------------------------------------------------------

async function registerDeployment(
  bundle: SystemBundle,
  triggerConfig: TriggerConfig
): Promise<DeploymentRecord> {
  const record = await registerSystem(bundle);

  // Update the trigger_config and openclaw_config columns
  await pool.query(
    `UPDATE deployments
     SET trigger_config = $1::jsonb,
         openclaw_config = $2::jsonb,
         updated_at = now()
     WHERE id = $3`,
    [
      JSON.stringify(triggerConfig),
      JSON.stringify({
        agentDir: `agents/${bundle.manifest.slug}`,
        mcpDir: `config/mcp/${bundle.manifest.slug}`,
        triggerFile: `config/triggers/${bundle.manifest.slug}.json`,
      }),
      record.id,
    ]
  );

  return {
    ...record,
    triggerConfig,
    openclawConfig: {
      agentDir: `agents/${bundle.manifest.slug}`,
      mcpDir: `config/mcp/${bundle.manifest.slug}`,
      triggerFile: `config/triggers/${bundle.manifest.slug}.json`,
    },
  };
}

// -----------------------------------------------------------------------------
// Rollback: Clean up partial artifacts on failure
// -----------------------------------------------------------------------------

async function rollback(
  artifacts: DeployArtifacts,
  systemSlug: string,
  openclawRoot: string
): Promise<void> {
  const errors: string[] = [];

  const cleanupSteps: Array<{ guard: unknown; label: string; fn: () => Promise<void> }> = [
    { guard: artifacts.pm2ProcessName, label: 'PM2', fn: () => deleteProcess(artifacts.pm2ProcessName!) },
    { guard: artifacts.deploymentRecord, label: 'Registry', fn: () => updateSystemStatus(systemSlug, 'errored') },
    { guard: artifacts.triggerConfig, label: 'Trigger', fn: () => removeTriggerConfig(systemSlug, openclawRoot) },
    { guard: artifacts.mcpConfigDir, label: 'MCP config', fn: () => fs.rm(artifacts.mcpConfigDir!, { recursive: true, force: true }) },
    { guard: artifacts.systemDir, label: 'Agent dir', fn: () => fs.rm(artifacts.systemDir!, { recursive: true, force: true }) },
  ];

  for (const step of cleanupSteps) {
    if (!step.guard) continue;
    try {
      await step.fn();
    } catch (err) {
      errors.push(`${step.label} cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    console.error(`[deploy-bridge] Rollback encountered errors:\n  ${errors.join('\n  ')}`);
  }
}
