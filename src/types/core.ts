// ============================================================================
// Node Types
// ============================================================================

export type NodeType =
  | 'AGENT'
  | 'SKILL'
  | 'PLUGIN'
  | 'TOOL'
  | 'PROVIDER'
  | 'HOOK'
  | 'COMMAND'
  | 'REASONING'
  | 'DEPARTMENT'    // Container for agent pools
  | 'AGENT_POOL'    // Container for agents with scaling
  | 'MCP_SERVER';   // MCP server configuration

// Container types that can hold child nodes
export type ContainerNodeType = 'DEPARTMENT' | 'AGENT_POOL';

// Edge/Connection types for typed workflows
export type EdgeType = 'data' | 'control' | 'event' | 'delegation' | 'failover' | 'default';

// ============================================================================
// Position & Base Interfaces
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface NodeConfig {
  [key: string]: unknown;
}

// ============================================================================
// Department Configuration
// ============================================================================

export interface DepartmentConfig {
  name: string;
  description?: string;
  priority?: number;
  color?: string;  // Theme color for visual distinction
  // Child references (populated by hierarchy)
  pools?: string[];
}

// ============================================================================
// Agent Pool Configuration
// ============================================================================

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  concurrency: number;
  scaleUpThreshold?: number;   // Utilization % to trigger scale up
  scaleDownThreshold?: number; // Utilization % to trigger scale down
  cooldownSeconds?: number;
}

export interface AgentPoolConfig {
  name: string;
  description?: string;
  department?: string;  // Parent department reference
  scaling: ScalingConfig;
  loadBalancing?: 'round-robin' | 'least-loaded' | 'random';
  timeout?: number;     // Default timeout in seconds
  rateLimit?: number;   // Requests per minute
  failoverChain?: string[];  // Ordered list of backup pool IDs
  // Child references
  agents?: string[];
}

// ============================================================================
// Agent Configuration (Enhanced)
// ============================================================================

// Role Categories (for role-based visibility)
export type AgentRoleCategory = 'independent' | 'team' | 'coordinator' | 'continuous';

// Expanded Agent Roles (11 total, mapped to 4 categories)
export type AgentRole =
  // Independent category - work alone without coordination
  | 'solo'
  | 'specialist'
  // Team category - part of a coordinated group
  | 'member'
  | 'planner'
  | 'executor'
  | 'critic'
  // Coordinator category - manage and orchestrate others
  | 'leader'
  | 'orchestrator'
  | 'router'
  // Continuous category - ongoing monitoring/auditing
  | 'auditor'
  | 'monitor';

// Role to Category mapping
export const ROLE_CATEGORY_MAP: Record<AgentRole, AgentRoleCategory> = {
  // Independent: work alone, planning, review
  solo: 'independent',
  specialist: 'independent',
  planner: 'independent',
  auditor: 'independent',
  critic: 'independent',
  // Team: execution-focused roles
  member: 'team',
  executor: 'team',
  // Coordinator: manage and orchestrate others
  leader: 'coordinator',
  orchestrator: 'coordinator',
  router: 'coordinator',
  // Continuous: ongoing monitoring
  monitor: 'continuous',
};

export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';

// Thinking mode for extended reasoning
export type ThinkingMode = 'none' | 'low' | 'medium' | 'high' | 'max';

// Spawning mode for sub-agents
export type SpawningMode = 'eager' | 'lazy' | 'on-demand' | 'pooled';

// Agent ID format for sub-agents
export type AgentIdFormat = 'uuid' | 'sequential' | 'hierarchical';

// Consensus voting method
export type VotingMethod = 'majority' | 'unanimous' | 'weighted';

// Context revival priority fields
export type ContextPriorityField = 'goals' | 'progress' | 'errors' | 'decisions';

// Approval actions
export type ApprovalAction = 'file_writes' | 'file_deletes' | 'shell_commands' | 'external_apis' | 'git_operations';

// Consensus configuration for PAL
export interface ConsensusConfig {
  enabled?: boolean;
  threshold?: number;  // 0-1 percentage
  votingMethod?: VotingMethod;
}

// Context revival configuration
export interface ContextRevivalConfig {
  enabled?: boolean;
  maxAge?: number;  // hours
  priorityFields?: ContextPriorityField[];
}

// Sub-agent inheritance configuration
export interface SubAgentInheritance {
  tools?: boolean;
  skills?: boolean;
  permissions?: boolean;
  guardrails?: boolean;
}

// Per-capability usage configuration (for skills, mcps, commands)
export interface CapabilityUsageConfig {
  whenToUse?: string;  // Plain English description of when to use this capability
}

// ============================================================================
// Extended Agent Configuration Interfaces
// ============================================================================

