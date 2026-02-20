// =============================================================================
// System Bundle Generator
// Converts React Flow canvas state into a deployable SystemBundle
// =============================================================================

import { Node, Edge } from 'reactflow';
import {
  AgentConfig,
  MCPServerConfig,
  NodeData,
} from '@/types/core';
import {
  SystemBundle,
  SystemManifest,
  SystemCategory,
  PM2EcosystemConfig,
  PM2AppConfig,
} from './types';
import { slugify } from '@/utils/exportHelpers';

// =============================================================================
// Metadata input (from workflowConfig or canvas-level state)
// =============================================================================

export interface BundleMetadata {
  name?: string;
  description?: string;
  version?: string;
  category?: SystemCategory;
  triggerPattern?: 'cron' | 'webhook' | 'messaging' | 'always-on';
  environment?: 'development' | 'staging' | 'production';
}

// =============================================================================
// React Flow internal properties to strip from exported nodes
// =============================================================================

const TRANSIENT_NODE_KEYS = new Set([
  'selected',
  'dragging',
  'width',
  'height',
  'positionAbsolute',
  'measured',
  'resizing',
  'draggable',
  'selectable',
  'connectable',
  'deletable',
  'focusable',
  'internalsSymbol',
]);

const TRANSIENT_DATA_KEYS = new Set(['status', 'logs']);

// =============================================================================
// Provider → API key env var mapping
// =============================================================================

const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

// Default memory limit per agent process
const DEFAULT_MAX_MEMORY = '512M';

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Generate a SystemBundle from React Flow canvas state.
 *
 * Extracts agent configs, deduplicates MCP servers, builds a PM2 ecosystem,
 * and collects required env vars into an .env.example map.
 */
