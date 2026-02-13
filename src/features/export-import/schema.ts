// =============================================================================
// Export/Import Zod Schemas
// Phase 8: Validates .agent-workflow files for safe canvas persistence
// Mirrors interfaces from src/types/core.ts — DO NOT modify core.ts
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Enums & Literals (matching core.ts union types)
// =============================================================================

export const NodeTypeSchema = z.enum([
  'AGENT', 'SKILL', 'PLUGIN', 'TOOL', 'PROVIDER',
  'HOOK', 'COMMAND', 'REASONING', 'DEPARTMENT', 'AGENT_POOL', 'MCP_SERVER',
]);

export const EdgeTypeSchema = z.enum([
  'data', 'control', 'event', 'delegation', 'failover', 'default',
]);

export const AgentRoleCategorySchema = z.enum([
  'independent', 'team', 'coordinator', 'continuous',
]);

export const AgentRoleSchema = z.enum([
  'solo', 'specialist', 'member', 'planner', 'executor',
  'critic', 'leader', 'orchestrator', 'router', 'auditor', 'monitor',
]);

export const PermissionModeSchema = z.enum([
  'default', 'plan', 'acceptEdits', 'bypassPermissions',
]);

export const ThinkingModeSchema = z.enum(['none', 'low', 'medium', 'high', 'max']);
export const SpawningModeSchema = z.enum(['eager', 'lazy', 'on-demand', 'pooled']);
export const AgentIdFormatSchema = z.enum(['uuid', 'sequential', 'hierarchical']);
export const VotingMethodSchema = z.enum(['majority', 'unanimous', 'weighted']);
export const ContextPriorityFieldSchema = z.enum(['goals', 'progress', 'errors', 'decisions']);
export const ApprovalActionSchema = z.enum([
  'file_writes', 'file_deletes', 'shell_commands', 'external_apis', 'git_operations',
]);

export const HookEventSchema = z.enum([
  'PreToolUse', 'PostToolUse', 'Notification', 'Stop',
  'SubagentStop', 'SessionStart', 'SessionEnd',
]);

export const CommandOutputFormatSchema = z.enum(['markdown', 'json', 'text', 'structured_json']);
export const MCPAuthTypeSchema = z.enum(['api_key', 'oauth', 'basic', 'none']);

// =============================================================================
// Position
// =============================================================================

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// =============================================================================
// Viewport (React Flow viewport state)
// =============================================================================

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.01).max(10),
});

// =============================================================================
// Config sub-schemas (matching core.ts interfaces)
// =============================================================================

// Guardrails
export const GuardrailsConfigSchema = z.object({
  tokenLimit: z.number().optional(),
  costCap: z.number().optional(),
  contentFilters: z.object({
    profanity: z.boolean().optional(),
    pii: z.boolean().optional(),
    injection: z.boolean().optional(),
  }).optional(),
  timeoutSeconds: z.number().optional(),
  maxRetries: z.number().optional(),
}).optional();

// Observability
export const ObservabilityConfigSchema = z.object({
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    destinations: z.array(z.string()).optional(),
  }).optional(),
  metrics: z.object({
    enabled: z.boolean().optional(),
    exportInterval: z.number().optional(),
  }).optional(),
  tracing: z.object({
    enabled: z.boolean().optional(),
    samplingRate: z.number().min(0).max(1).optional(),
  }).optional(),
}).optional();

// Memory
export const MemoryConfigSchema = z.object({
  contextPersistence: z.enum(['none', 'session', 'persistent']).optional(),
  memoryType: z.enum(['short-term', 'long-term', 'both']).optional(),
  maxContextTokens: z.number().optional(),
  summarizationThreshold: z.number().optional(),
}).optional();

// Sub-Agent Inheritance
export const SubAgentInheritanceSchema = z.object({
  tools: z.boolean().optional(),
  skills: z.boolean().optional(),
  permissions: z.boolean().optional(),
  guardrails: z.boolean().optional(),
}).optional();

// Consensus
export const ConsensusConfigSchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().min(0).max(1).optional(),
  votingMethod: VotingMethodSchema.optional(),
}).optional();

