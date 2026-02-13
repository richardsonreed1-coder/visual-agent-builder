import { NodeType } from '../../types/core';

// ============================================================================
// Field Schema Types
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'roleSelect'    // Two-step category -> role selector
  | 'number'
  | 'slider'
  | 'checkbox'
  | 'chips'         // Array of tags/chips
  | 'tags'          // Free-form text tags (similar to chips but no predefined options)
  | 'capabilities'  // Capabilities with browse + "when to use" config
  | 'array'         // Dynamic list of items
  | 'object'        // Nested object editor
  | 'keyvalue'      // Key-value pairs (for env vars)
  | 'color';        // Color picker

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  section: string;           // Which section this field belongs to
  options?: { label: string; value: string | number; description?: string }[];
  placeholder?: string;
  description?: string;      // Help text / tooltip
  defaultValue?: any;
  validation?: FieldValidation;
  conditional?: {            // Show field only when condition is met
    field: string;
    value: any;
    operator?: 'eq' | 'neq' | 'in' | 'exists';
  };
  dependsOn?: string;        // Dynamic options based on another field
  width?: 'full' | 'half';   // Layout hint
  readonly?: boolean;
  lockedWhen?: {             // Lock field to specific value based on role
    roles: string[];         // Roles that trigger the lock
    value: any;              // Value to lock the field to
    reason?: string;         // Explanation shown in tooltip
  };
}

export interface SectionSchema {
  id: string;
  label: string;
  icon: string;              // Lucide icon name
  description?: string;
  defaultOpen: boolean;
  collapsible: boolean;
  // Role-based visibility (for AGENT node type)
  visibleWhen?: {
    field: string;           // Field to watch (e.g., 'role')
    values?: string[];       // Show when field value is in this array
    categories?: string[];   // Show when role category is in this array
  };
}

export interface NodeTypeSchema {
  type: NodeType;
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isContainer: boolean;
  sections: SectionSchema[];
  fields: FieldSchema[];
}

// ============================================================================
// Common Field Definitions (Reusable)
// ============================================================================

const identityFields: FieldSchema[] = [
  {
    key: 'label',
    label: 'Name',
    type: 'text',
    section: 'identity',
    placeholder: 'Enter name...',
    validation: { required: true, minLength: 1, maxLength: 100 },
    width: 'full',
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    section: 'identity',
    placeholder: 'Describe this component...',
    validation: { maxLength: 2000 },
    width: 'full',
  },
];

const commonSections: SectionSchema[] = [
  {
    id: 'identity',
    label: 'Identity',
    icon: 'Tag',
    defaultOpen: true,
    collapsible: true,
  },
];

// ============================================================================
// Provider Options
// ============================================================================

export const providerOptions = [
  { label: 'Anthropic', value: 'anthropic', description: 'Claude models' },
  { label: 'OpenAI', value: 'openai', description: 'GPT models' },
  { label: 'Google', value: 'google', description: 'Gemini models' },
  { label: 'Azure OpenAI', value: 'azure', description: 'Azure-hosted GPT' },
  { label: 'OpenRouter', value: 'openrouter', description: '50+ models' },
  { label: 'xAI', value: 'xai', description: 'Grok models' },
  { label: 'Ollama', value: 'ollama', description: 'Local models' },
];

