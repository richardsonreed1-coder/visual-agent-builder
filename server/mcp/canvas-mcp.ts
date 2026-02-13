// =============================================================================
// Canvas MCP Server
// Provides tools for AI agents to manipulate the React Flow canvas
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import {
  emitNodeCreated,
  emitNodeUpdated,
  emitNodeDeleted,
  emitEdgeCreated,
  emitEdgeDeleted,
} from '../socket/emitter';
import { CanvasNodePayload, CanvasEdgePayload } from '../../shared/socket-events';
import { SANDBOX_ROOT } from './sandbox-mcp';

// Layout file path
const LAYOUT_FILE = path.join(SANDBOX_ROOT, 'layout.json');

// =============================================================================
// Node Type Normalization
// =============================================================================
// Maps lowercase-hyphenated types from Architect/Builder to UPPERCASE_UNDERSCORE
// types expected by the frontend schema system.

const NODE_TYPE_MAP: Record<string, string> = {
  // Standard types (lowercase → UPPERCASE)
  'agent': 'AGENT',
  'skill': 'SKILL',
  'plugin': 'PLUGIN',
  'tool': 'TOOL',
  'provider': 'PROVIDER',
  'hook': 'HOOK',
  'command': 'COMMAND',
  'reasoning': 'REASONING',
  'department': 'DEPARTMENT',
  'agent-pool': 'AGENT_POOL',
  'mcp-server': 'MCP_SERVER',

  // Already uppercase (passthrough)
  'AGENT': 'AGENT',
  'SKILL': 'SKILL',
  'PLUGIN': 'PLUGIN',
  'TOOL': 'TOOL',
  'PROVIDER': 'PROVIDER',
  'HOOK': 'HOOK',
  'COMMAND': 'COMMAND',
  'REASONING': 'REASONING',
  'DEPARTMENT': 'DEPARTMENT',
  'AGENT_POOL': 'AGENT_POOL',
  'MCP_SERVER': 'MCP_SERVER',
};

/**
 * Phase 6.2: Generate a default system prompt for agents that don't have one.
 * This ensures agents are not "empty shells" when created.
 *
 * @param label - The display name of the agent
 * @param role - Optional role description
 * @returns A descriptive system prompt
 */
function generateDefaultSystemPrompt(label: string, role?: string): string {
  const agentRole = role || 'executor';
  return `You are ${label}, an AI agent specialized in ${agentRole} tasks.

Your responsibilities:
- Execute tasks efficiently and report status clearly
- Collaborate with other agents when needed
- Follow the established workflow patterns

Always be helpful, accurate, and concise in your responses.`;
}

// =============================================================================
// Phase 7: Comprehensive Node Defaults
// =============================================================================
// When nodes are created by the Builder, they often arrive with sparse config.
// These defaults ensure every node type is "ready to run" out of the box.

/**
 * Infer the best model for an agent based on its role.
 * Leaders/orchestrators get Opus, specialists get Sonnet.
 */
function inferModel(role?: string): string {
  const leaderRoles = ['orchestrator', 'leader', 'router', 'director', 'supervisor'];
  if (role && leaderRoles.some(r => role.toLowerCase().includes(r))) {
    return 'claude-opus-4-20250514';
  }
  return 'claude-sonnet-4-20250514';
}

/**
 * Infer the temperature for an agent based on its role.
 * Creative roles get higher temp, analytical roles get lower.
 */
function inferTemperature(role?: string, label?: string): number {
  const creativeKeywords = ['writer', 'script', 'creative', 'brief', 'outreach', 'content'];
  const analyticalKeywords = ['analyst', 'assessment', 'risk', 'legal', 'normaliz', 'parser', 'monitor', 'audit'];
  const combined = `${role || ''} ${label || ''}`.toLowerCase();
  if (creativeKeywords.some(k => combined.includes(k))) return 0.8;
  if (analyticalKeywords.some(k => combined.includes(k))) return 0.3;
  return 0.7;
}