// Context Revival
export const ContextRevivalConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxAge: z.number().optional(),
  priorityFields: z.array(ContextPriorityFieldSchema).optional(),
}).optional();

// Sub-Agent Config
export const SubAgentConfigSchema = z.object({
  spawnRules: z.object({
    maxSubagents: z.number().optional(),
    autoSpawn: z.boolean().optional(),
    inheritConfig: z.boolean().optional(),
  }).optional(),
  communication: z.enum(['sync', 'async', 'event-driven']).optional(),
  resultAggregation: z.enum(['merge', 'first', 'vote', 'custom']).optional(),
  spawningMode: SpawningModeSchema.optional(),
  delegationDepth: z.number().optional(),
  isolatedContext: z.boolean().optional(),
  agentIdFormat: AgentIdFormatSchema.optional(),
  inheritance: SubAgentInheritanceSchema,
}).optional();

// PAL Config
export const PALConfigSchema = z.object({
  planPhase: z.object({
    enabled: z.boolean().optional(),
    maxPlanningTokens: z.number().optional(),
    requireApproval: z.boolean().optional(),
  }).optional(),
  allocatePhase: z.object({
    strategy: z.enum(['sequential', 'parallel', 'adaptive']).optional(),
    maxConcurrency: z.number().optional(),
  }).optional(),
  learnPhase: z.object({
    enabled: z.boolean().optional(),
    feedbackLoop: z.boolean().optional(),
    memoryIntegration: z.boolean().optional(),
  }).optional(),
  palTools: z.array(z.string()).optional(),
  consensusConfig: ConsensusConfigSchema,
  contextRevival: ContextRevivalConfigSchema,
}).optional();

// Delegation Config
export const DelegationConfigSchema = z.object({
  allowDelegation: z.boolean().optional(),
  delegationStrategy: z.enum(['capability-based', 'load-balanced', 'round-robin']).optional(),
  escalationPath: z.array(z.string()).optional(),
  autoDelegate: z.boolean().optional(),
}).optional();

// Execution Config
export const ExecutionConfigSchema = z.object({
  executionMode: z.enum(['strict', 'adaptive', 'exploratory']).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().optional(),
    backoffMs: z.number().optional(),
    exponential: z.boolean().optional(),
  }).optional(),
  checkpointing: z.boolean().optional(),
  rollbackOnFailure: z.boolean().optional(),
}).optional();

// Monitoring Config
export const MonitoringConfigSchema = z.object({
  healthChecks: z.object({
    interval: z.number().optional(),
    endpoints: z.array(z.string()).optional(),
    thresholds: z.record(z.string(), z.number()).optional(),
  }).optional(),
  alerts: z.object({
    enabled: z.boolean().optional(),
    channels: z.array(z.string()).optional(),
    escalation: z.boolean().optional(),
  }).optional(),
  dashboards: z.array(z.string()).optional(),
}).optional();

// Scaling Config
export const ScalingConfigSchema = z.object({
  minInstances: z.number().min(0),
  maxInstances: z.number().min(1),
  concurrency: z.number().min(1),
  scaleUpThreshold: z.number().optional(),
  scaleDownThreshold: z.number().optional(),
  cooldownSeconds: z.number().optional(),
});

// Capability usage config
export const CapabilityUsageConfigSchema = z.object({
  whenToUse: z.string().optional(),
});

// MCP Auth
export const MCPAuthConfigSchema = z.object({
  type: MCPAuthTypeSchema,
  envVar: z.string().optional(),
  tokenUrl: z.string().optional(),
  scopes: z.array(z.string()).optional(),
});

// MCP Rate Limit
export const MCPRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().optional(),
  tokensPerMinute: z.number().optional(),
  backoffStrategy: z.enum(['exponential', 'linear', 'none']).optional(),
});

// Skill Trigger
export const SkillTriggerSchema = z.object({
  keywords: z.array(z.string()).optional(),
  filePatterns: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
  contextPatterns: z.array(z.string()).optional(),
});

// Skill Example
export const SkillExampleSchema = z.object({
  input: z.string(),
  output: z.string().optional(),
  description: z.string().optional(),
});

