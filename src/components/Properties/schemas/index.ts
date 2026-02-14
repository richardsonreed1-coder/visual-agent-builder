import { NodeType } from '@/types/core';
import type { NodeTypeSchema, FieldSchema, SectionSchema } from './types';
import { modelsByProvider } from './constants';

// Import individual schemas
import { departmentSchema, agentPoolSchema } from './containers';
import { agentSchema } from './agent';
import { mcpServerSchema, skillSchema, hookSchema } from './capabilities';
import { commandSchema, toolSchema, providerSchema, pluginSchema, reasoningSchema } from './simple';

// Re-export types
export type { FieldType, FieldValidation, FieldSchema, SectionSchema, NodeTypeSchema } from './types';

// Re-export constants
export {
  identityFields,
  commonSections,
  providerOptions,
  modelsByProvider,
  toolOptions,
  permissionModeOptions,
  roleOptions,
  hookEventOptions,
  loadBalancingOptions,
  authTypeOptions,
  departmentColorOptions,
} from './constants';

// ============================================================================
// Node Schema Registry
// ============================================================================

export const nodeSchemas: Record<NodeType, NodeTypeSchema> = {
  DEPARTMENT: departmentSchema,
  AGENT_POOL: agentPoolSchema,
  AGENT: agentSchema,
  MCP_SERVER: mcpServerSchema,
  SKILL: skillSchema,
  HOOK: hookSchema,
  COMMAND: commandSchema,
  TOOL: toolSchema,
  PROVIDER: providerSchema,
  PLUGIN: pluginSchema,
  REASONING: reasoningSchema,
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
export const getDefaultsForType = (type: NodeType): Record<string, string | number | boolean | string[]> => {
  const schema = nodeSchemas[type];
  const defaults: Record<string, string | number | boolean | string[]> = {};

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