/**
 * Infer permissions based on the agent's role and label.
 * Returns flat keys matching the schema field keys in schemas.ts.
 */
function inferPermissions(role?: string, label?: string): Record<string, unknown> {
  const combined = `${role || ''} ${label || ''}`.toLowerCase();
  const isLeader = ['lead', 'director', 'supervisor', 'orchestrator'].some(k => combined.includes(k));
  return {
    permissionMode: isLeader ? 'bypassPermissions' : 'default',
    disallowedTools: [],
    requiresApprovalFor: isLeader ? [] : ['Shell Commands'],
  };
}

/**
 * Generate comprehensive defaults for an AGENT node.
 *
 * CRITICAL: Field keys MUST match the schema field keys in schemas.ts exactly.
 * The DynamicForm uses react-hook-form with these keys to read/write values.
 *
 * Schema uses DOT NOTATION for nested fields:
 *   - 'guardrails.tokenLimit' (NOT flat 'tokenLimit')
 *   - 'observability.logging.level' (NOT flat 'logLevel')
 *   - 'memory.contextPersistence' (NOT flat 'contextPersistence')
 *
 * But FLAT keys for top-level fields:
 *   - 'provider', 'model', 'temperature', 'role', 'permissionMode', etc.
 */
function enrichAgentConfig(label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  const role = (incoming.role as string) || 'specialist';
  const model = (incoming.model as string) || inferModel(role);
  const temperature = (incoming.temperature as number) ?? inferTemperature(role, label);
  const permissions = inferPermissions(role, label);

  // Infer guardrail values based on agent purpose
  const combined = `${role} ${label}`.toLowerCase();
  const isOutward = ['outreach', 'email', 'follow-up', 'script'].some(k => combined.includes(k));

  const defaults: Record<string, unknown> = {
    // =========================================================================
    // Identity section (flat keys — schema: 'label', 'description')
    // =========================================================================
    label: label,
    description: incoming.description || `${label} - ${role} agent`,
    teamName: '',

    // =========================================================================
    // Agent Role section (flat keys — schema: 'roleCategory', 'role')
    // =========================================================================
    roleCategory: inferRoleCategory(role),
    role: role,

    // =========================================================================
    // Model section (flat keys)
    // =========================================================================
    provider: 'anthropic',
    model: model,
    temperature: temperature,
    thinkingMode: '',
    contextWindow: '',
    reservedOutputTokens: '',

    // =========================================================================
    // Permissions section (flat keys)
    // =========================================================================
    ...permissions,

    // =========================================================================
    // Capabilities section (flat keys — arrays)
    // =========================================================================
    skills: [],
    mcps: [],
    commands: [],

    // =========================================================================
    // System Prompt section (flat key)
    // =========================================================================
    systemPrompt: generateDefaultSystemPrompt(label, role),

    // =========================================================================
    // Advanced section (flat keys)
    // =========================================================================
    maxTokens: 4096,
    topP: 0.1,
    failoverChain: [],

    // =========================================================================
    // Guardrails section (DOT-NOTATION keys matching schemas.ts)
    // Schema fields: guardrails.tokenLimit, guardrails.costCap, etc.
    // =========================================================================
    'guardrails.tokenLimit': 100000,
    'guardrails.costCap': 10.00,
    'guardrails.timeoutSeconds': 300,
    'guardrails.maxRetries': 3,
    'guardrails.contentFilters.profanity': true,
    'guardrails.contentFilters.pii': isOutward,
    'guardrails.contentFilters.injection': true,

    // =========================================================================
    // Observability section (DOT-NOTATION keys matching schemas.ts)
    // =========================================================================
    'observability.logging.level': 'info',
    'observability.logging.destinations': ['console'],
    'observability.metrics.enabled': true,
    'observability.metrics.exportInterval': 60,
    'observability.tracing.enabled': false,
    'observability.tracing.samplingRate': 0.1,

    // =========================================================================
    // Memory & Context section (DOT-NOTATION keys matching schemas.ts)
    // =========================================================================
    'memory.contextPersistence': 'session',
    'memory.memoryType': 'conversation',
    'memory.maxContextTokens': 8000,
    'memory.summarizationThreshold': 6000,
  };

  // Overlay incoming values (skip empty strings)
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== '' && value !== undefined && value !== null) {
      defaults[key] = value;
    }
  }

  return defaults;
}

