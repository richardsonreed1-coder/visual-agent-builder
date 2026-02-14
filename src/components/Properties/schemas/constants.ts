import type { FieldSchema, SectionSchema } from './types';

// ============================================================================
// Common Field Definitions (Reusable)
// ============================================================================

export const identityFields: FieldSchema[] = [
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

export const commonSections: SectionSchema[] = [
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
