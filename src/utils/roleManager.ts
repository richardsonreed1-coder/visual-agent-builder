// ============================================================================
// Role Manager - Centralized role metadata, visibility rules, and helpers
// ============================================================================

import { AgentRole, AgentRoleCategory, AgentConfig, ROLE_CATEGORY_MAP } from '../types/core';

// ============================================================================
// Role Metadata
// ============================================================================

export interface RoleMetadata {
  role: AgentRole;
  category: AgentRoleCategory;
  displayName: string;
  description: string;
  icon: string;  // Lucide icon name
  defaultTemperature: number;
  lockedFields?: Partial<Record<keyof AgentConfig, unknown>>;
}

export const ROLE_METADATA: Record<AgentRole, RoleMetadata> = {
  // Independent Category - work alone, planning, review
  solo: {
    role: 'solo',
    category: 'independent',
    displayName: 'Solo',
    description: 'Works independently on complete tasks without coordination',
    icon: 'User',
    defaultTemperature: 0.7,
  },
  specialist: {
    role: 'specialist',
    category: 'independent',
    displayName: 'Specialist',
    description: 'Deep expertise in a specific domain or technology',
    icon: 'GraduationCap',
    defaultTemperature: 0.5,
  },
  planner: {
    role: 'planner',
    category: 'independent',
    displayName: 'Planner',
    description: 'Creates detailed plans and breaks down complex tasks',
    icon: 'ListTodo',
    defaultTemperature: 0.6,
  },
  auditor: {
    role: 'auditor',
    category: 'independent',
    displayName: 'Auditor',
    description: 'Independent 3rd-party review and compliance checks',
    icon: 'ShieldCheck',
    defaultTemperature: 0.3,
  },
  critic: {
    role: 'critic',
    category: 'independent',
    displayName: 'Critic',
    description: 'Reviews and validates work, provides feedback',
    icon: 'MessageSquareWarning',
    defaultTemperature: 0.3,
  },

  // Team Category - execution-focused
  member: {
    role: 'member',
    category: 'team',
    displayName: 'Member',
    description: 'Executes assigned tasks as part of a team',
    icon: 'UserCheck',
    defaultTemperature: 0.7,
  },
  executor: {
    role: 'executor',
    category: 'team',
    displayName: 'Executor',
    description: 'Strictly follows plans with high precision',
    icon: 'Play',
    defaultTemperature: 0,  // Locked for precision
    lockedFields: { temperature: 0 },
  },

  // Coordinator Category - manage and orchestrate
  leader: {
    role: 'leader',
    category: 'coordinator',
    displayName: 'Leader',
    description: 'Orchestrates team and ensures quality delivery',
    icon: 'Crown',
    defaultTemperature: 0.5,
  },
  orchestrator: {
    role: 'orchestrator',
    category: 'coordinator',
    displayName: 'Orchestrator',
    description: 'Coordinates multiple team leaders and manages complexity',
    icon: 'Network',
    defaultTemperature: 0.4,
  },
  router: {
    role: 'router',
    category: 'coordinator',
    displayName: 'Router',
    description: 'Routes tasks to appropriate agents based on capabilities',
    icon: 'GitBranch',
    defaultTemperature: 0.2,
  },

  // Continuous Category - ongoing monitoring
  monitor: {
    role: 'monitor',
    category: 'continuous',
    displayName: 'Monitor',
    description: 'Continuous health monitoring and alerting',
    icon: 'Activity',
    defaultTemperature: 0.1,
  },
};

// ============================================================================
// Section Visibility Matrix
// ============================================================================

export type SectionId =
  | 'identity'
  | 'model'
  | 'role'
  | 'permissions'
  | 'tools'
  | 'capabilities'
  | 'advanced'
  | 'prompt'
  | 'subagent'
  | 'pal'
  | 'delegation'
  | 'execution'
  | 'guardrails'
  | 'observability'
  | 'memory'
  | 'monitoring';

