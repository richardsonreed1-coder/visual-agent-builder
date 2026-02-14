import type { NodeTypeSchema } from './types';
import { commonSections, identityFields } from './constants';

// ============================================================================
// Simple Node Schemas: COMMAND, TOOL, PROVIDER, PLUGIN, REASONING
// ============================================================================

export const commandSchema: NodeTypeSchema = {
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
};

export const toolSchema: NodeTypeSchema = {
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
};

export const providerSchema: NodeTypeSchema = {
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
};

export const pluginSchema: NodeTypeSchema = {
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
};

export const reasoningSchema: NodeTypeSchema = {
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
};