export const modelsByProvider: Record<string, { label: string; value: string }[]> = {
  anthropic: [
    { label: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
    { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
    { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
    { label: 'Claude Opus 4.5', value: 'claude-opus-4-5-20251101' },
    { label: 'Claude Opus 4.1', value: 'claude-opus-4-1-20250805' },
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
    { label: 'Claude Sonnet 3.7', value: 'claude-3-7-sonnet-20250219' },
    { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-20241022' },
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'O3', value: 'o3' },
    { label: 'O3 Mini', value: 'o3-mini' },
  ],
  google: [
    { label: 'Gemini 3 Pro', value: 'gemini-3-pro-preview' },
    { label: 'Gemini 3 Flash', value: 'gemini-3-flash-preview' },
    { label: 'Gemini 3 Pro Image', value: 'gemini-3-pro-image-preview' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  ],
  azure: [
    { label: 'GPT-4o (Azure)', value: 'gpt-4o' },
    { label: 'GPT-4 Turbo (Azure)', value: 'gpt-4-turbo' },
  ],
  openrouter: [
    { label: 'Auto (Best Available)', value: 'auto' },
    { label: 'Claude Opus 4.6', value: 'anthropic/claude-opus-4-6' },
    { label: 'Claude Sonnet 4.5', value: 'anthropic/claude-sonnet-4-5' },
    { label: 'Gemini 3 Pro', value: 'google/gemini-3-pro-preview' },
    { label: 'GPT-4o', value: 'openai/gpt-4o' },
  ],
  xai: [
    { label: 'Grok 2', value: 'grok-2' },
    { label: 'Grok 3', value: 'grok-3' },
  ],
  ollama: [
    { label: 'Llama 3.2', value: 'llama3.2' },
    { label: 'Mistral', value: 'mistral' },
    { label: 'CodeLlama', value: 'codellama' },
  ],
};

export const toolOptions = [
  { label: 'Read', value: 'Read', description: 'Read files' },
  { label: 'Edit', value: 'Edit', description: 'Edit files' },
  { label: 'Write', value: 'Write', description: 'Write new files' },
  { label: 'Bash', value: 'Bash', description: 'Execute shell commands' },
  { label: 'Glob', value: 'Glob', description: 'Find files by pattern' },
  { label: 'Grep', value: 'Grep', description: 'Search file contents' },
  { label: 'Task', value: 'Task', description: 'Spawn subagents' },
  { label: 'WebSearch', value: 'WebSearch', description: 'Search the web' },
  { label: 'WebFetch', value: 'WebFetch', description: 'Fetch web content' },
  { label: 'NotebookEdit', value: 'NotebookEdit', description: 'Edit Jupyter notebooks' },
];

export const permissionModeOptions = [
  { label: 'Default', value: 'default', description: 'Interactive approval for actions' },
  { label: 'Plan Only', value: 'plan', description: 'Read-only exploration mode' },
  { label: 'Accept Edits', value: 'acceptEdits', description: 'Auto-approve file changes' },
  { label: 'Bypass Permissions', value: 'bypassPermissions', description: 'Full automation (use with caution)' },
];

// Role options with categories (11 roles across 4 categories)
export const roleOptions = [
  // Independent category
  { label: 'Solo', value: 'solo', description: 'Works independently on complete tasks', category: 'independent' },
  { label: 'Specialist', value: 'specialist', description: 'Deep expertise in a specific domain', category: 'independent' },
  // Team category
  { label: 'Member', value: 'member', description: 'Executes assigned tasks as part of a team', category: 'team' },
  { label: 'Planner', value: 'planner', description: 'Creates detailed plans and breaks down tasks', category: 'team' },
  { label: 'Executor', value: 'executor', description: 'Strictly follows plans with high precision', category: 'team' },
  { label: 'Critic', value: 'critic', description: 'Reviews and validates work, provides feedback', category: 'team' },
  // Coordinator category
  { label: 'Leader', value: 'leader', description: 'Orchestrates team and ensures quality delivery', category: 'coordinator' },
  { label: 'Orchestrator', value: 'orchestrator', description: 'Coordinates multiple team leaders', category: 'coordinator' },
  { label: 'Router', value: 'router', description: 'Routes tasks to appropriate agents', category: 'coordinator' },
  // Continuous category
  { label: 'Auditor', value: 'auditor', description: 'Independent 3rd-party review and compliance', category: 'continuous' },
  { label: 'Monitor', value: 'monitor', description: 'Continuous health monitoring and alerting', category: 'continuous' },
];

export const hookEventOptions = [
  { label: 'Pre Tool Use', value: 'PreToolUse', description: 'Before a tool is executed' },
  { label: 'Post Tool Use', value: 'PostToolUse', description: 'After a tool completes' },
  { label: 'Notification', value: 'Notification', description: 'On notification events' },
  { label: 'Stop', value: 'Stop', description: 'When agent stops' },
  { label: 'Subagent Stop', value: 'SubagentStop', description: 'When subagent stops' },
  { label: 'Session Start', value: 'SessionStart', description: 'When session begins' },
  { label: 'Session End', value: 'SessionEnd', description: 'When session ends' },
];

export const loadBalancingOptions = [
  { label: 'Round Robin', value: 'round-robin', description: 'Distribute evenly' },
  { label: 'Least Loaded', value: 'least-loaded', description: 'Route to least busy' },
  { label: 'Random', value: 'random', description: 'Random distribution' },
];

export const authTypeOptions = [
  { label: 'API Key', value: 'api_key', description: 'Header-based API key' },
  { label: 'OAuth 2.0', value: 'oauth', description: 'OAuth authorization flow' },
  { label: 'Basic Auth', value: 'basic', description: 'Username/password' },
  { label: 'None', value: 'none', description: 'No authentication' },
];

export const departmentColorOptions = [
  { label: 'Blue (Research)', value: 'blue' },
  { label: 'Green (Development)', value: 'green' },
  { label: 'Purple (AI/ML)', value: 'purple' },
  { label: 'Orange (Communications)', value: 'orange' },
  { label: 'Teal (Operations)', value: 'teal' },
  { label: 'Pink (Marketing)', value: 'pink' },
  { label: 'Slate (General)', value: 'slate' },
];

// ============================================================================
// Node Type Schemas
// ============================================================================

export const nodeSchemas: Record<NodeType, NodeTypeSchema> = {
  // ===========================================================================
  // DEPARTMENT
  // ===========================================================================
  DEPARTMENT: {
    type: 'DEPARTMENT',
    displayName: 'Department',
    icon: 'Building2',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
    isContainer: true,
    sections: [
      ...commonSections,
      { id: 'config', label: 'Configuration', icon: 'Settings', defaultOpen: true, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'color',
        label: 'Theme Color',
        type: 'select',
        section: 'config',
        options: departmentColorOptions,
        defaultValue: 'slate',
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'slider',
        section: 'config',
        description: 'Higher priority departments are processed first',
        defaultValue: 5,
        validation: { min: 1, max: 10 },
      },
    ],
  },

  // ===========================================================================
  // AGENT_POOL
  // ===========================================================================
  AGENT_POOL: {
    type: 'AGENT_POOL',
    displayName: 'Agent Pool',
    icon: 'Users',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-500',
    isContainer: true,
    sections: [
      ...commonSections,
      { id: 'scaling', label: 'Scaling', icon: 'TrendingUp', defaultOpen: true, collapsible: true },
      { id: 'behavior', label: 'Behavior', icon: 'Sliders', defaultOpen: false, collapsible: true },
      { id: 'resilience', label: 'Resilience', icon: 'Shield', defaultOpen: false, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'scaling.minInstances',
        label: 'Min Instances',
        type: 'number',
        section: 'scaling',
        placeholder: '1',
        defaultValue: 1,
        validation: { min: 0, max: 100 },
        width: 'half',
      },
      {
        key: 'scaling.maxInstances',
        label: 'Max Instances',
        type: 'number',
        section: 'scaling',
        placeholder: '10',
        defaultValue: 10,
        validation: { min: 1, max: 100 },
        width: 'half',
      },
      {
        key: 'scaling.concurrency',
        label: 'Concurrency',
        type: 'number',
        section: 'scaling',
        description: 'Max concurrent requests per instance',
        placeholder: '5',
        defaultValue: 5,
        validation: { min: 1, max: 50 },
        width: 'half',
      },
      {
        key: 'scaling.scaleUpThreshold',
        label: 'Scale Up Threshold (%)',
        type: 'slider',
        section: 'scaling',
        description: 'Utilization % to trigger scale up',
        defaultValue: 80,
        validation: { min: 50, max: 100 },
        width: 'half',
      },
      {
        key: 'loadBalancing',
        label: 'Load Balancing',
        type: 'select',
        section: 'behavior',
        options: loadBalancingOptions,
        defaultValue: 'round-robin',
      },
      {
        key: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        section: 'behavior',
        placeholder: '300',
        defaultValue: 300,
        validation: { min: 10, max: 3600 },
        width: 'half',
      },
      {
        key: 'rateLimit',
        label: 'Rate Limit (req/min)',
        type: 'number',
        section: 'behavior',
        placeholder: '100',
        defaultValue: 100,
        validation: { min: 1, max: 10000 },
        width: 'half',
      },
      {
        key: 'failoverChain',
        label: 'Failover Chain',
        type: 'chips',
        section: 'resilience',
        description: 'Ordered list of backup pool names',
        placeholder: 'Add backup pool...',
      },
    ],
  },

  // ===========================================================================
  // AGENT (with 16 sections and role-based visibility)
  // ===========================================================================
  AGENT: {
    type: 'AGENT',
    displayName: 'Agent',
    icon: 'Bot',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    isContainer: false,
    sections: [
      // 1. Identity (all roles)
      ...commonSections,
      // 2. Role (all roles)
      { id: 'role', label: 'Agent Role', icon: 'UserCog', defaultOpen: true, collapsible: true },
      // 3. Model (all roles)
      { id: 'model', label: 'Model', icon: 'Cpu', defaultOpen: true, collapsible: true },
      // 4. Permissions (all roles)
      { id: 'permissions', label: 'Permissions', icon: 'Lock', defaultOpen: false, collapsible: true },
      // 5. Tools (all except monitor)
      {
        id: 'tools',
        label: 'Tools',
        icon: 'Wrench',
        defaultOpen: true,
        collapsible: true,
        visibleWhen: {
          field: 'role',
          values: ['solo', 'specialist', 'member', 'planner', 'executor', 'critic',
                   'leader', 'orchestrator', 'router', 'auditor'],
        },
      },
      // 6. Capabilities (all roles)
      { id: 'capabilities', label: 'Capabilities', icon: 'Sparkles', defaultOpen: false, collapsible: true },
      // 7. System Prompt (all roles)
      { id: 'prompt', label: 'System Prompt', icon: 'MessageSquare', defaultOpen: false, collapsible: true },
      // 8. Advanced (all roles)
      { id: 'advanced', label: 'Advanced', icon: 'Settings2', defaultOpen: false, collapsible: true },
      // 9. Sub-Agent Config (coordinator category only)
      {
        id: 'subagent',
        label: 'Sub-Agent Config',
        icon: 'Users',
        description: 'Configure sub-agent spawning and management',
        defaultOpen: false,
        collapsible: true,
        visibleWhen: { field: 'role', categories: ['coordinator'] },
      },
      // 10. PAL Orchestration (coordinator category only)
      {
        id: 'pal',
        label: 'PAL Orchestration',
        icon: 'Workflow',
        description: 'Plan-Allocate-Learn orchestration phases',
        defaultOpen: false,
        collapsible: true,
        visibleWhen: { field: 'role', categories: ['coordinator'] },
      },
      // 11. Delegation (coordinator + team categories)
      {
        id: 'delegation',
        label: 'Delegation',
        icon: 'Forward',
        description: 'Task delegation settings',
        defaultOpen: false,
        collapsible: true,
        visibleWhen: { field: 'role', categories: ['coordinator', 'team'] },
      },
      // 12. Execution (executor role only)
      {
        id: 'execution',
        label: 'Execution',
        icon: 'Play',
        description: 'Execution patterns and retry policies',
        defaultOpen: false,
        collapsible: true,
        visibleWhen: { field: 'role', values: ['executor'] },
      },
      // 13. Guardrails (all roles)
      {
        id: 'guardrails',
        label: 'Guardrails',
        icon: 'Shield',
        description: 'Token limits, cost caps, and content filters',
        defaultOpen: false,
        collapsible: true,
      },
      // 14. Observability (all roles)
      {
        id: 'observability',
        label: 'Observability',
        icon: 'Eye',
        description: 'Logging, metrics, and tracing',
        defaultOpen: false,
        collapsible: true,
      },
      // 15. Memory & Context (all roles)
      {
        id: 'memory',
        label: 'Memory & Context',
        icon: 'Brain',
        description: 'Context persistence and memory management',
        defaultOpen: false,
        collapsible: true,
      },
      // 16. Monitoring (continuous category only)
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: 'Activity',
        description: 'Health checks and alerts',
        defaultOpen: false,
        collapsible: true,
        visibleWhen: { field: 'role', categories: ['continuous'] },
      },
    ],
    fields: [
      // === IDENTITY SECTION ===
      ...identityFields,
      {
        key: 'teamName',
        label: 'Team Name',
        type: 'text',
        section: 'identity',
        placeholder: 'e.g., Research Team',
      },

      // === ROLE SECTION ===
      {
        key: 'role',
        label: 'Role',
        type: 'roleSelect',
        section: 'role',
        defaultValue: 'member',
        description: 'Determines available configuration sections',
      },

      // === MODEL SECTION ===
      {
        key: 'provider',
        label: 'Provider',
        type: 'select',
        section: 'model',
        options: providerOptions,
        defaultValue: 'anthropic',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        section: 'model',
        options: modelsByProvider['anthropic'],
        dependsOn: 'provider',
        defaultValue: 'claude-sonnet-4-5-20250929',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        section: 'model',
        description: '0 = Precise, 1 = Creative',
        defaultValue: 0.7,
        validation: { min: 0, max: 1 },
        width: 'half',
        lockedWhen: {
          roles: ['executor'],
          value: 0,
          reason: 'Executors require deterministic behavior (temperature=0)',
        },
      },
      {
        key: 'thinkingMode',
        label: 'Thinking Mode',
        type: 'select',
        section: 'model',
        description: 'Extended reasoning depth for complex tasks (increases token usage)',
        options: [
          { label: 'None', value: 'none', description: 'Standard inference - fastest' },
          { label: 'Low', value: 'low', description: 'Light reasoning (~2x tokens)' },
          { label: 'Medium', value: 'medium', description: 'Moderate reasoning (~4x tokens)' },
          { label: 'High', value: 'high', description: 'Deep reasoning (~8x tokens)' },
          { label: 'Max', value: 'max', description: 'Maximum reasoning depth' },
        ],
        defaultValue: 'none',
        width: 'half',
        lockedWhen: {
          roles: ['executor', 'router', 'monitor'],
          value: 'none',
          reason: 'This role requires standard inference without extended thinking',
        },
      },
      {
        key: 'contextWindow',
        label: 'Context Window',
        type: 'select',
        section: 'model',
        description: 'Maximum context size (affects cost and capability)',
        options: [
          { label: '8K', value: 8192 },
          { label: '16K', value: 16384 },
          { label: '32K', value: 32768 },
          { label: '64K', value: 65536 },
          { label: '128K', value: 131072 },
          { label: '200K', value: 200000 },
        ],
        defaultValue: 200000,
        width: 'half',
      },
      {
        key: 'reservedOutputTokens',
        label: 'Reserved Output Tokens',
        type: 'number',
        section: 'model',
        description: 'Tokens reserved for response generation',
        defaultValue: 16000,
        validation: { min: 1000, max: 64000 },
        width: 'half',
      },

      // === PERMISSIONS SECTION ===
      {
        key: 'permissionMode',
        label: 'Permission Mode',
        type: 'select',
        section: 'permissions',
        options: permissionModeOptions,
        defaultValue: 'default',
      },
      {
        key: 'disallowedTools',
        label: 'Disallowed Tools',
        type: 'chips',
        section: 'permissions',
        description: 'Tools this agent cannot use',
        options: toolOptions,
        defaultValue: [],
      },
      {
        key: 'fileAccessPatterns',
        label: 'File Access Patterns',
        type: 'tags',
        section: 'permissions',
        description: 'Glob patterns for allowed file access (e.g., src/**/*.ts)',
        placeholder: 'Add pattern...',
        defaultValue: [],
      },
      {
        key: 'requiresApprovalFor',
        label: 'Requires Approval For',
        type: 'chips',
        section: 'permissions',
        description: 'Actions that require human approval',
        options: [
          { label: 'File Writes', value: 'file_writes' },
          { label: 'File Deletes', value: 'file_deletes' },
          { label: 'Shell Commands', value: 'shell_commands' },
          { label: 'External APIs', value: 'external_apis' },
          { label: 'Git Operations', value: 'git_operations' },
        ],
        defaultValue: [],
      },

      // === TOOLS SECTION ===
      {
        key: 'tools',
        label: 'Available Tools',
        type: 'chips',
        section: 'tools',
        options: toolOptions,
        defaultValue: ['Read', 'Edit', 'Bash', 'Glob', 'Grep'],
      },

      // === CAPABILITIES SECTION ===
      {
        key: 'skills',
        label: 'Skills',
        type: 'capabilities',
        section: 'capabilities',
        description: 'Skills this agent can use',
        placeholder: 'Add skill...',
      },
      {
        key: 'mcps',
        label: 'MCP Servers',
        type: 'capabilities',
        section: 'capabilities',
        description: 'MCP servers to connect',
        placeholder: 'Add MCP...',
      },
      {
        key: 'commands',
        label: 'Commands',
        type: 'capabilities',
        section: 'capabilities',
        description: 'Slash commands this agent handles',
        placeholder: 'Add command...',
      },

      // === SYSTEM PROMPT SECTION ===
      {
        key: 'systemPrompt',
        label: 'System Prompt',
        type: 'textarea',
        section: 'prompt',
        placeholder: 'You are a helpful assistant specialized in...',
        validation: { maxLength: 10000 },
      },

      // === ADVANCED SECTION ===
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        section: 'advanced',
        placeholder: '4096',
        defaultValue: 4096,
        validation: { min: 256, max: 128000 },
        width: 'half',
      },
      {
        key: 'topP',
        label: 'Top P',
        type: 'slider',
        section: 'advanced',
        defaultValue: 1.0,
        validation: { min: 0.1, max: 1 },
        width: 'half',
      },
      {
        key: 'failoverChain',
        label: 'Failover Agents',
        type: 'chips',
        section: 'advanced',
        description: 'Backup agents if this one fails',
      },

      // === SUB-AGENT CONFIG SECTION (coordinator only) ===
      {
        key: 'subAgentConfig.spawnRules.maxSubagents',
        label: 'Max Sub-agents',
        type: 'number',
        section: 'subagent',
        placeholder: '5',
        defaultValue: 5,
        validation: { min: 1, max: 20 },
        width: 'half',
      },
      {
        key: 'subAgentConfig.spawnRules.autoSpawn',
        label: 'Auto-spawn Sub-agents',
        type: 'checkbox',
        section: 'subagent',
        description: 'Automatically spawn sub-agents when needed',
        defaultValue: false,
      },
      {
        key: 'subAgentConfig.spawnRules.inheritConfig',
        label: 'Inherit Configuration',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents inherit parent configuration',
        defaultValue: true,
      },
      {
        key: 'subAgentConfig.communication',
        label: 'Communication Mode',
        type: 'select',
        section: 'subagent',
        options: [
          { label: 'Synchronous', value: 'sync', description: 'Wait for each sub-agent' },
          { label: 'Asynchronous', value: 'async', description: 'Fire and forget' },
          { label: 'Event-driven', value: 'event-driven', description: 'React to events' },
        ],
        defaultValue: 'sync',
      },
      {
        key: 'subAgentConfig.resultAggregation',
        label: 'Result Aggregation',
        type: 'select',
        section: 'subagent',
        options: [
          { label: 'Merge All', value: 'merge', description: 'Combine all results' },
          { label: 'First Response', value: 'first', description: 'Use first result' },
          { label: 'Voting', value: 'vote', description: 'Consensus-based' },
          { label: 'Custom', value: 'custom', description: 'Custom aggregation' },
        ],
        defaultValue: 'merge',
      },
      {
        key: 'subAgentConfig.spawningMode',
        label: 'Spawning Mode',
        type: 'select',
        section: 'subagent',
        description: 'How sub-agents are created and managed',
        options: [
          { label: 'Eager', value: 'eager', description: 'Pre-spawn all sub-agents' },
          { label: 'Lazy', value: 'lazy', description: 'Spawn only when needed' },
          { label: 'On-demand', value: 'on-demand', description: 'Create per-task' },
          { label: 'Pooled', value: 'pooled', description: 'Use agent pool' },
        ],
        defaultValue: 'lazy',
      },
      {
        key: 'subAgentConfig.delegationDepth',
        label: 'Delegation Depth',
        type: 'number',
        section: 'subagent',
        description: 'Maximum levels of nested delegation (1-5)',
        defaultValue: 2,
        validation: { min: 1, max: 5 },
        width: 'half',
      },
      {
        key: 'subAgentConfig.isolatedContext',
        label: 'Isolated Context',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents have isolated memory context',
        defaultValue: false,
      },
      {
        key: 'subAgentConfig.agentIdFormat',
        label: 'Agent ID Format',
        type: 'select',
        section: 'subagent',
        description: 'Format for generated sub-agent IDs',
        options: [
          { label: 'UUID', value: 'uuid', description: 'Random UUID' },
          { label: 'Sequential', value: 'sequential', description: 'parent-1, parent-2, ...' },
          { label: 'Hierarchical', value: 'hierarchical', description: 'parent.child.grandchild' },
        ],
        defaultValue: 'hierarchical',
        width: 'half',
      },
      {
        key: 'subAgentConfig.inheritance.tools',
        label: 'Inherit Tools',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents inherit parent tools',
        defaultValue: true,
      },
      {
        key: 'subAgentConfig.inheritance.skills',
        label: 'Inherit Skills',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents inherit parent skills',
        defaultValue: true,
      },
      {
        key: 'subAgentConfig.inheritance.permissions',
        label: 'Inherit Permissions',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents inherit parent permission settings',
        defaultValue: true,
      },
      {
        key: 'subAgentConfig.inheritance.guardrails',
        label: 'Inherit Guardrails',
        type: 'checkbox',
        section: 'subagent',
        description: 'Sub-agents inherit parent guardrails',
        defaultValue: true,
      },

      // === PAL ORCHESTRATION SECTION (coordinator only) ===
      {
        key: 'palConfig.planPhase.enabled',
        label: 'Enable Planning Phase',
        type: 'checkbox',
        section: 'pal',
        description: 'Generate detailed plans before execution',
        defaultValue: true,
      },
      {
        key: 'palConfig.planPhase.maxPlanningTokens',
        label: 'Max Planning Tokens',
        type: 'number',
        section: 'pal',
        placeholder: '2000',
        defaultValue: 2000,
        validation: { min: 500, max: 10000 },
        width: 'half',
        conditional: { field: 'palConfig.planPhase.enabled', value: true },
      },
      {
        key: 'palConfig.planPhase.requireApproval',
        label: 'Require Plan Approval',
        type: 'checkbox',
        section: 'pal',
        description: 'User must approve plan before execution',
        defaultValue: false,
        conditional: { field: 'palConfig.planPhase.enabled', value: true },
      },
      {
        key: 'palConfig.allocatePhase.strategy',
        label: 'Allocation Strategy',
        type: 'select',
        section: 'pal',
        options: [
          { label: 'Sequential', value: 'sequential', description: 'One task at a time' },
          { label: 'Parallel', value: 'parallel', description: 'Multiple concurrent tasks' },
          { label: 'Adaptive', value: 'adaptive', description: 'Dynamic based on load' },
        ],
        defaultValue: 'adaptive',
      },
      {
        key: 'palConfig.allocatePhase.maxConcurrency',
        label: 'Max Concurrency',
        type: 'number',
        section: 'pal',
        placeholder: '3',
        defaultValue: 3,
        validation: { min: 1, max: 10 },
        width: 'half',
        conditional: { field: 'palConfig.allocatePhase.strategy', value: 'parallel' },
      },
      {
        key: 'palConfig.learnPhase.enabled',
        label: 'Enable Learning Phase',
        type: 'checkbox',
        section: 'pal',
        description: 'Learn from execution results',
        defaultValue: true,
      },
      {
        key: 'palConfig.learnPhase.feedbackLoop',
        label: 'Feedback Loop',
        type: 'checkbox',
        section: 'pal',
        description: 'Incorporate learnings into future plans',
        defaultValue: true,
        conditional: { field: 'palConfig.learnPhase.enabled', value: true },
      },
      {
        key: 'palConfig.learnPhase.memoryIntegration',
        label: 'Memory Integration',
        type: 'checkbox',
        section: 'pal',
        description: 'Store learnings in long-term memory',
        defaultValue: false,
        conditional: { field: 'palConfig.learnPhase.enabled', value: true },
      },
      {
        key: 'palConfig.palTools',
        label: 'PAL Tools',
        type: 'chips',
        section: 'pal',
        description: 'Tools available during PAL orchestration',
        options: [
          { label: 'TodoWrite', value: 'TodoWrite' },
          { label: 'Task', value: 'Task' },
          { label: 'EnterPlanMode', value: 'EnterPlanMode' },
          { label: 'ExitPlanMode', value: 'ExitPlanMode' },
        ],
        defaultValue: ['TodoWrite', 'Task'],
      },
      {
        key: 'palConfig.consensusConfig.enabled',
        label: 'Enable Consensus',
        type: 'checkbox',
        section: 'pal',
        description: 'Require agreement from multiple agents',
        defaultValue: false,
      },
      {
        key: 'palConfig.consensusConfig.threshold',
        label: 'Consensus Threshold',
        type: 'slider',
        section: 'pal',
        description: 'Percentage of agents that must agree (0-100%)',
        defaultValue: 0.67,
        validation: { min: 0.5, max: 1 },
        width: 'half',
        conditional: { field: 'palConfig.consensusConfig.enabled', value: true },
      },
      {
        key: 'palConfig.consensusConfig.votingMethod',
        label: 'Voting Method',
        type: 'select',
        section: 'pal',
        options: [
          { label: 'Majority', value: 'majority' },
          { label: 'Unanimous', value: 'unanimous' },
          { label: 'Weighted', value: 'weighted' },
        ],
        defaultValue: 'majority',
        width: 'half',
        conditional: { field: 'palConfig.consensusConfig.enabled', value: true },
      },
      {
        key: 'palConfig.contextRevival.enabled',
        label: 'Enable Context Revival',
        type: 'checkbox',
        section: 'pal',
        description: 'Restore context from previous sessions',
        defaultValue: false,
      },
      {
        key: 'palConfig.contextRevival.maxAge',
        label: 'Max Context Age (hours)',
        type: 'number',
        section: 'pal',
        description: 'Maximum age of context to restore',
        defaultValue: 24,
        validation: { min: 1, max: 168 },
        width: 'half',
        conditional: { field: 'palConfig.contextRevival.enabled', value: true },
      },
      {
        key: 'palConfig.contextRevival.priorityFields',
        label: 'Priority Fields',
        type: 'chips',
        section: 'pal',
        description: 'Fields to prioritize when restoring context',
        options: [
          { label: 'Goals', value: 'goals' },
          { label: 'Progress', value: 'progress' },
          { label: 'Errors', value: 'errors' },
          { label: 'Decisions', value: 'decisions' },
        ],
        defaultValue: ['goals', 'progress'],
        conditional: { field: 'palConfig.contextRevival.enabled', value: true },
      },

      // === DELEGATION SECTION (coordinator + team) ===
      {
        key: 'delegation.allowDelegation',
        label: 'Allow Delegation',
        type: 'checkbox',
        section: 'delegation',
        description: 'This agent can delegate tasks to others',
        defaultValue: true,
      },
      {
        key: 'delegation.delegationStrategy',
        label: 'Delegation Strategy',
        type: 'select',
        section: 'delegation',
        options: [
          { label: 'Capability-based', value: 'capability-based', description: 'Match by skills' },
          { label: 'Load-balanced', value: 'load-balanced', description: 'Distribute evenly' },
          { label: 'Round-robin', value: 'round-robin', description: 'Rotate assignment' },
        ],
        defaultValue: 'capability-based',
        conditional: { field: 'delegation.allowDelegation', value: true },
      },
      {
        key: 'delegation.escalationPath',
        label: 'Escalation Path',
        type: 'chips',
        section: 'delegation',
        description: 'Agent IDs for escalation (in order)',
        placeholder: 'Add agent ID...',
      },
      {
        key: 'delegation.autoDelegate',
        label: 'Auto-delegate',
        type: 'checkbox',
        section: 'delegation',
        description: 'Automatically delegate based on capability matching',
        defaultValue: false,
        conditional: { field: 'delegation.allowDelegation', value: true },
      },

      // === EXECUTION SECTION (executor role only) ===
      {
        key: 'execution.executionMode',
        label: 'Execution Mode',
        type: 'select',
        section: 'execution',
        options: [
          { label: 'Strict', value: 'strict', description: 'Follow plan exactly' },
          { label: 'Adaptive', value: 'adaptive', description: 'Minor adjustments allowed' },
          { label: 'Exploratory', value: 'exploratory', description: 'Explore alternatives' },
        ],
        defaultValue: 'strict',
      },
      {
        key: 'execution.retryPolicy.maxRetries',
        label: 'Max Retries',
        type: 'number',
        section: 'execution',
        placeholder: '3',
        defaultValue: 3,
        validation: { min: 0, max: 10 },
        width: 'half',
      },
      {
        key: 'execution.retryPolicy.backoffMs',
        label: 'Backoff (ms)',
        type: 'number',
        section: 'execution',
        placeholder: '1000',
        defaultValue: 1000,
        validation: { min: 100, max: 60000 },
        width: 'half',
      },
      {
        key: 'execution.retryPolicy.exponential',
        label: 'Exponential Backoff',
        type: 'checkbox',
        section: 'execution',
        description: 'Double backoff time on each retry',
        defaultValue: true,
      },
      {
        key: 'execution.checkpointing',
        label: 'Enable Checkpointing',
        type: 'checkbox',
        section: 'execution',
        description: 'Save progress at each step',
        defaultValue: true,
      },
      {
        key: 'execution.rollbackOnFailure',
        label: 'Rollback on Failure',
        type: 'checkbox',
        section: 'execution',
        description: 'Revert changes if execution fails',
        defaultValue: false,
      },

      // === GUARDRAILS SECTION (all roles) ===
      {
        key: 'guardrails.tokenLimit',
        label: 'Token Limit',
        type: 'number',
        section: 'guardrails',
        placeholder: '100000',
        defaultValue: 100000,
        description: 'Maximum tokens per session',
        validation: { min: 1000, max: 1000000 },
        width: 'half',
      },
      {
        key: 'guardrails.costCap',
        label: 'Cost Cap ($)',
        type: 'number',
        section: 'guardrails',
        placeholder: '10.00',
        description: 'Maximum cost per session in dollars',
        validation: { min: 0.01, max: 1000 },
        width: 'half',
      },
      {
        key: 'guardrails.timeoutSeconds',
        label: 'Timeout (seconds)',
        type: 'number',
        section: 'guardrails',
        placeholder: '300',
        defaultValue: 300,
        validation: { min: 30, max: 3600 },
        width: 'half',
      },
      {
        key: 'guardrails.maxRetries',
        label: 'Max Retries',
        type: 'number',
        section: 'guardrails',
        placeholder: '3',
        defaultValue: 3,
        validation: { min: 0, max: 10 },
        width: 'half',
      },
      {
        key: 'guardrails.contentFilters.profanity',
        label: 'Filter Profanity',
        type: 'checkbox',
        section: 'guardrails',
        defaultValue: true,
        width: 'half',
      },
      {
        key: 'guardrails.contentFilters.pii',
        label: 'Filter PII',
        type: 'checkbox',
        section: 'guardrails',
        description: 'Block personally identifiable information',
        defaultValue: true,
        width: 'half',
      },
      {
        key: 'guardrails.contentFilters.injection',
        label: 'Prompt Injection Detection',
        type: 'checkbox',
        section: 'guardrails',
        description: 'Detect and block prompt injection attempts',
        defaultValue: true,
      },

      // === OBSERVABILITY SECTION (all roles) ===
      {
        key: 'observability.logging.level',
        label: 'Log Level',
        type: 'select',
        section: 'observability',
        options: [
          { label: 'Debug', value: 'debug' },
          { label: 'Info', value: 'info' },
          { label: 'Warn', value: 'warn' },
          { label: 'Error', value: 'error' },
        ],
        defaultValue: 'info',
        width: 'half',
      },
      {
        key: 'observability.logging.destinations',
        label: 'Log Destinations',
        type: 'chips',
        section: 'observability',
        description: 'Where to send logs',
        placeholder: 'e.g., console, file, remote',
        defaultValue: ['console'],
      },
      {
        key: 'observability.metrics.enabled',
        label: 'Enable Metrics',
        type: 'checkbox',
        section: 'observability',
        defaultValue: true,
        width: 'half',
      },
      {
        key: 'observability.metrics.exportInterval',
        label: 'Export Interval (sec)',
        type: 'number',
        section: 'observability',
        placeholder: '60',
        defaultValue: 60,
        validation: { min: 10, max: 3600 },
        width: 'half',
        conditional: { field: 'observability.metrics.enabled', value: true },
      },
      {
        key: 'observability.tracing.enabled',
        label: 'Enable Tracing',
        type: 'checkbox',
        section: 'observability',
        defaultValue: false,
        width: 'half',
      },
      {
        key: 'observability.tracing.samplingRate',
        label: 'Sampling Rate',
        type: 'slider',
        section: 'observability',
        description: '0 = none, 1 = all traces',
        defaultValue: 0.1,
        validation: { min: 0, max: 1 },
        width: 'half',
        conditional: { field: 'observability.tracing.enabled', value: true },
      },

      // === MEMORY & CONTEXT SECTION (all roles) ===
      {
        key: 'memory.contextPersistence',
        label: 'Context Persistence',
        type: 'select',
        section: 'memory',
        options: [
          { label: 'None', value: 'none', description: 'No persistence' },
          { label: 'Session', value: 'session', description: 'Within session only' },
          { label: 'Persistent', value: 'persistent', description: 'Across sessions' },
        ],
        defaultValue: 'session',
      },
      {
        key: 'memory.memoryType',
        label: 'Memory Type',
        type: 'select',
        section: 'memory',
        options: [
          { label: 'Short-term', value: 'short-term', description: 'Recent context only' },
          { label: 'Long-term', value: 'long-term', description: 'Accumulated knowledge' },
          { label: 'Both', value: 'both', description: 'Short and long-term' },
        ],
        defaultValue: 'short-term',
      },
      {
        key: 'memory.maxContextTokens',
        label: 'Max Context Tokens',
        type: 'number',
        section: 'memory',
        placeholder: '8000',
        defaultValue: 8000,
        validation: { min: 1000, max: 200000 },
        width: 'half',
      },
      {
        key: 'memory.summarizationThreshold',
        label: 'Summarization Threshold',
        type: 'number',
        section: 'memory',
        description: 'Token count to trigger summarization',
        placeholder: '6000',
        defaultValue: 6000,
        validation: { min: 1000, max: 100000 },
        width: 'half',
      },

      // === MONITORING SECTION (continuous category only) ===
      {
        key: 'monitoring.healthChecks.interval',
        label: 'Health Check Interval (sec)',
        type: 'number',
        section: 'monitoring',
        placeholder: '60',
        defaultValue: 60,
        validation: { min: 10, max: 3600 },
        width: 'half',
      },
      {
        key: 'monitoring.healthChecks.endpoints',
        label: 'Health Endpoints',
        type: 'chips',
        section: 'monitoring',
        description: 'Endpoints to monitor',
        placeholder: 'Add endpoint URL...',
      },
      {
        key: 'monitoring.alerts.enabled',
        label: 'Enable Alerts',
        type: 'checkbox',
        section: 'monitoring',
        defaultValue: true,
        width: 'half',
      },
      {
        key: 'monitoring.alerts.channels',
        label: 'Alert Channels',
        type: 'chips',
        section: 'monitoring',
        description: 'Where to send alerts',
        placeholder: 'e.g., slack, email',
        defaultValue: ['slack'],
        conditional: { field: 'monitoring.alerts.enabled', value: true },
      },
      {
        key: 'monitoring.alerts.escalation',
        label: 'Enable Escalation',
        type: 'checkbox',
        section: 'monitoring',
        description: 'Escalate unacknowledged alerts',
        defaultValue: true,
        conditional: { field: 'monitoring.alerts.enabled', value: true },
      },
      {
        key: 'monitoring.dashboards',
        label: 'Dashboards',
        type: 'chips',
        section: 'monitoring',
        description: 'Dashboard identifiers',
        placeholder: 'Add dashboard ID...',
      },
    ],
  },

  // ===========================================================================
  // MCP_SERVER
  // ===========================================================================
  MCP_SERVER: {
    type: 'MCP_SERVER',
    displayName: 'MCP Server',
    icon: 'Server',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'command', label: 'Command', icon: 'Terminal', defaultOpen: true, collapsible: true },
      { id: 'environment', label: 'Environment', icon: 'FileCode', defaultOpen: true, collapsible: true },
      { id: 'auth', label: 'Authentication', icon: 'Key', defaultOpen: false, collapsible: true },
      { id: 'limits', label: 'Rate Limits', icon: 'Gauge', defaultOpen: false, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'command',
        label: 'Command',
        type: 'text',
        section: 'command',
        placeholder: 'npx, uvx, node, python...',
        description: 'The command to start the MCP server',
        validation: { required: true },
      },
      {
        key: 'args',
        label: 'Arguments',
        type: 'chips',
        section: 'command',
        placeholder: 'Add argument...',
        description: 'Command line arguments',
      },
      {
        key: 'env',
        label: 'Environment Variables',
        type: 'keyvalue',
        section: 'environment',
        description: 'Environment variables for the server',
        placeholder: 'KEY=value',
      },
      {
        key: 'auth.type',
        label: 'Auth Type',
        type: 'select',
        section: 'auth',
        options: authTypeOptions,
        defaultValue: 'api_key',
      },
      {
        key: 'auth.envVar',
        label: 'Credential Env Var',
        type: 'text',
        section: 'auth',
        placeholder: 'e.g., GITHUB_TOKEN',
        description: 'Environment variable containing the credential',
        conditional: { field: 'auth.type', value: 'none', operator: 'neq' },
      },
      {
        key: 'rateLimit.requestsPerMinute',
        label: 'Requests/Minute',
        type: 'number',
        section: 'limits',
        placeholder: '60',
        defaultValue: 60,
        validation: { min: 1, max: 10000 },
        width: 'half',
      },
      {
        key: 'rateLimit.tokensPerMinute',
        label: 'Tokens/Minute',
        type: 'number',
        section: 'limits',
        placeholder: '100000',
        defaultValue: 100000,
        validation: { min: 1000, max: 1000000 },
        width: 'half',
      },
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        section: 'limits',
        placeholder: '30000',
        defaultValue: 30000,
        validation: { min: 1000, max: 300000 },
        width: 'half',
      },
      {
        key: 'retryCount',
        label: 'Retry Count',
        type: 'number',
        section: 'limits',
        placeholder: '3',
        defaultValue: 3,
        validation: { min: 0, max: 10 },
        width: 'half',
      },
    ],
  },

  // ===========================================================================
  // SKILL
  // ===========================================================================
  SKILL: {
    type: 'SKILL',
    displayName: 'Skill',
    icon: 'Sparkles',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'triggers', label: 'Triggers', icon: 'Zap', defaultOpen: true, collapsible: true },
      { id: 'behavior', label: 'Behavior', icon: 'Sliders', defaultOpen: false, collapsible: true },
      { id: 'content', label: 'Content', icon: 'FileText', defaultOpen: false, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'triggers.keywords',
        label: 'Trigger Keywords',
        type: 'chips',
        section: 'triggers',
        placeholder: 'Add keyword...',
        description: 'Words that activate this skill',
      },
      {
        key: 'triggers.filePatterns',
        label: 'File Patterns',
        type: 'chips',
        section: 'triggers',
        placeholder: 'e.g., **/*.tsx',
        description: 'Glob patterns for file-based activation',
      },
      {
        key: 'triggers.commands',
        label: 'Commands',
        type: 'chips',
        section: 'triggers',
        placeholder: 'e.g., /code-review',
        description: 'Slash commands that trigger this skill',
      },
      {
        key: 'autoActivate',
        label: 'Auto Activate',
        type: 'checkbox',
        section: 'behavior',
        description: 'Automatically load when triggers match',
        defaultValue: true,
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'slider',
        section: 'behavior',
        description: 'Higher priority skills load first',
        defaultValue: 5,
        validation: { min: 1, max: 10 },
        width: 'half',
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        section: 'behavior',
        description: 'Token budget for this skill',
        placeholder: '5000',
        defaultValue: 5000,
        validation: { min: 100, max: 50000 },
        width: 'half',
      },
      {
        key: 'content',
        label: 'Skill Content',
        type: 'textarea',
        section: 'content',
        placeholder: '# Skill Name\n\n## Instructions\n...',
        description: 'Markdown content for the skill',
        validation: { maxLength: 50000 },
      },
    ],
  },

  // ===========================================================================
  // HOOK
  // ===========================================================================
  HOOK: {
    type: 'HOOK',
    displayName: 'Hook',
    icon: 'Anchor',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'trigger', label: 'Trigger', icon: 'Zap', defaultOpen: true, collapsible: true },
      { id: 'action', label: 'Action', icon: 'Play', defaultOpen: true, collapsible: true },
      { id: 'options', label: 'Options', icon: 'Settings', defaultOpen: false, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'event',
        label: 'Event',
        type: 'select',
        section: 'trigger',
        options: hookEventOptions,
        defaultValue: 'PostToolUse',
        validation: { required: true },
      },
      {
        key: 'matcher',
        label: 'Matcher Pattern',
        type: 'text',
        section: 'trigger',
        placeholder: 'e.g., Write|Edit',
        description: 'Tool name or regex pattern to match',
      },
      {
        key: 'command',
        label: 'Command',
        type: 'textarea',
        section: 'action',
        placeholder: 'npm run lint ${file}',
        description: 'Shell command to execute',
        validation: { required: true },
      },
      {
        key: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        section: 'options',
        placeholder: '30',
        defaultValue: 30,
        validation: { min: 1, max: 300 },
        width: 'half',
      },
      {
        key: 'onError',
        label: 'On Error',
        type: 'select',
        section: 'options',
        options: [
          { label: 'Ignore', value: 'ignore', description: 'Continue silently' },
          { label: 'Warn', value: 'warn', description: 'Show warning but continue' },
          { label: 'Fail', value: 'fail', description: 'Stop execution' },
        ],
        defaultValue: 'warn',
        width: 'half',
      },
      {
        key: 'environment',
        label: 'Environment Variables',
        type: 'keyvalue',
        section: 'options',
        description: 'Additional environment variables',
      },
    ],
  },

  // ===========================================================================
  // COMMAND
  // ===========================================================================
  COMMAND: {
    type: 'COMMAND',
    displayName: 'Command',
    icon: 'Terminal',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'config', label: 'Configuration', icon: 'Settings', defaultOpen: true, collapsible: true },
      { id: 'content', label: 'Template', icon: 'FileText', defaultOpen: true, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'department',
        label: 'Department',
        type: 'text',
        section: 'config',
        placeholder: 'e.g., research',
        description: 'Which department handles this command',
        width: 'half',
      },
      {
        key: 'agent',
        label: 'Handler Agent',
        type: 'text',
        section: 'config',
        placeholder: 'e.g., research-director',
        description: 'Which agent processes this command',
        width: 'half',
      },
      {
        key: 'outputFormat',
        label: 'Output Format',
        type: 'select',
        section: 'config',
        options: [
          { label: 'Markdown', value: 'markdown' },
          { label: 'JSON', value: 'json' },
          { label: 'Plain Text', value: 'text' },
          { label: 'Structured JSON', value: 'structured_json' },
        ],
        defaultValue: 'markdown',
        width: 'half',
      },
      {
        key: 'requiresApproval',
        label: 'Requires Approval',
        type: 'checkbox',
        section: 'config',
        description: 'User must approve before execution',
        defaultValue: false,
        width: 'half',
      },
      {
        key: 'content',
        label: 'Command Template',
        type: 'textarea',
        section: 'content',
        placeholder: '# /command-name\n\n## Instructions\n...',
        description: 'Markdown template for the command',
        validation: { maxLength: 20000 },
      },
    ],
  },

  // ===========================================================================
  // TOOL (Legacy support)
  // ===========================================================================
  TOOL: {
    type: 'TOOL',
    displayName: 'Tool',
    icon: 'Wrench',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'config', label: 'Configuration', icon: 'Settings', defaultOpen: true, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        section: 'config',
        placeholder: '5000',
        defaultValue: 5000,
        validation: { min: 1000, max: 300000 },
        width: 'half',
      },
      {
        key: 'retryCount',
        label: 'Retry Count',
        type: 'number',
        section: 'config',
        placeholder: '3',
        defaultValue: 3,
        validation: { min: 0, max: 10 },
        width: 'half',
      },
    ],
  },

  // ===========================================================================
  // PROVIDER (Legacy support)
  // ===========================================================================
  PROVIDER: {
    type: 'PROVIDER',
    displayName: 'Provider',
    icon: 'Cloud',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-500',
    isContainer: false,
    sections: [
      ...commonSections,
      { id: 'config', label: 'Configuration', icon: 'Settings', defaultOpen: true, collapsible: true },
    ],
    fields: [
      ...identityFields,
      {
        key: 'apiKeyEnvVar',
        label: 'API Key Env Var',
        type: 'text',
        section: 'config',
        placeholder: 'e.g., OPENAI_API_KEY',
        description: 'Environment variable containing the API key',
      },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        section: 'config',
        placeholder: 'https://api.example.com/v1',
        description: 'API base URL',
      },
    ],
  },

  // ===========================================================================
  // PLUGIN (Legacy support)
  // ===========================================================================
  PLUGIN: {
    type: 'PLUGIN',
    displayName: 'Plugin',
    icon: 'Puzzle',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    isContainer: false,
    sections: [
      ...commonSections,
    ],
    fields: [
      ...identityFields,
    ],
  },

  // ===========================================================================
  // REASONING (Legacy support)
  // ===========================================================================
  REASONING: {
    type: 'REASONING',
    displayName: 'Reasoning',
    icon: 'Brain',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-500',
    isContainer: false,
    sections: [
      ...commonSections,
    ],
    fields: [
      ...identityFields,
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get schema for a node type
 */
export const getSchemaForType = (type: NodeType): NodeTypeSchema => {
  return nodeSchemas[type];
};

/**
 * Get fields for a specific section
 */
export const getFieldsForSection = (type: NodeType, sectionId: string): FieldSchema[] => {
  const schema = nodeSchemas[type];
  return schema.fields.filter(f => f.section === sectionId);
};

/**
 * Get all sections for a node type
 */
export const getSectionsForType = (type: NodeType): SectionSchema[] => {
  return nodeSchemas[type].sections;
};

/**
 * Legacy function for backwards compatibility
 */
export const getFieldsForType = (type: NodeType): FieldSchema[] => {
  return nodeSchemas[type]?.fields || [];
};

/**
 * Get default values for a node type
 */
export const getDefaultsForType = (type: NodeType): Record<string, any> => {
  const schema = nodeSchemas[type];
  const defaults: Record<string, any> = {};

  schema.fields.forEach(field => {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    }
  });

  return defaults;
};

/**
 * Get models for a specific provider
 */
export const getModelsForProvider = (provider: string): { label: string; value: string }[] => {
  return modelsByProvider[provider] || modelsByProvider['anthropic'];
};