// Guardrails Configuration
export interface GuardrailsConfig {
  tokenLimit?: number;          // Maximum tokens per session
  costCap?: number;             // Maximum cost per session in dollars
  contentFilters?: {
    profanity?: boolean;
    pii?: boolean;
    injection?: boolean;
  };
  timeoutSeconds?: number;
  maxRetries?: number;
}

// Observability Configuration
export interface ObservabilityConfig {
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    destinations?: string[];    // e.g., ['console', 'file', 'remote']
  };
  metrics?: {
    enabled?: boolean;
    exportInterval?: number;    // seconds
  };
  tracing?: {
    enabled?: boolean;
    samplingRate?: number;      // 0-1
  };
}

// Memory & Context Configuration
export interface MemoryConfig {
  contextPersistence?: 'none' | 'session' | 'persistent';
  memoryType?: 'short-term' | 'long-term' | 'both';
  maxContextTokens?: number;
  summarizationThreshold?: number;
}

// Sub-Agent Configuration (for coordinators)
export interface SubAgentConfig {
  spawnRules?: {
    maxSubagents?: number;
    autoSpawn?: boolean;
    inheritConfig?: boolean;
  };
  communication?: 'sync' | 'async' | 'event-driven';
  resultAggregation?: 'merge' | 'first' | 'vote' | 'custom';
  spawningMode?: SpawningMode;
  delegationDepth?: number;
  isolatedContext?: boolean;
  agentIdFormat?: AgentIdFormat;
  inheritance?: SubAgentInheritance;
}

// PAL Orchestration Configuration (Plan-Allocate-Learn)
export interface PALConfig {
  planPhase?: {
    enabled?: boolean;
    maxPlanningTokens?: number;
    requireApproval?: boolean;
  };
  allocatePhase?: {
    strategy?: 'sequential' | 'parallel' | 'adaptive';
    maxConcurrency?: number;
  };
  learnPhase?: {
    enabled?: boolean;
    feedbackLoop?: boolean;
    memoryIntegration?: boolean;
  };
  palTools?: string[];
  consensusConfig?: ConsensusConfig;
  contextRevival?: ContextRevivalConfig;
}

// Delegation Configuration
export interface DelegationConfig {
  allowDelegation?: boolean;
  delegationStrategy?: 'capability-based' | 'load-balanced' | 'round-robin';
  escalationPath?: string[];    // Agent IDs for escalation
  autoDelegate?: boolean;
}

// Execution Configuration (for executor role)
export interface ExecutionConfig {
  executionMode?: 'strict' | 'adaptive' | 'exploratory';
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
    exponential?: boolean;
  };
  checkpointing?: boolean;
  rollbackOnFailure?: boolean;
}

// Monitoring Configuration (for monitor role)
export interface MonitoringConfig {
  healthChecks?: {
    interval?: number;          // seconds
    endpoints?: string[];
    thresholds?: Record<string, number>;
  };
  alerts?: {
    enabled?: boolean;
    channels?: string[];        // e.g., ['slack', 'email']
    escalation?: boolean;
  };
  dashboards?: string[];        // Dashboard identifiers
}

export interface AgentConfig {
  // Identity
  name: string;
  teamName?: string;
  description?: string;

  // Hierarchy assignment
  pool?: string;        // Parent pool reference
  department?: string;  // Grandparent department reference
  role: AgentRole;
  roleCategory?: AgentRoleCategory;  // Computed from role

  // Model configuration
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  thinkingMode?: ThinkingMode;
  contextWindow?: number;
  reservedOutputTokens?: number;

  // Capabilities
  tools: string[];
  skills: string[];
  mcps: string[];
  commands: string[];

  // Per-capability configuration (optional, for "when to use" hints)
  capabilityConfig?: Record<string, CapabilityUsageConfig>;

  // Permissions
  permissionMode: PermissionMode;
  disallowedTools?: string[];
  fileAccessPatterns?: string[];
  requiresApprovalFor?: ApprovalAction[];

  // Prompts
  systemPrompt?: string;

  // Resilience
  failoverChain?: string[];

  // === Extended Configuration Sections ===

  // Guardrails (all roles)
  guardrails?: GuardrailsConfig;

  // Observability (all roles)
  observability?: ObservabilityConfig;

  // Memory & Context (all roles)
  memory?: MemoryConfig;

  // Sub-Agent Config (coordinator only)
  subAgentConfig?: SubAgentConfig;

  // PAL Orchestration (coordinator only)
  palConfig?: PALConfig;

  // Delegation (coordinator + team)
  delegation?: DelegationConfig;

  // Execution (team, especially executor)
  execution?: ExecutionConfig;

  // Monitoring (continuous only)
  monitoring?: MonitoringConfig;
}

