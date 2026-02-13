// =============================================================================
// Framework Types
// =============================================================================

export type ExportFramework = 'vab-native' | 'langgraph' | 'crewai' | 'autogen';
export type SkillSchema = 'agentskills' | 'simple';
export type Environment = 'development' | 'staging' | 'production';

// =============================================================================
// Framework-Specific Options
// =============================================================================

export interface VABNativeOptions {
  outputFormat: 'directory' | 'single-file';
  includeHooks: boolean;
  includeMcp: boolean;
  includeCommands: boolean;
  generateReadme: boolean;
}

export interface LangGraphOptions {
  stateSchema: 'typed-dict' | 'pydantic' | 'dataclass';
  checkpointer: 'memory' | 'sqlite' | 'postgres' | 'none';
  asyncMode: boolean;
  streamingEnabled: boolean;
  recursionLimit: number;
}

export interface CrewAIOptions {
  processType: 'sequential' | 'hierarchical';
  managerLlm: string;
  verbose: boolean;
  memoryEnabled: boolean;
  cacheEnabled: boolean;
  embedderProvider: 'openai' | 'huggingface' | 'none';
}

export interface AutoGenOptions {
  conversationPattern: 'two-agent' | 'group-chat' | 'nested';
  humanInputMode: 'ALWAYS' | 'TERMINATE' | 'NEVER';
  codeExecutionEnabled: boolean;
  maxConsecutiveAutoReply: number;
  useDocker: boolean;
}

export interface FrameworkOptions {
  vabNative?: VABNativeOptions;
  langgraph?: LangGraphOptions;
  crewai?: CrewAIOptions;
  autogen?: AutoGenOptions;
}

// =============================================================================
// Model Configuration
// =============================================================================

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'azure' | 'xai' | 'ollama' | 'openrouter' | 'custom';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKeyEnvVar?: string;
}

// =============================================================================
// Main Configuration
// =============================================================================

export interface WorkflowConfig {
  // Identity
  name: string;
  description: string;
  version: string;

  // Export Target
  framework: ExportFramework;
  skillSchema: SkillSchema;

  // Framework Options
  frameworkOptions: FrameworkOptions;

  // Defaults
  defaultModel: ModelConfig;
  environment: Environment;

  // Metadata
  author?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_VAB_NATIVE_OPTIONS: VABNativeOptions = {
  outputFormat: 'directory',
  includeHooks: true,
  includeMcp: true,
  includeCommands: true,
  generateReadme: true,
};

export const DEFAULT_LANGGRAPH_OPTIONS: LangGraphOptions = {
  stateSchema: 'typed-dict',
  checkpointer: 'memory',
  asyncMode: true,
  streamingEnabled: true,
  recursionLimit: 50,
};

export const DEFAULT_CREWAI_OPTIONS: CrewAIOptions = {
  processType: 'sequential',
  managerLlm: 'anthropic/claude-sonnet-4-20250514',
  verbose: true,
  memoryEnabled: true,
  cacheEnabled: true,
  embedderProvider: 'openai',
};

export const DEFAULT_AUTOGEN_OPTIONS: AutoGenOptions = {
  conversationPattern: 'group-chat',
  humanInputMode: 'TERMINATE',
  codeExecutionEnabled: true,
  maxConsecutiveAutoReply: 10,
  useDocker: false,
};

export const DEFAULT_FRAMEWORK_OPTIONS: FrameworkOptions = {
  vabNative: DEFAULT_VAB_NATIVE_OPTIONS,
  langgraph: DEFAULT_LANGGRAPH_OPTIONS,
  crewai: DEFAULT_CREWAI_OPTIONS,
  autogen: DEFAULT_AUTOGEN_OPTIONS,
};

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.5,
  maxTokens: 4096,
};

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  name: 'Untitled Workflow',
  description: '',
  version: '1.0.0',
  framework: 'vab-native',
  skillSchema: 'agentskills',
  frameworkOptions: DEFAULT_FRAMEWORK_OPTIONS,
  defaultModel: DEFAULT_MODEL_CONFIG,
  environment: 'development',
};

// =============================================================================
// Framework Metadata (for UI)
// =============================================================================

export interface FrameworkMeta {
  value: ExportFramework;
  label: string;
  description: string;
  color: string;
  icon: string;
}

export const FRAMEWORK_METADATA: Record<ExportFramework, FrameworkMeta> = {
  'vab-native': {
    value: 'vab-native',
    label: 'VAB Native',
    description: 'Claude Code CLI / .claude/ directory',
    color: 'indigo',
    icon: 'Package',
  },
  langgraph: {
    value: 'langgraph',
    label: 'LangGraph',
    description: 'Python graph-based orchestration',
    color: 'purple',
    icon: 'GitBranch',
  },
  crewai: {
    value: 'crewai',
    label: 'CrewAI',
    description: 'Role-playing agent framework',
    color: 'teal',
    icon: 'Users',
  },
  autogen: {
    value: 'autogen',
    label: 'AutoGen',
    description: 'Microsoft multi-agent conversations',
    color: 'amber',
    icon: 'Bot',
  },
};

export interface SkillSchemaMeta {
  value: SkillSchema;
  label: string;
  description: string;
  recommended: boolean;
}

export const SKILL_SCHEMA_METADATA: Record<SkillSchema, SkillSchemaMeta> = {
  agentskills: {
    value: 'agentskills',
    label: 'AgentSkills.io',
    description: 'Rich metadata, triggers, auto-activation',
    recommended: true,
  },
  simple: {
    value: 'simple',
    label: 'Simple',
    description: 'Plain markdown, minimal metadata',
    recommended: false,
  },
};