export function generateSystemBundle(
  nodes: Node<NodeData>[],
  edges: Edge[],
  metadata: BundleMetadata = {},
): SystemBundle {
  const systemName = metadata.name || 'Untitled System';
  const systemSlug = slugify(systemName);

  const agentNodes = nodes.filter((n) => n.data.type === 'AGENT');
  const mcpNodes = nodes.filter((n) => n.data.type === 'MCP_SERVER');

  const agentConfigs = extractAgentConfigs(agentNodes);
  const mcpConfigs = collectMcpConfigs(agentNodes, mcpNodes, edges);
  const pm2Ecosystem = buildPm2Ecosystem(agentNodes, systemSlug, metadata.environment);
  const envExample = collectEnvVars(agentConfigs, mcpConfigs);
  const manifest = buildManifest(
    systemName,
    systemSlug,
    metadata,
    nodes,
    edges,
    agentNodes,
  );
  const canvasJson = sanitizeCanvas(nodes, edges);

  return {
    manifest,
    canvasJson,
    agentConfigs,
    mcpConfigs,
    pm2Ecosystem,
    envExample,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// Agent config extraction
// =============================================================================

function extractAgentConfigs(
  agentNodes: Node<NodeData>[],
): Record<string, AgentConfig> {
  const configs: Record<string, AgentConfig> = {};

  for (const node of agentNodes) {
    const config = node.data.config as AgentConfig;
    const key = slugify(config.name || node.data.label);
    configs[key] = { ...config };
  }

  return configs;
}

// =============================================================================
// MCP server collection & deduplication
// =============================================================================

/**
 * Collects MCP server configs from two sources:
 * 1. Standalone MCP_SERVER nodes connected to agents via edges
 * 2. MCP names referenced in each agent's `mcps` array, resolved against
 *    MCP_SERVER nodes by name
 *
 * Returns a deduplicated list keyed by server name.
 */
function collectMcpConfigs(
  agentNodes: Node<NodeData>[],
  mcpNodes: Node<NodeData>[],
  edges: Edge[],
): MCPServerConfig[] {
  const seen = new Map<string, MCPServerConfig>();

  // Index MCP_SERVER nodes by id for edge lookups
  const mcpById = new Map<string, MCPServerConfig>();
  // Index MCP_SERVER nodes by name for reference lookups
  const mcpByName = new Map<string, MCPServerConfig>();

  for (const node of mcpNodes) {
    const config = node.data.config as MCPServerConfig;
    mcpById.set(node.id, config);
    mcpByName.set(config.name, config);
    seen.set(config.name, config);
  }

  // Walk edges to find MCP_SERVER → AGENT connections
  const agentIds = new Set(agentNodes.map((n) => n.id));
  for (const edge of edges) {
    if (mcpById.has(edge.source) && agentIds.has(edge.target)) {
      const config = mcpById.get(edge.source)!;
      seen.set(config.name, config);
    }
    if (mcpById.has(edge.target) && agentIds.has(edge.source)) {
      const config = mcpById.get(edge.target)!;
      seen.set(config.name, config);
    }
  }

  // Resolve agent mcps[] references against MCP_SERVER nodes
  for (const node of agentNodes) {
    const agentConfig = node.data.config as AgentConfig;
    for (const mcpName of agentConfig.mcps ?? []) {
      const resolved = mcpByName.get(mcpName);
      if (resolved && !seen.has(resolved.name)) {
        seen.set(resolved.name, resolved);
      }
    }
  }

  return Array.from(seen.values());
}

// =============================================================================
// PM2 ecosystem generation
// =============================================================================

function buildPm2Ecosystem(
  agentNodes: Node<NodeData>[],
  systemSlug: string,
  environment?: string,
): PM2EcosystemConfig {
  const apps: PM2AppConfig[] = agentNodes.map((node) => {
    const config = node.data.config as AgentConfig;
    const agentSlug = slugify(config.name || node.data.label);
    const processName = `${systemSlug}--${agentSlug}`;

    const env: Record<string, string> = {
      NODE_ENV: environment || 'production',
      AGENT_NAME: config.name || node.data.label,
      AGENT_ROLE: config.role,
    };

    if (config.provider) {
      const envVar = PROVIDER_ENV_VARS[config.provider];
      if (envVar) {
        env.API_KEY_ENV_VAR = envVar;
      }
    }

    if (config.model) {
      env.MODEL = config.model;
    }

    const app: PM2AppConfig = {
      name: processName,
      script: `agents/${agentSlug}/index.js`,
      cwd: `./${systemSlug}`,
      interpreter: 'node',
      env,
      max_memory_restart: DEFAULT_MAX_MEMORY,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    };

    return app;
  });

  return { apps };
}

// =============================================================================
// Env var collection
// =============================================================================

/**
 * Scans agent configs and MCP configs for references to API keys / secrets.
 * Returns an env var name → placeholder description map for .env.example.
 */
function collectEnvVars(
  agentConfigs: Record<string, AgentConfig>,
  mcpConfigs: MCPServerConfig[],
): Record<string, string> {
  const envVars: Record<string, string> = {};

  // Collect provider API keys from agents
  const providers = new Set<string>();
  for (const config of Object.values(agentConfigs)) {
    if (config.provider) {
      providers.add(config.provider);
    }
  }

  for (const provider of providers) {
    const envVar = PROVIDER_ENV_VARS[provider];
    if (envVar) {
      envVars[envVar] = `# ${provider} API key`;
    }
  }

  // Collect env vars from MCP server configs
  for (const mcp of mcpConfigs) {
    if (mcp.env) {
      for (const key of Object.keys(mcp.env)) {
        if (!envVars[key]) {
          envVars[key] = `# Required by MCP server: ${mcp.name}`;
        }
      }
    }

    // Auth env vars
    if (mcp.auth?.envVar && !envVars[mcp.auth.envVar]) {
      envVars[mcp.auth.envVar] = `# Auth credential for MCP server: ${mcp.name}`;
    }
  }

  return envVars;
}

// =============================================================================
// Manifest generation
// =============================================================================

function buildManifest(
  name: string,
  slug: string,
  metadata: BundleMetadata,
  allNodes: Node<NodeData>[],
  edges: Edge[],
  agentNodes: Node<NodeData>[],
): SystemManifest {
  return {
    name,
    slug,
    description: metadata.description || `System: ${name}`,
    version: metadata.version || '1.0.0',
    category: metadata.category || inferCategory(agentNodes),
    requiredInputs: [],
    outputType: 'data',
    estimatedCostUsd: 0,
    triggerPattern: metadata.triggerPattern || 'messaging',
    nodeCount: allNodes.length,
    edgeCount: edges.length,
  };
}

/**
 * Simple heuristic to infer system category from agent roles/names.
 */
function inferCategory(agentNodes: Node<NodeData>[]): SystemCategory {
  const labels = agentNodes
    .map((n) => `${n.data.label} ${(n.data.config as AgentConfig).description || ''}`)
    .join(' ')
    .toLowerCase();

  if (/monitor|alert|observ|health/.test(labels)) return 'monitoring';
  if (/research|analyz|scrape|crawl/.test(labels)) return 'research';
  if (/data|etl|pipeline|transform/.test(labels)) return 'data-analysis';
  if (/content|write|blog|copy|edit/.test(labels)) return 'content-production';
  return 'web-development';
}

// =============================================================================
// Canvas sanitization
// =============================================================================

/**
 * Strip React Flow internal / transient properties from nodes and edges.
 * Only keeps user-meaningful state needed for deployment.
 */
function sanitizeCanvas(
  nodes: Node<NodeData>[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: nodes.map(sanitizeNode) as Node[],
    edges: edges.map(sanitizeEdge),
  };
}

function sanitizeNode(node: Node<NodeData>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (TRANSIENT_NODE_KEYS.has(key)) continue;
    clean[key] = value;
  }

  // Sanitize nested data — strip status/logs
  if (node.data) {
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node.data)) {
      if (!TRANSIENT_DATA_KEYS.has(key)) {
        cleanData[key] = value;
      }
    }
    clean.data = cleanData;
  }

  // Preserve only width/height from style (not React Flow visual cruft)
  if (node.style) {
    const style: Record<string, unknown> = {};
    if (typeof node.style.width === 'number') style.width = node.style.width;
    if (typeof node.style.height === 'number') style.height = node.style.height;
    if (Object.keys(style).length > 0) {
      clean.style = style;
    } else {
      delete clean.style;
    }
  }

  return clean;
}

function sanitizeEdge(edge: Edge): Edge {
  const { selected, ...rest } = edge as Edge & { selected?: boolean };
  void selected;
  return rest;
}