/**
 * Infer role category from role string.
 */
// Phase 7.1: Values MUST match the lowercase AgentRoleCategory type in core.ts:
// 'independent' | 'team' | 'coordinator' | 'continuous'
function inferRoleCategory(role: string): string {
  const r = role.toLowerCase();
  if (['solo', 'specialist', 'planner', 'auditor', 'critic'].includes(r)) return 'independent';
  if (['leader', 'orchestrator', 'router', 'director', 'supervisor'].some(k => r.includes(k))) return 'coordinator';
  if (['monitor'].some(k => r.includes(k))) return 'continuous';
  return 'team'; // member, executor, etc.
}

/**
 * Generate defaults for a HOOK node.
 */
function enrichHookConfig(label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  return {
    name: label,
    description: incoming.description || `${label} hook`,
    event: incoming.event || 'PostToolUse',
    command: incoming.command || 'echo "Hook triggered"',
    matcher: incoming.matcher || '*',
    ...incoming,
  };
}

/**
 * Generate defaults for an MCP_SERVER node.
 */
function enrichMCPConfig(label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  return {
    name: label,
    description: incoming.description || `${label} MCP server`,
    command: incoming.command || 'npx',
    args: incoming.args || [],
    env: incoming.env || {},
    ...incoming,
  };
}

/**
 * Generate defaults for a COMMAND node.
 */
function enrichCommandConfig(label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  return {
    name: label,
    description: incoming.description || `${label} command`,
    content: incoming.content || '',
    triggers: incoming.triggers || [],
    ...incoming,
  };
}

/**
 * Generate defaults for a SKILL node.
 */
function enrichSkillConfig(label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  return {
    name: label,
    description: incoming.description || `${label} skill`,
    content: incoming.content || '',
    whenToUse: incoming.whenToUse || '',
    whenNotToUse: incoming.whenNotToUse || '',
    triggers: incoming.triggers || [],
    ...incoming,
  };
}

/**
 * Phase 7: Master enrichment dispatcher.
 * Routes to the appropriate enrichment function based on node type.
 */
function enrichNodeConfig(type: string, label: string, incoming: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'AGENT':
      return enrichAgentConfig(label, incoming);
    case 'HOOK':
      return enrichHookConfig(label, incoming);
    case 'MCP_SERVER':
      return enrichMCPConfig(label, incoming);
    case 'COMMAND':
      return enrichCommandConfig(label, incoming);
    case 'SKILL':
      return enrichSkillConfig(label, incoming);
    case 'DEPARTMENT':
      return { name: label, description: incoming.description || `${label} department`, color: incoming.color || 'slate', priority: incoming.priority || 5, ...incoming };
    case 'AGENT_POOL':
      return { name: label, description: incoming.description || `${label} pool`, scalingPolicy: incoming.scalingPolicy || 'fixed', ...incoming };
    default:
      return { name: label, ...incoming };
  }
}

/**
 * Normalize a node type string to the UPPERCASE_UNDERSCORE format
 * expected by the frontend schema system.
 *
 * @param type - Input type (e.g., 'agent', 'agent-pool', 'mcp-server')
 * @returns Normalized type (e.g., 'AGENT', 'AGENT_POOL', 'MCP_SERVER')
 */
function normalizeNodeType(type: string): string {
  // First check direct mapping
  if (NODE_TYPE_MAP[type]) {
    return NODE_TYPE_MAP[type];
  }

  // Fallback: convert to uppercase and replace hyphens with underscores
  const normalized = type.toUpperCase().replace(/-/g, '_');

  // Warn if this is an unknown type
  console.warn(`[Canvas] Unknown node type "${type}" normalized to "${normalized}"`);

  return normalized;
}