// =============================================================================
// Node Config schemas (discriminated by NodeType)
// =============================================================================

// Generic NodeConfig — permissive passthrough for unknown config shapes
export const GenericNodeConfigSchema = z.record(z.string(), z.unknown());

// Department Config
export const DepartmentConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  priority: z.number().optional(),
  color: z.string().optional(),
  pools: z.array(z.string()).optional(),
}).passthrough();

// Agent Pool Config
export const AgentPoolConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  department: z.string().optional(),
  scaling: ScalingConfigSchema,
  loadBalancing: z.enum(['round-robin', 'least-loaded', 'random']).optional(),
  timeout: z.number().optional(),
  rateLimit: z.number().optional(),
  failoverChain: z.array(z.string()).optional(),
  agents: z.array(z.string()).optional(),
}).passthrough();

// Agent Config (the big one)
export const AgentConfigSchema = z.object({
  name: z.string(),
  teamName: z.string().optional(),
  description: z.string().optional(),
  pool: z.string().optional(),
  department: z.string().optional(),
  role: AgentRoleSchema.optional(), // Optional for backwards compat
  roleCategory: AgentRoleCategorySchema.optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  topP: z.number().min(0).max(1).optional(),
  thinkingMode: ThinkingModeSchema.optional(),
  contextWindow: z.number().optional(),
  reservedOutputTokens: z.number().optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  mcps: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  capabilityConfig: z.record(z.string(), CapabilityUsageConfigSchema).optional(),
  permissionMode: PermissionModeSchema.optional(),
  disallowedTools: z.array(z.string()).optional(),
  fileAccessPatterns: z.array(z.string()).optional(),
  requiresApprovalFor: z.array(ApprovalActionSchema).optional(),
  systemPrompt: z.string().optional(),
  failoverChain: z.array(z.string()).optional(),
  guardrails: GuardrailsConfigSchema,
  observability: ObservabilityConfigSchema,
  memory: MemoryConfigSchema,
  subAgentConfig: SubAgentConfigSchema,
  palConfig: PALConfigSchema,
  delegation: DelegationConfigSchema,
  execution: ExecutionConfigSchema,
  monitoring: MonitoringConfigSchema,
}).passthrough(); // Allow dot-notation keys from react-hook-form

// MCP Server Config
export const MCPServerConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  auth: MCPAuthConfigSchema.optional(),
  rateLimit: MCPRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
  retryCount: z.number().optional(),
  tools: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
}).passthrough();

// Skill Config
export const SkillConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  triggers: SkillTriggerSchema.optional(),
  priority: z.number().optional(),
  maxTokens: z.number().optional(),
  autoActivate: z.boolean().optional(),
  content: z.string().optional(),
  whenToUse: z.string().optional(),
  whenNotToUse: z.string().optional(),
  requiresConfirmation: z.boolean().optional(),
  tools: z.array(z.string()).optional(),
  mcpServers: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  examples: z.array(SkillExampleSchema).optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();

// Hook Config
export const HookConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  event: HookEventSchema,
  matcher: z.string().optional(),
  command: z.string(),
  timeout: z.number().optional(),
  environment: z.record(z.string(), z.string()).optional(),
  onError: z.enum(['ignore', 'warn', 'fail']).optional(),
}).passthrough();

// Command Config
export const CommandConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  department: z.string().optional(),
  agent: z.string().optional(),
  pools: z.array(z.string()).optional(),
  outputFormat: CommandOutputFormatSchema.optional(),
  requiresApproval: z.boolean().optional(),
  content: z.string().optional(),
}).passthrough();

// =============================================================================
// NodeData
// =============================================================================

export const NodeDataSchema = z.object({
  label: z.string(),
  type: NodeTypeSchema,
  repo: z.string().optional(),
  config: GenericNodeConfigSchema, // Use generic passthrough; typed validation in import
  componentId: z.string().optional(),
  // Strip transient fields: status, logs
});

// =============================================================================
// VisualNode (React Flow node for export)
// =============================================================================

