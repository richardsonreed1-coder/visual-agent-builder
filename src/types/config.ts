// =============================================================================
// Framework Types
// =============================================================================

export type ExportFramework = 'vab-native';
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

export interface FrameworkOptions {
  vabNative?: VABNativeOptions;
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

export const DEFAULT_FRAMEWORK_OPTIONS: FrameworkOptions = {
  vabNative: DEFAULT_VAB_NATIVE_OPTIONS,
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