// ============================================================================
// MCP Server Configuration
// ============================================================================

export type MCPAuthType = 'api_key' | 'oauth' | 'basic' | 'none';

export interface MCPAuthConfig {
  type: MCPAuthType;
  envVar?: string;      // Environment variable name for credentials
  tokenUrl?: string;    // For OAuth
  scopes?: string[];    // For OAuth
}

export interface MCPRateLimitConfig {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'none';
}

export interface MCPServerConfig {
  name: string;
  description?: string;
  command: string;           // e.g., "npx", "uvx", "node"
  args?: string[];           // Command arguments
  env?: Record<string, string>;  // Environment variables
  auth?: MCPAuthConfig;
  rateLimit?: MCPRateLimitConfig;
  timeout?: number;          // Connection timeout in ms
  retryCount?: number;
  // Capabilities exposed by this MCP
  tools?: string[];
  resources?: string[];
}

// ============================================================================
// Skill Configuration
// ============================================================================

export interface SkillTrigger {
  keywords?: string[];       // Trigger on these keywords
  filePatterns?: string[];   // Trigger when accessing matching files
  commands?: string[];       // Trigger on these slash commands
  events?: string[];         // Trigger on these hook events
  contextPatterns?: string[]; // Context patterns for activation
}

export interface SkillExample {
  input: string;
  output?: string;
  description?: string;
}

export interface SkillConfig {
  name: string;
  description?: string;
  triggers?: SkillTrigger;
  priority?: number;         // Higher = loads first
  maxTokens?: number;        // Token budget for this skill
  autoActivate?: boolean;    // Load automatically on match
  content?: string;          // Skill markdown content

  // Extended properties for AgentSkills.io schema
  whenToUse?: string;        // Guidance for when to apply this skill
  whenNotToUse?: string;     // Guidance for when NOT to apply
  requiresConfirmation?: boolean; // Requires user confirmation
  tools?: string[];          // Tools this skill uses
  mcpServers?: string[];     // MCP servers this skill requires
  skills?: string[];         // Sub-skills this skill depends on
  examples?: SkillExample[]; // Usage examples
  tags?: string[];           // Categorization tags
}

// ============================================================================
// Hook Configuration
// ============================================================================

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'SessionStart'
  | 'SessionEnd';

export interface HookConfig {
  name: string;
  description?: string;
  event: HookEvent;
  matcher?: string;          // Tool name or pattern to match
  command: string;           // Shell command to execute
  timeout?: number;          // Execution timeout in seconds
  environment?: Record<string, string>;
  onError?: 'ignore' | 'warn' | 'fail';
}

// ============================================================================
// Command Configuration
// ============================================================================

export type CommandOutputFormat = 'markdown' | 'json' | 'text' | 'structured_json';

export interface CommandConfig {
  name: string;              // Slash command name (without /)
  description?: string;
  department?: string;       // Which department this belongs to
  agent?: string;            // Which agent handles this
  pools?: string[];          // Which pools can handle this
  outputFormat?: CommandOutputFormat;
  requiresApproval?: boolean;
  content?: string;          // Command template content
}

// ============================================================================
// Node Data Structure
// ============================================================================

export interface NodeData {
  label: string;
  type: NodeType;
  repo?: string;             // Source repository name (e.g., 'claude-code-main')
  config: NodeConfig | DepartmentConfig | AgentPoolConfig | AgentConfig |
          MCPServerConfig | SkillConfig | HookConfig | CommandConfig;
  componentId?: string;      // Reference to Master-Agent component
  status?: 'idle' | 'running' | 'completed' | 'error';
  logs?: string[];
}

// ============================================================================
// Visual Node (React Flow wrapper)
// ============================================================================

export interface VisualNode {
  id: string;
  type: string;              // 'customNode', 'departmentNode', 'agentPoolNode', etc.
  position: Position;
  data: NodeData;
  selected?: boolean;
  // Hierarchy support (React Flow native)
  parentId?: string;         // Parent node ID for containment
  extent?: 'parent';         // Constrain to parent bounds
  expandParent?: boolean;    // Allow expanding parent on drag
  // Container sizing
  style?: {
    width?: number;
    height?: number;
  };
}

// ============================================================================
// Connection/Edge
// ============================================================================

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: EdgeType;
  animated?: boolean;
  label?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
}

// ============================================================================
// Workflow
// ============================================================================

export interface WorkflowMetadata {
  createdAt: string;
  updatedAt: string;
  version?: string;
  author?: string;
  exportFormat?: 'single-file' | 'directory';
}

