// =============================================================================
// PM2 Ecosystem Config Generator
// Converts a SystemBundle into a PM2 ecosystem.config.js-compatible object
// =============================================================================

import { AgentConfig } from '@/types/core';
import { SystemBundle, PM2AppConfig, PM2EcosystemConfig } from './types';
import { slugify } from '@/utils/exportHelpers';

// Provider → API key env var mapping
const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

const DEFAULT_MAX_MEMORY = '512M';
const OPENCLAW_AGENT_RUNNER = 'node_modules/.bin/openclaw-runner';

/**
 * Generate a PM2 ecosystem config object from a SystemBundle.
 *
 * Each agent node becomes a PM2 app entry with process name, script path,
 * args pointing to its agent config, environment variables, and default
 * resource limits.
 *
 * The output can be JSON.stringified and written to ecosystem.config.js.
 */
export function generatePm2Config(bundle: SystemBundle): PM2EcosystemConfig {
  const systemSlug = bundle.manifest.slug;
  const apps: PM2AppConfig[] = [];

  for (const [agentSlug, agentConfig] of Object.entries(bundle.agentConfigs)) {
    const app = buildAppConfig(agentSlug, agentConfig, systemSlug, bundle);
    apps.push(app);
  }

  return { apps };
}

function buildAppConfig(
  agentSlug: string,
  agentConfig: AgentConfig,
  systemSlug: string,
  bundle: SystemBundle,
): PM2AppConfig {
  const processName = `${systemSlug}--${slugify(agentConfig.name || agentSlug)}`;

  const env: Record<string, string> = {
    NODE_ENV: 'production',
    SYSTEM_NAME: bundle.manifest.name,
    SYSTEM_SLUG: systemSlug,
    AGENT_NAME: agentConfig.name,
    AGENT_ROLE: agentConfig.role,
  };

  // Map provider to API key env var
  if (agentConfig.provider) {
    const envVar = PROVIDER_ENV_VARS[agentConfig.provider];
    if (envVar) {
      env.API_KEY_ENV_VAR = envVar;
    }
  }

  if (agentConfig.model) {
    env.MODEL = agentConfig.model;
  }

  if (agentConfig.temperature !== undefined) {
    env.TEMPERATURE = String(agentConfig.temperature);
  }

  if (agentConfig.maxTokens !== undefined) {
    env.MAX_TOKENS = String(agentConfig.maxTokens);
  }

  // Add MCP server names so the runner knows which to initialize
  if (agentConfig.mcps.length > 0) {
    env.MCP_SERVERS = agentConfig.mcps.join(',');
  }

  // Propagate env vars from bundle.envExample that this agent needs
  if (agentConfig.provider) {
    const providerKey = PROVIDER_ENV_VARS[agentConfig.provider];
    if (providerKey && bundle.envExample[providerKey]) {
      env[providerKey] = `\${${providerKey}}`;
    }
  }

  const configPath = `agents/${agentSlug}/CLAUDE.md`;

  const app: PM2AppConfig = {
    name: processName,
    script: OPENCLAW_AGENT_RUNNER,
    args: [configPath],
    cwd: `./${systemSlug}`,
    env,
    instances: 1,
    max_memory_restart: DEFAULT_MAX_MEMORY,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 3000,
  };

  // Apply cron restart if the system uses cron triggers
  if (bundle.manifest.triggerPattern === 'cron') {
    app.cron_restart = '0 */6 * * *'; // Default: restart every 6 hours
  }

  return app;
}
