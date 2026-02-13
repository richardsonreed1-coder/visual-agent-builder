/**
 * Workflow Migration Utilities
 *
 * Handles backward compatibility for workflows created with older schema versions.
 * Migrates legacy 5-role format to the new 11-role format.
 */

import { Node } from 'reactflow';
import { AgentRole, ROLE_CATEGORY_MAP } from '../types/core';
import { getRoleDefaults } from './roleManager';

// Legacy role mapping (5 roles to new 11 roles)
const LEGACY_ROLE_MAP: Record<string, AgentRole> = {
  // Direct mappings - these roles exist in both systems
  solo: 'solo',
  leader: 'leader',
  executor: 'executor',
  critic: 'critic',

  // 'worker' was the old name, maps to 'member'
  worker: 'member',

  // Fallback for any unknown roles
  default: 'solo',
};

/**
 * Check if a workflow needs migration
 * @param nodes - Array of React Flow nodes
 * @returns true if any node needs migration
 */
export const needsMigration = (nodes: Node[]): boolean => {
  return nodes.some((node) => {
    // Only check AGENT nodes
    if (node.data?.nodeType !== 'AGENT') return false;

    const config = node.data?.config;
    if (!config) return false;

    // Check for legacy role names
    if (config.role && LEGACY_ROLE_MAP[config.role] !== config.role && LEGACY_ROLE_MAP[config.role] !== undefined) {
      return true;
    }

    // Check for missing roleCategory (indicates old schema)
    if (config.role && !config.roleCategory) {
      return true;
    }

    // Check for 'worker' role specifically
    if (config.role === 'worker') {
      return true;
    }

    return false;
  });
};

/**
 * Migrate a single node's config to the new schema
 * @param config - Node config object
 * @returns Migrated config object
 */
const migrateNodeConfig = (config: Record<string, unknown>): Record<string, unknown> => {
  const migrated = { ...config };

  // Migrate legacy role names
  if (config.role) {
    const legacyRole = config.role as string;

    // Map legacy 'worker' to 'member'
    if (legacyRole === 'worker') {
      migrated.role = 'member';
    }

    // Ensure role is valid
    const role = migrated.role as AgentRole;
    if (role && ROLE_CATEGORY_MAP[role]) {
      // Add roleCategory if missing
      if (!migrated.roleCategory) {
        migrated.roleCategory = ROLE_CATEGORY_MAP[role];
      }

      // Apply role defaults for new config sections
      const roleDefaults = getRoleDefaults(role);

      // Initialize new config sections with defaults if missing
      if (!migrated.guardrails && roleDefaults.guardrails) {
        migrated.guardrails = roleDefaults.guardrails;
      }

      if (!migrated.observability && roleDefaults.observability) {
        migrated.observability = roleDefaults.observability;
      }

      if (!migrated.memory && roleDefaults.memory) {
        migrated.memory = roleDefaults.memory;
      }
    }
  }

  return migrated;
};

/**
 * Migrate all nodes in a workflow to the new schema
 * @param nodes - Array of React Flow nodes
 * @returns Array of migrated nodes
 */
export const migrateWorkflow = (nodes: Node[]): Node[] => {
  return nodes.map((node) => {
    // Only migrate AGENT nodes
    if (node.data?.nodeType !== 'AGENT') return node;

    const config = node.data?.config;
    if (!config) return node;

    // Migrate the config
    const migratedConfig = migrateNodeConfig(config);

    // Return updated node
    return {
      ...node,
      data: {
        ...node.data,
        config: migratedConfig,
      },
    };
  });
};

/**
 * Get migration summary for user notification
 * @param nodes - Array of React Flow nodes
 * @returns Summary object with migration details
 */
export const getMigrationSummary = (nodes: Node[]): {
  totalNodes: number;
  migratedNodes: number;
  changes: Array<{ nodeId: string; label: string; oldRole?: string; newRole?: string }>;
} => {
  const changes: Array<{ nodeId: string; label: string; oldRole?: string; newRole?: string }> = [];

  nodes.forEach((node) => {
    if (node.data?.nodeType !== 'AGENT') return;

    const config = node.data?.config;
    if (!config) return;

    // Check if this node would be migrated
    if (config.role === 'worker') {
      changes.push({
        nodeId: node.id,
        label: node.data.label || node.id,
        oldRole: 'worker',
        newRole: 'member',
      });
    } else if (config.role && !config.roleCategory) {
      changes.push({
        nodeId: node.id,
        label: node.data.label || node.id,
        oldRole: config.role as string,
        newRole: config.role as string, // Same role, just adding category
      });
    }
  });

  return {
    totalNodes: nodes.filter((n) => n.data?.nodeType === 'AGENT').length,
    migratedNodes: changes.length,
    changes,
  };
};

/**
 * Validate that a workflow has been properly migrated
 * @param nodes - Array of React Flow nodes
 * @returns Validation result
 */
export const validateMigration = (nodes: Node[]): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  nodes.forEach((node) => {
    if (node.data?.nodeType !== 'AGENT') return;

    const config = node.data?.config;
    if (!config) return;

    // Check role is valid
    if (config.role && !ROLE_CATEGORY_MAP[config.role as AgentRole]) {
      errors.push(`Node "${node.data.label || node.id}" has invalid role: ${config.role}`);
    }

    // Check roleCategory matches role
    if (config.role && config.roleCategory) {
      const expectedCategory = ROLE_CATEGORY_MAP[config.role as AgentRole];
      if (expectedCategory && expectedCategory !== config.roleCategory) {
        errors.push(
          `Node "${node.data.label || node.id}" has mismatched roleCategory: expected ${expectedCategory}, got ${config.roleCategory}`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