/** Container hierarchy entry: maps container to its children */
export interface HierarchyEntry {
  type: string;
  label: string;
  children: { id: string; type: string; label: string }[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: VisualNode[];
  edges: Connection[];
  createdAt: string;
  updatedAt: string;
  metadata?: WorkflowMetadata;
  /** Explicit container-to-children hierarchy map (Department/Agent Pool → members) */
  hierarchy?: Record<string, HierarchyEntry>;
}

// ============================================================================
// Directory Export Structure
// ============================================================================

export interface DirectoryExport {
  'CLAUDE.md': string;
  '.claude/settings.json'?: string;
  '.claude/mcp.json'?: string;
  '.claude/hooks/hooks.json'?: string;
  [path: string]: string | undefined;
}

// ============================================================================
// Utility Types
// ============================================================================

// Check if a node type is a container
export const isContainerType = (type: NodeType): type is ContainerNodeType => {
  return type === 'DEPARTMENT' || type === 'AGENT_POOL';
};

// Get allowed child types for a container
export const getAllowedChildTypes = (type: ContainerNodeType): NodeType[] => {
  switch (type) {
    case 'DEPARTMENT':
      return ['AGENT_POOL', 'AGENT', 'MCP_SERVER'];
    case 'AGENT_POOL':
      return ['AGENT'];
    default:
      return [];
  }
};

// Node type display info
export interface NodeTypeInfo {
  type: NodeType;
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
  isContainer: boolean;
}

export const NODE_TYPE_INFO: Record<NodeType, NodeTypeInfo> = {
  DEPARTMENT: {
    type: 'DEPARTMENT',
    displayName: 'Department',
    icon: 'Building2',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    isContainer: true,
  },
  AGENT_POOL: {
    type: 'AGENT_POOL',
    displayName: 'Agent Pool',
    icon: 'Users',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    isContainer: true,
  },
  AGENT: {
    type: 'AGENT',
    displayName: 'Agent',
    icon: 'Bot',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    isContainer: false,
  },
  SKILL: {
    type: 'SKILL',
    displayName: 'Skill',
    icon: 'Sparkles',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    isContainer: false,
  },
  PLUGIN: {
    type: 'PLUGIN',
    displayName: 'Plugin',
    icon: 'Puzzle',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    isContainer: false,
  },
  TOOL: {
    type: 'TOOL',
    displayName: 'Tool',
    icon: 'Wrench',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    isContainer: false,
  },
  PROVIDER: {
    type: 'PROVIDER',
    displayName: 'Provider',
    icon: 'Cloud',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    isContainer: false,
  },
  HOOK: {
    type: 'HOOK',
    displayName: 'Hook',
    icon: 'Anchor',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    isContainer: false,
  },
  COMMAND: {
    type: 'COMMAND',
    displayName: 'Command',
    icon: 'Terminal',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    isContainer: false,
  },
  REASONING: {
    type: 'REASONING',
    displayName: 'Reasoning',
    icon: 'Brain',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    isContainer: false,
  },
  MCP_SERVER: {
    type: 'MCP_SERVER',
    displayName: 'MCP Server',
    icon: 'Server',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    isContainer: false,
  },
};

// Edge type display info
export interface EdgeTypeInfo {
  type: EdgeType;
  displayName: string;
  color: string;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  animated: boolean;
}

// Phase 7: Synced with src/config/edgeConfig.ts to be single source of truth for colors.
// All edge types are SOLID lines except failover (dashed) and default (dashed).
// This matches what edgeConfig.ts sends to React Flow's style prop.
export const EDGE_TYPE_INFO: Record<EdgeType, EdgeTypeInfo> = {
  data: {
    type: 'data',
    displayName: 'Data Flow',
    color: '#3b82f6', // blue-500
    strokeStyle: 'solid',
    animated: false,
  },
  control: {
    type: 'control',
    displayName: 'Control Flow',
    color: '#10b981', // emerald-500 (was green-500, synced with edgeConfig)
    strokeStyle: 'solid', // Phase 7 fix: was 'dashed', now solid to match edgeConfig
    animated: false,
  },
  event: {
    type: 'event',
    displayName: 'Event',
    color: '#a855f7', // purple-500
    strokeStyle: 'solid', // Phase 7 fix: was 'dotted', now solid to match edgeConfig
    animated: false,
  },
  delegation: {
    type: 'delegation',
    displayName: 'Delegation',
    color: '#f97316', // orange-500
    strokeStyle: 'solid',
    animated: false,
  },
  failover: {
    type: 'failover',
    displayName: 'Failover',
    color: '#ef4444', // red-500
    strokeStyle: 'dashed',
    animated: false,
  },
  default: {
    type: 'default',
    displayName: 'Default',
    color: '#b1b1b7', // gray
    strokeStyle: 'dashed',
    animated: false,
  },
};