// Sections visible for each category
export const CATEGORY_SECTIONS: Record<AgentRoleCategory, SectionId[]> = {
  independent: [
    'identity', 'model', 'role', 'permissions', 'tools',
    'capabilities', 'advanced', 'prompt',
    'guardrails', 'observability', 'memory',
  ],
  team: [
    'identity', 'model', 'role', 'permissions', 'tools',
    'capabilities', 'advanced', 'prompt',
    'delegation',  // Team can receive delegations
    'guardrails', 'observability', 'memory',
  ],
  coordinator: [
    'identity', 'model', 'role', 'permissions', 'tools',
    'capabilities', 'advanced', 'prompt',
    'subagent', 'pal', 'delegation',  // Full coordination features
    'guardrails', 'observability', 'memory',
  ],
  continuous: [
    'identity', 'model', 'role', 'permissions', 'tools',
    'capabilities', 'advanced', 'prompt',
    'guardrails', 'observability', 'memory',
    'monitoring',  // Unique to continuous
  ],
};

// Role-specific overrides (add sections beyond category)
export const ROLE_SECTION_OVERRIDES: Partial<Record<AgentRole, SectionId[]>> = {
  executor: ['execution'],  // Executor gets execution section
};

// Role-specific section removals (remove sections from category)
export const ROLE_SECTION_REMOVALS: Partial<Record<AgentRole, SectionId[]>> = {
  monitor: ['tools'],  // Monitor doesn't need tools - observation only
};

// ============================================================================
// Visibility Functions
// ============================================================================

/**
 * Get the category for a given role
 */
export const getRoleCategory = (role: AgentRole): AgentRoleCategory => {
  return ROLE_CATEGORY_MAP[role] || 'independent';
};

/**
 * Get visible sections for a given role
 * Uses memoization for performance
 */
const sectionVisibilityCache = new Map<AgentRole, Set<SectionId>>();

export const getVisibleSections = (role: AgentRole): Set<SectionId> => {
  if (sectionVisibilityCache.has(role)) {
    return sectionVisibilityCache.get(role)!;
  }

  const category = getRoleCategory(role);
  const categorySections = CATEGORY_SECTIONS[category] || [];
  const roleOverrides = ROLE_SECTION_OVERRIDES[role] || [];
  const roleRemovals = new Set(ROLE_SECTION_REMOVALS[role] || []);

  // Start with category sections, add overrides, remove role-specific removals
  const visibleSections = new Set<SectionId>(
    [...categorySections, ...roleOverrides].filter(s => !roleRemovals.has(s))
  );

  sectionVisibilityCache.set(role, visibleSections);

  return visibleSections;
};

/**
 * Check if a section should be visible for a given role
 */
export const isSectionVisible = (sectionId: SectionId, role: AgentRole): boolean => {
  const visibleSections = getVisibleSections(role);
  return visibleSections.has(sectionId);
};

/**
 * Clear the visibility cache (useful for testing)
 */
export const clearVisibilityCache = (): void => {
  sectionVisibilityCache.clear();
};

// ============================================================================
// Field Locking
// ============================================================================

/**
 * Locked field rules - defines which fields are locked to specific values for roles
 */
export interface LockedFieldRule {
  field: string;           // Field key (supports dot notation for nested fields)
  roles: AgentRole[];      // Roles this rule applies to
  value: unknown;          // Value to lock the field to
  reason: string;          // Human-readable explanation
}

export const LOCKED_FIELD_RULES: LockedFieldRule[] = [
  // Executor role - deterministic behavior
  {
    field: 'temperature',
    roles: ['executor'],
    value: 0,
    reason: 'Executors require deterministic behavior (temperature=0)',
  },
  {
    field: 'thinkingMode',
    roles: ['executor'],
    value: 'none',
    reason: 'Executors follow plans precisely without extended reasoning',
  },
  // Router role - fast, consistent routing
  {
    field: 'temperature',
    roles: ['router'],
    value: 0.2,
    reason: 'Routers need low randomness for consistent task routing',
  },
  {
    field: 'thinkingMode',
    roles: ['router'],
    value: 'none',
    reason: 'Routers need fast inference without extended thinking',
  },
  // Monitor role - observational consistency
  {
    field: 'temperature',
    roles: ['monitor'],
    value: 0.1,
    reason: 'Monitors require consistent observational behavior',
  },
  {
    field: 'thinkingMode',
    roles: ['monitor'],
    value: 'none',
    reason: 'Monitors need quick, consistent responses',
  },
  // Auditor role - balanced review
  {
    field: 'temperature',
    roles: ['auditor'],
    value: 0.3,
    reason: 'Auditors need low randomness for consistent reviews',
  },
];

