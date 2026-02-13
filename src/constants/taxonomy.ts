// =============================================================================
// Component Tag Taxonomy
// Single source of truth for all component classification tags
// =============================================================================

export const TAG_TAXONOMY = {
  // Domain areas
  domains: [
    'web',
    'data',
    'code',
    'devops',
    'security',
    'ai',
    'docs',
    'testing',
    'mobile',
    'backend',
    'frontend',
    'infrastructure',
  ],

  // Use case categories
  useCases: [
    'automation',
    'analysis',
    'generation',
    'review',
    'testing',
    'monitoring',
    'deployment',
    'debugging',
    'refactoring',
    'documentation',
  ],

  // External service integrations
  integrations: [
    'github',
    'gitlab',
    'slack',
    'discord',
    'google',
    'aws',
    'azure',
    'database',
    'docker',
    'kubernetes',
    'vercel',
    'supabase',
  ],
} as const;

// Derived types from the taxonomy
export type Domain = (typeof TAG_TAXONOMY.domains)[number];
export type UseCase = (typeof TAG_TAXONOMY.useCases)[number];
export type Integration = (typeof TAG_TAXONOMY.integrations)[number];

// Combined tag type
export type Tag = Domain | UseCase | Integration;

// Complexity levels for components
export const COMPLEXITY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

// =============================================================================
// Tag Inference Patterns
// Maps file path patterns or keywords to likely tags
// =============================================================================

export const TAG_INFERENCE_PATTERNS: Record<string, Tag[]> = {
  // Path-based patterns
  'frontend': ['frontend', 'web'],
  'backend': ['backend', 'code'],
  'react': ['frontend', 'web'],
  'vue': ['frontend', 'web'],
  'next': ['frontend', 'web'],
  'api': ['backend', 'code'],
  'database': ['database', 'backend'],
  'db': ['database', 'backend'],
  'sql': ['database', 'backend'],
  'test': ['testing'],
  'spec': ['testing'],
  'deploy': ['deployment', 'devops'],
  'ci': ['devops', 'automation'],
  'cd': ['devops', 'deployment'],
  'docker': ['docker', 'devops'],
  'k8s': ['kubernetes', 'devops'],
  'kubernetes': ['kubernetes', 'devops'],
  'aws': ['aws', 'infrastructure'],
  'azure': ['azure', 'infrastructure'],
  'gcp': ['infrastructure'],
  'security': ['security'],
  'auth': ['security', 'backend'],
  'github': ['github'],
  'gitlab': ['gitlab'],
  'slack': ['slack'],
  'discord': ['discord'],
  'ai': ['ai'],
  'ml': ['ai', 'data'],
  'llm': ['ai'],
  'agent': ['ai', 'automation'],
  'docs': ['docs', 'documentation'],
  'readme': ['docs', 'documentation'],
  'monitor': ['monitoring', 'devops'],
  'log': ['monitoring', 'debugging'],
  'debug': ['debugging'],
  'refactor': ['refactoring', 'code'],
  'lint': ['code', 'review'],
  'review': ['review', 'code'],
  'analyze': ['analysis'],
  'generate': ['generation'],
  'create': ['generation'],
  'build': ['automation', 'devops'],
  'mobile': ['mobile'],
  'ios': ['mobile'],
  'android': ['mobile'],
  'vercel': ['vercel', 'deployment'],
  'supabase': ['supabase', 'database'],
};

// =============================================================================
// Complexity Inference
// Maps patterns to complexity levels
// =============================================================================

export const COMPLEXITY_PATTERNS: Record<string, Complexity> = {
  'simple': 'beginner',
  'basic': 'beginner',
  'intro': 'beginner',
  'starter': 'beginner',
  'hello': 'beginner',
  'example': 'beginner',
  'tutorial': 'beginner',
  'advanced': 'advanced',
  'complex': 'advanced',
  'enterprise': 'advanced',
  'production': 'advanced',
  'scale': 'advanced',
  'distributed': 'advanced',
  'microservice': 'advanced',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Infer tags from a component name or path
 */
export function inferTags(text: string): Tag[] {
  const normalizedText = text.toLowerCase();
  const matchedTags = new Set<Tag>();

  for (const [pattern, tags] of Object.entries(TAG_INFERENCE_PATTERNS)) {
    if (normalizedText.includes(pattern)) {
      tags.forEach((tag) => matchedTags.add(tag));
    }
  }

  return Array.from(matchedTags);
}

/**
 * Infer complexity from a component name or path
 */
export function inferComplexity(text: string): Complexity {
  const normalizedText = text.toLowerCase();

  for (const [pattern, complexity] of Object.entries(COMPLEXITY_PATTERNS)) {
    if (normalizedText.includes(pattern)) {
      return complexity;
    }
  }

  return 'intermediate'; // Default
}

/**
 * Get all valid tags for validation
 */
export function getAllTags(): Tag[] {
  return [
    ...TAG_TAXONOMY.domains,
    ...TAG_TAXONOMY.useCases,
    ...TAG_TAXONOMY.integrations,
  ];
}

/**
 * Validate that a tag is in the taxonomy
 */
export function isValidTag(tag: string): tag is Tag {
  return getAllTags().includes(tag as Tag);
}