// -----------------------------------------------------------------------------
// Tool Result Types
// -----------------------------------------------------------------------------

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// -----------------------------------------------------------------------------
// Canvas State (in-memory representation)
// -----------------------------------------------------------------------------

interface CanvasNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  parentId?: string;
  data: Record<string, unknown>;
}

interface CanvasEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType?: string;
  data?: Record<string, unknown>;
}

// In-memory canvas state (per session, to be enhanced later)
// Phase 6.3: Exported for socket handler access
export const canvasState: {
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
} = {
  nodes: new Map(),
  edges: new Map(),
};

// -----------------------------------------------------------------------------
// Tool: canvas_create_node
// -----------------------------------------------------------------------------

export interface CreateNodeParams {
  type: string;           // e.g., 'agent', 'skill', 'department'
  label: string;
  parentId?: string;      // For nested nodes (e.g., agent in department)
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface CreateNodeResult {
  nodeId: string;
  position: { x: number; y: number };
}

export function canvas_create_node(params: CreateNodeParams): ToolResult<CreateNodeResult> {
  try {
    const nodeId = uuidv4();

    // Calculate position (auto-layout if not specified)
    const position = params.position || calculateNextPosition(params.parentId);

    // Validate parent exists if specified
    if (params.parentId && !canvasState.nodes.has(params.parentId)) {
      return {
        success: false,
        error: `Parent node not found: ${params.parentId}`,
      };
    }

    // Normalize the node type to UPPERCASE_UNDERSCORE format
    const normalizedType = normalizeNodeType(params.type);

    // ✅ Phase 7: Comprehensive config enrichment for ALL node types
    // Merges intelligent defaults under the incoming config so agents/hooks/skills
    // are immediately runnable and fully configured in the Properties panel.
    const enrichedConfig = enrichNodeConfig(normalizedType, params.label, params.config || {});
    console.log(`[Canvas] Enriched config for ${normalizedType} "${params.label}" — ${Object.keys(enrichedConfig).length} properties`);

    // Create node in state
    const node: CanvasNode = {
      id: nodeId,
      type: normalizedType,
      label: params.label,
      position,
      parentId: params.parentId,
      data: enrichedConfig,  // Use enriched config with system prompt
    };

    canvasState.nodes.set(nodeId, node);

    // Emit socket event to update UI
    const payload: CanvasNodePayload = {
      nodeId,
      type: normalizedType,
      label: params.label,
      position,
      parentId: params.parentId,
      data: enrichedConfig,  // Use enriched config with system prompt
    };
    emitNodeCreated(payload);

    // Persist layout after mutation
    persistLayout();

    return {
      success: true,
      data: { nodeId, position },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_connect_nodes
// -----------------------------------------------------------------------------

export interface ConnectNodesParams {
  sourceId: string;
  targetId: string;
  edgeType: string;       // REQUIRED: 'data', 'control', 'event', 'delegation', 'failover'
  data?: Record<string, unknown>;
}

export interface ConnectNodesResult {
  edgeId: string;
}

export function canvas_connect_nodes(params: ConnectNodesParams): ToolResult<ConnectNodesResult> {
  try {
    // Validate source and target exist
    if (!canvasState.nodes.has(params.sourceId)) {
      return {
        success: false,
        error: `Source node not found: ${params.sourceId}`,
      };
    }
    if (!canvasState.nodes.has(params.targetId)) {
      return {
        success: false,
        error: `Target node not found: ${params.targetId}`,
      };
    }

    // Check for duplicate edge
    for (const edge of canvasState.edges.values()) {
      if (edge.sourceId === params.sourceId && edge.targetId === params.targetId) {
        return {
          success: false,
          error: `Edge already exists between ${params.sourceId} and ${params.targetId}`,
        };
      }
    }

    const edgeId = uuidv4();

    // Create edge in state
    const edge: CanvasEdge = {
      id: edgeId,
      sourceId: params.sourceId,
      targetId: params.targetId,
      edgeType: params.edgeType || 'data',
      data: params.data,
    };

    canvasState.edges.set(edgeId, edge);

    // Emit socket event to update UI
    const payload: CanvasEdgePayload = {
      edgeId,
      sourceId: params.sourceId,
      targetId: params.targetId,
      edgeType: params.edgeType,
      data: params.data,
    };
    emitEdgeCreated(payload);

    // Persist layout after mutation
    persistLayout();

    return {
      success: true,
      data: { edgeId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_update_property
// -----------------------------------------------------------------------------

export interface UpdatePropertyParams {
  nodeId: string;
  propertyPath: string;   // Dot notation: 'config.model' or 'label'
  value: unknown;
}

export function canvas_update_property(params: UpdatePropertyParams): ToolResult<void> {
  try {
    const node = canvasState.nodes.get(params.nodeId);
    if (!node) {
      return {
        success: false,
        error: `Node not found: ${params.nodeId}`,
      };
    }

    // Parse property path and update
    const pathParts = params.propertyPath.split('.');

    if (pathParts[0] === 'label') {
      node.label = String(params.value);
    } else if (pathParts[0] === 'position') {
      if (pathParts[1] === 'x') {
        node.position.x = Number(params.value);
      } else if (pathParts[1] === 'y') {
        node.position.y = Number(params.value);
      } else {
        node.position = params.value as { x: number; y: number };
      }
    } else {
      // Update nested data property
      setNestedProperty(node.data, pathParts, params.value);
    }

    // Emit socket event to update UI
    emitNodeUpdated({
      nodeId: params.nodeId,
      changes: {
        label: pathParts[0] === 'label' ? String(params.value) : undefined,
        position: pathParts[0] === 'position' ? node.position : undefined,
        data: pathParts[0] !== 'label' && pathParts[0] !== 'position' ? node.data : undefined,
      },
    });

    // Persist layout after mutation
    persistLayout();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_delete_node
// -----------------------------------------------------------------------------

export interface DeleteNodeParams {
  nodeId: string;
}

export function canvas_delete_node(params: DeleteNodeParams): ToolResult<void> {
  try {
    if (!canvasState.nodes.has(params.nodeId)) {
      return {
        success: false,
        error: `Node not found: ${params.nodeId}`,
      };
    }

    // Delete node
    canvasState.nodes.delete(params.nodeId);

    // Delete all connected edges
    const edgesToDelete: string[] = [];
    for (const [edgeId, edge] of canvasState.edges) {
      if (edge.sourceId === params.nodeId || edge.targetId === params.nodeId) {
        edgesToDelete.push(edgeId);
      }
    }
    for (const edgeId of edgesToDelete) {
      canvasState.edges.delete(edgeId);
      emitEdgeDeleted(edgeId);
    }

    // Delete child nodes (recursive)
    const childNodes = [...canvasState.nodes.values()].filter(
      (n) => n.parentId === params.nodeId
    );
    for (const child of childNodes) {
      canvas_delete_node({ nodeId: child.id });
    }

    // Emit socket event
    emitNodeDeleted(params.nodeId);

    // Persist layout after mutation
    persistLayout();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_get_state
// -----------------------------------------------------------------------------

export interface CanvasStateResult {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    parentId?: string;
  }>;
  edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    edgeType?: string;
  }>;
}

export function canvas_get_state(): ToolResult<CanvasStateResult> {
  try {
    const nodes = [...canvasState.nodes.values()].map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      position: node.position,
      parentId: node.parentId,
    }));

    const edges = [...canvasState.edges.values()].map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      edgeType: edge.edgeType,
    }));

    return {
      success: true,
      data: { nodes, edges },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_clear
// -----------------------------------------------------------------------------

export function canvas_clear(): ToolResult<void> {
  try {
    // Emit delete events for all nodes (which will cascade to edges)
    for (const nodeId of canvasState.nodes.keys()) {
      emitNodeDeleted(nodeId);
    }

    // Clear state
    canvasState.nodes.clear();
    canvasState.edges.clear();

    // Persist empty layout
    persistLayout();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_sync_from_client
// Sync state from client (when client has manual changes)
// -----------------------------------------------------------------------------

export function canvas_sync_from_client(
  nodes: Array<{ id: string; type: string; label: string; position: { x: number; y: number }; parentId?: string; data?: Record<string, unknown> }>,
  edges: Array<{ id: string; sourceId: string; targetId: string; edgeType?: string; data?: Record<string, unknown> }>
): void {
  canvasState.nodes.clear();
  canvasState.edges.clear();

  for (const node of nodes) {
    canvasState.nodes.set(node.id, {
      id: node.id,
      type: node.type,
      label: node.label,
      position: node.position,
      parentId: node.parentId,
      data: node.data || {},
    });
  }

  for (const edge of edges) {
    canvasState.edges.set(edge.id, {
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      edgeType: edge.edgeType,
      data: edge.data,
    });
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function calculateNextPosition(parentId?: string): { x: number; y: number } {
  // Phase 5.1 Fix: Grid layout for containers to avoid "Sardine Can" effect
  const existingNodes = [...canvasState.nodes.values()];

  if (parentId) {
    const parent = canvasState.nodes.get(parentId);
    const siblings = existingNodes.filter((n) => n.parentId === parentId);
    const count = siblings.length;

    // Check parent type for layout strategy
    if (parent?.type === 'AGENT_POOL') {
      // GRID LAYOUT: 3 columns for agents inside pools
      const col = count % 3;
      const row = Math.floor(count / 3);
      return { x: 40 + col * 250, y: 80 + row * 150 };
    } else if (parent?.type === 'DEPARTMENT') {
      // HORIZONTAL LAYOUT: Pools side by side inside departments
      return { x: 50 + count * 550, y: 100 };
    }

    // Fallback: vertical stack for other container types
    return {
      x: 50,
      y: 80 + count * 120,
    };
  }

  // Root nodes: grid pattern (4 columns)
  const rootNodes = existingNodes.filter((n) => !n.parentId);
  const col = rootNodes.length % 4;
  const row = Math.floor(rootNodes.length / 4);

  return {
    x: 100 + col * 400,
    y: 100 + row * 300,
  };
}

function setNestedProperty(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown
): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

// -----------------------------------------------------------------------------
// Layout Persistence
// -----------------------------------------------------------------------------

/**
 * Persist the current canvas layout to sandbox/layout.json
 * Phase 6.3: Exported for socket handler access
 */
export async function persistLayout(): Promise<void> {
  try {
    const state = canvas_get_state();
    if (state.success && state.data) {
      // Ensure sandbox directory exists
      await fs.mkdir(SANDBOX_ROOT, { recursive: true });

      await fs.writeFile(
        LAYOUT_FILE,
        JSON.stringify(state.data, null, 2),
        'utf-8'
      );
      console.log(`[Canvas] Layout persisted to ${LAYOUT_FILE}`);
    }
  } catch (error) {
    console.error('[Canvas] Failed to persist layout:', error);
  }
}

/**
 * Load persisted layout from sandbox/layout.json on server startup
 */
export async function loadPersistedLayout(): Promise<void> {
  try {
    const content = await fs.readFile(LAYOUT_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Validate structure before loading
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[Canvas] Invalid layout file: not an object, starting fresh');
      return;
    }

    const nodes = parsed.nodes;
    const edges = parsed.edges;

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.warn('[Canvas] Invalid layout file: missing nodes/edges arrays, starting fresh');
      return;
    }

    // Clear existing state
    canvasState.nodes.clear();
    canvasState.edges.clear();

    // Load nodes (skip malformed entries)
    for (const node of nodes) {
      if (!node || typeof node !== 'object' || typeof (node as Record<string, unknown>).id !== 'string') {
        continue;
      }
      const n = node as Record<string, unknown>;
      canvasState.nodes.set(n.id as string, {
        id: n.id as string,
        type: (n.type as string) || 'AGENT',
        label: (n.label as string) || (n.id as string),
        position: (n.position as { x: number; y: number }) || { x: 0, y: 0 },
        parentId: n.parentId as string | undefined,
        data: (n.data as Record<string, unknown>) || {},
      });
    }

    // Load edges (skip malformed entries)
    for (const edge of edges) {
      if (!edge || typeof edge !== 'object' || typeof (edge as Record<string, unknown>).id !== 'string') {
        continue;
      }
      const e = edge as Record<string, unknown>;
      canvasState.edges.set(e.id as string, {
        id: e.id as string,
        sourceId: (e.sourceId as string) || '',
        targetId: (e.targetId as string) || '',
        edgeType: e.edgeType as string | undefined,
        data: e.data as Record<string, unknown> | undefined,
      });
    }

    console.log(`[Canvas] Loaded ${canvasState.nodes.size} nodes, ${canvasState.edges.size} edges from layout.json`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[Canvas] No persisted layout found, starting fresh');
    } else {
      console.error('[Canvas] Failed to load persisted layout:', error);
    }
  }
}

// -----------------------------------------------------------------------------
// Tool: canvas_apply_layout
// -----------------------------------------------------------------------------

export interface ApplyLayoutParams {
  strategy: 'grid' | 'hierarchical' | 'force';
  spacing?: number;  // Default 150
}

export function canvas_apply_layout(params: ApplyLayoutParams): ToolResult<void> {
  try {
    const nodes = [...canvasState.nodes.values()];
    const spacing = params.spacing || 150;

    switch (params.strategy) {
      case 'grid': {
        // Arrange nodes in a grid pattern (4 columns)
        const rootNodes = nodes.filter(n => !n.parentId);
        rootNodes.forEach((node, i) => {
          node.position = {
            x: (i % 4) * spacing + 100,
            y: Math.floor(i / 4) * spacing + 100,
          };
        });

        // Position child nodes relative to parents
        nodes.filter(n => n.parentId).forEach((node, i) => {
          const parent = canvasState.nodes.get(node.parentId!);
          if (parent) {
            const siblings = nodes.filter(n => n.parentId === node.parentId);
            const siblingIndex = siblings.indexOf(node);
            node.position = {
              x: parent.position.x + 50,
              y: parent.position.y + 80 + siblingIndex * 100,
            };
          }
        });
        break;
      }

      case 'hierarchical': {
        // Top-down tree layout: parents above children
        const rootNodes = nodes.filter(n => !n.parentId);
        const levels: Map<number, CanvasNode[]> = new Map();

        // Build levels
        function assignLevel(node: CanvasNode, level: number): void {
          if (!levels.has(level)) levels.set(level, []);
          levels.get(level)!.push(node);

          const children = nodes.filter(n => n.parentId === node.id);
          children.forEach(child => assignLevel(child, level + 1));
        }

        rootNodes.forEach(root => assignLevel(root, 0));

        // Position by level
        levels.forEach((levelNodes, level) => {
          levelNodes.forEach((node, i) => {
            node.position = {
              x: i * spacing + 100,
              y: level * spacing + 100,
            };
          });
        });
        break;
      }

      case 'force': {
        // Simple collision detection - push overlapping nodes apart
        const iterations = 50;
        const minDistance = spacing * 0.8;

        for (let iter = 0; iter < iterations; iter++) {
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const nodeA = nodes[i];
              const nodeB = nodes[j];

              const dx = nodeB.position.x - nodeA.position.x;
              const dy = nodeB.position.y - nodeA.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < minDistance && distance > 0) {
                const overlap = (minDistance - distance) / 2;
                const nx = dx / distance;
                const ny = dy / distance;

                nodeA.position.x -= nx * overlap;
                nodeA.position.y -= ny * overlap;
                nodeB.position.x += nx * overlap;
                nodeB.position.y += ny * overlap;
              }
            }
          }
        }

        // Ensure all positions are positive
        let minX = Infinity, minY = Infinity;
        nodes.forEach(node => {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
        });

        if (minX < 50 || minY < 50) {
          const offsetX = minX < 50 ? 100 - minX : 0;
          const offsetY = minY < 50 ? 100 - minY : 0;
          nodes.forEach(node => {
            node.position.x += offsetX;
            node.position.y += offsetY;
          });
        }
        break;
      }
    }

    // Emit updates for all nodes
    nodes.forEach(node => {
      emitNodeUpdated({
        nodeId: node.id,
        changes: { position: node.position },
      });
    });

    // Persist the new layout
    persistLayout();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Tool Registry (for Builder agent)
// -----------------------------------------------------------------------------

export const CANVAS_TOOLS = {
  canvas_create_node: {
    name: 'canvas_create_node',
    description: 'Create a new node on the visual canvas',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Node type: agent, skill, department, agent-pool, hook, command, mcp-server',
        },
        label: {
          type: 'string',
          description: 'Display label for the node',
        },
        parentId: {
          type: 'string',
          description: 'Optional parent node ID for nested nodes',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          description: 'Optional position coordinates',
        },
        config: {
          type: 'object',
          description: 'Node configuration data',
        },
      },
      required: ['type', 'label'],
    },
    handler: canvas_create_node,
  },

  canvas_connect_nodes: {
    name: 'canvas_connect_nodes',
    description: 'Connect two nodes with a semantic edge. You MUST specify edgeType to define the relationship.',
    parameters: {
      type: 'object',
      properties: {
        sourceId: {
          type: 'string',
          description: 'Source node ID',
        },
        targetId: {
          type: 'string',
          description: 'Target node ID',
        },
        edgeType: {
          type: 'string',
          enum: ['data', 'control', 'event', 'delegation', 'failover'],
          description: 'REQUIRED - Type: delegation (Manager→Worker, orange), data (info flow, blue), control (sequence, green), event (triggers, purple), failover (backup, red dashed)',
        },
      },
      required: ['sourceId', 'targetId', 'edgeType'],
    },
    handler: canvas_connect_nodes,
  },

  canvas_update_property: {
    name: 'canvas_update_property',
    description: 'Update a property on an existing node',
    parameters: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'Node ID to update',
        },
        propertyPath: {
          type: 'string',
          description: 'Dot-notation path to property (e.g., "config.model", "label")',
        },
        value: {
          description: 'New value for the property',
        },
      },
      required: ['nodeId', 'propertyPath', 'value'],
    },
    handler: canvas_update_property,
  },

  canvas_delete_node: {
    name: 'canvas_delete_node',
    description: 'Delete a node and its connected edges',
    parameters: {
      type: 'object',
      properties: {
        nodeId: {
          type: 'string',
          description: 'Node ID to delete',
        },
      },
      required: ['nodeId'],
    },
    handler: canvas_delete_node,
  },

  canvas_get_state: {
    name: 'canvas_get_state',
    description: 'Get the current state of all nodes and edges on the canvas',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: canvas_get_state,
  },

  canvas_clear: {
    name: 'canvas_clear',
    description: 'Clear all nodes and edges from the canvas',
    parameters: {
      type: 'object',
      properties: {},
    },
    handler: canvas_clear,
  },

  canvas_apply_layout: {
    name: 'canvas_apply_layout',
    description: 'Apply an auto-layout strategy to organize nodes on the canvas',
    parameters: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: ['grid', 'hierarchical', 'force'],
          description: 'Layout strategy: grid (4-column grid), hierarchical (tree top-down), force (collision-based spacing)',
        },
        spacing: {
          type: 'number',
          description: 'Spacing between nodes in pixels (default: 150)',
        },
      },
      required: ['strategy'],
    },
    handler: canvas_apply_layout,
  },
};