/**
 * Get locked fields for a role (fields that cannot be edited)
 */
export const getLockedFields = (role: AgentRole): Partial<Record<keyof AgentConfig, unknown>> => {
  return ROLE_METADATA[role]?.lockedFields || {};
};

/**
 * Check if a specific field is locked for a role
 */
export const isFieldLocked = (role: AgentRole, fieldKey: string): boolean => {
  return LOCKED_FIELD_RULES.some(
    rule => rule.field === fieldKey && rule.roles.includes(role)
  );
};

/**
 * Get the locked value for a field if it's locked for this role
 */
export const getLockedValue = (role: AgentRole, fieldKey: string): { locked: boolean; value?: unknown; reason?: string } => {
  const rule = LOCKED_FIELD_RULES.find(
    r => r.field === fieldKey && r.roles.includes(role)
  );

  if (rule) {
    return { locked: true, value: rule.value, reason: rule.reason };
  }

  return { locked: false };
};

/**
 * Get all locked fields for a role with their values and reasons
 */
export const getLockedFieldsForRole = (role: AgentRole): LockedFieldRule[] => {
  return LOCKED_FIELD_RULES.filter(rule => rule.roles.includes(role));
};

// ============================================================================
// Role Defaults
// ============================================================================

/**
 * Get default values for a role
 */
export const getRoleDefaults = (role: AgentRole): Partial<AgentConfig> => {
  const metadata = ROLE_METADATA[role];
  if (!metadata) return {};

  return {
    role,
    roleCategory: metadata.category,
    temperature: metadata.defaultTemperature,
    ...(metadata.lockedFields as Partial<AgentConfig>),
  };
};

// ============================================================================
// Migration & Backward Compatibility
// ============================================================================

/**
 * Migrate legacy 5-role workflows to new 11-role system
 * All 5 legacy roles exist in the new system, so this is straightforward
 */
export const migrateLegacyRole = (legacyRole: string): AgentRole => {
  const validRoles: AgentRole[] = [
    'solo', 'member', 'leader', 'orchestrator', 'auditor',
    'specialist', 'planner', 'executor', 'critic', 'router', 'monitor'
  ];

  if (validRoles.includes(legacyRole as AgentRole)) {
    return legacyRole as AgentRole;
  }

  // Default fallback for unknown roles
  return 'member';
};

// ============================================================================
// Role Options for UI
// ============================================================================

export interface RoleOption {
  label: string;
  value: AgentRole;
  description: string;
  category: AgentRoleCategory;
}

/**
 * Get role options grouped by category
 */
export const getRoleOptionsGrouped = (): Record<AgentRoleCategory, RoleOption[]> => {
  const groups: Record<AgentRoleCategory, RoleOption[]> = {
    independent: [],
    team: [],
    coordinator: [],
    continuous: [],
  };

  Object.values(ROLE_METADATA).forEach(meta => {
    groups[meta.category].push({
      label: meta.displayName,
      value: meta.role,
      description: meta.description,
      category: meta.category,
    });
  });

  return groups;
};

/**
 * Get flat role options for select dropdown
 */
export const getRoleOptions = (): RoleOption[] => {
  return Object.values(ROLE_METADATA).map(meta => ({
    label: meta.displayName,
    value: meta.role,
    description: meta.description,
    category: meta.category,
  }));
};

/**
 * Get category display info
 */
export const CATEGORY_DISPLAY_INFO: Record<AgentRoleCategory, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  independent: {
    label: 'Independent',
    description: 'Work alone without coordination',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  team: {
    label: 'Team',
    description: 'Part of a coordinated group',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  coordinator: {
    label: 'Coordinator',
    description: 'Manage and orchestrate others',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  continuous: {
    label: 'Continuous',
    description: 'Ongoing monitoring and auditing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
};