export const VisualNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().optional(), // React Flow render type: 'customNode', etc.
  position: PositionSchema,
  data: NodeDataSchema,
  // Hierarchy
  parentId: z.string().optional(),
  extent: z.literal('parent').optional(),
  expandParent: z.boolean().optional(),
  // Container sizing
  style: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  // Strip transient: selected, dragging, measured, etc.
});

// =============================================================================
// Edge / Connection
// =============================================================================

export const EdgeStyleSchema = z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeDasharray: z.string().optional(),
  cursor: z.string().optional(),
}).passthrough();

export const MarkerSchema = z.object({
  type: z.string().optional(),
  color: z.string().optional(),
}).passthrough().optional();

export const ConnectionSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(), // Edge type key or React Flow curve type
  animated: z.boolean().optional(),
  label: z.string().optional(),
  style: EdgeStyleSchema.optional(),
  // React Flow extras that may be present
  data: z.record(z.string(), z.unknown()).optional(),
  markerEnd: MarkerSchema,
  interactionWidth: z.number().optional(),
  focusable: z.boolean().optional(),
  zIndex: z.number().optional(),
});

// =============================================================================
// Workflow Config (from types/config.ts)
// =============================================================================

export const ModelConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'azure', 'xai', 'ollama', 'openrouter', 'custom']),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1),
  apiKeyEnvVar: z.string().optional(),
});

export const WorkflowConfigExportSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  framework: z.enum(['vab-native', 'langgraph', 'crewai', 'autogen']),
  skillSchema: z.enum(['agentskills', 'simple']),
  frameworkOptions: z.record(z.string(), z.unknown()).optional(),
  defaultModel: ModelConfigSchema.optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

// =============================================================================
// File Header (metadata about the export itself)
// =============================================================================

export const FileHeaderSchema = z.object({
  formatVersion: z.literal('1.0.0'),
  exportedAt: z.string(), // ISO 8601
  exportedFrom: z.literal('visual-agent-builder'),
  nodeCount: z.number().int().min(0),
  edgeCount: z.number().int().min(0),
});

// =============================================================================
// Top-Level Workflow File Schema (.agent-workflow)
// =============================================================================

export const WorkflowFileSchema = z.object({
  header: FileHeaderSchema,
  workflowConfig: WorkflowConfigExportSchema,
  viewport: ViewportSchema.optional(),
  nodes: z.array(VisualNodeSchema),
  edges: z.array(ConnectionSchema),
});

// =============================================================================
// Partial Export (selection only)
// =============================================================================

export const PartialExportSchema = z.object({
  header: FileHeaderSchema,
  viewport: ViewportSchema.optional(),
  nodes: z.array(VisualNodeSchema).min(1),
  edges: z.array(ConnectionSchema),
  // No workflowConfig — partial exports inherit from current canvas
});

// =============================================================================
// Legacy Format: Toolbar "Export JSON" (generateWorkflowJson)
// Shape: { id, name, nodes: VisualNode[], edges: Connection[], createdAt, updatedAt, metadata? }
// =============================================================================

/** Legacy node — uses `type` as NodeType directly in data, position at top level.
 *  Newer legacy exports also include parentId, style, extent, expandParent for container hierarchy. */
const LegacyNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema.optional(),   // NodeType at top level (not nested in data.type)
  position: PositionSchema,
  data: z.record(z.string(), z.unknown()),  // Permissive — could be anything from the old format
  // Hierarchy fields (present in newer legacy exports)
  parentId: z.string().optional(),
  extent: z.literal('parent').optional(),
  expandParent: z.boolean().optional(),
  style: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
  }).passthrough().optional(),
}).passthrough();

/** Legacy edge — minimal shape */
const LegacyEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.string().optional(),
}).passthrough();

/** Legacy workflow metadata */
const LegacyMetadataSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  exportFormat: z.string().optional(),
}).optional();

/**
 * Legacy workflow file from generateWorkflowJson().
 * Discriminated from Phase 8 format by having `id` + `name` at root
 * and NOT having `header`.
 */
export const LegacyWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(LegacyNodeSchema).min(0),
  edges: z.array(LegacyEdgeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: LegacyMetadataSchema,
}).passthrough();
