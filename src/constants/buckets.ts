// =============================================================================
// Capability Bucket Taxonomy
// Single source of truth for bucket metadata (frontend only)
// =============================================================================

export const CAPABILITY_BUCKETS = {
  development: {
    id: 'development',
    name: 'Development & Coding',
    icon: 'Code',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Build apps, write code, architecture',
  },
  'testing-quality': {
    id: 'testing-quality',
    name: 'Testing & Quality',
    icon: 'TestTube',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Test automation, QA, code quality',
  },
  'devops-infra': {
    id: 'devops-infra',
    name: 'DevOps & Infrastructure',
    icon: 'Server',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Deploy, CI/CD, cloud infrastructure',
  },
  security: {
    id: 'security',
    name: 'Security & Compliance',
    icon: 'Shield',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Security audits, authentication, compliance',
  },
  'data-ai': {
    id: 'data-ai',
    name: 'Data & AI/ML',
    icon: 'Brain',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Data analysis, machine learning, AI research',
  },
  documentation: {
    id: 'documentation',
    name: 'Documentation & Content',
    icon: 'FileText',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Docs, README, technical writing',
  },
  'git-vcs': {
    id: 'git-vcs',
    name: 'Git & Version Control',
    icon: 'GitBranch',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Git workflows, branching, code review',
  },
  automation: {
    id: 'automation',
    name: 'Automation & Workflows',
    icon: 'Workflow',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Task automation, hooks, scripts',
  },
  integrations: {
    id: 'integrations',
    name: 'Integrations & Services',
    icon: 'Plug',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'External services, APIs, third-party tools',
  },
  uncategorized: {
    id: 'uncategorized',
    name: 'Other',
    icon: 'HelpCircle',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description: 'Components without clear categorization',
  },
} as const;

// Type for bucket IDs
export type BucketId = keyof typeof CAPABILITY_BUCKETS;

// Type for bucket metadata
export type BucketInfo = (typeof CAPABILITY_BUCKETS)[BucketId];

// Array of all bucket IDs for iteration
export const BUCKET_IDS = Object.keys(CAPABILITY_BUCKETS) as BucketId[];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get bucket display info by ID
 * Falls back to uncategorized if bucket ID is unknown
 */
export function getBucketInfo(bucketId: string): BucketInfo {
  return (
    CAPABILITY_BUCKETS[bucketId as BucketId] || CAPABILITY_BUCKETS.uncategorized
  );
}

/**
 * Check if a bucket ID is valid
 */
export function isValidBucket(bucketId: string): bucketId is BucketId {
  return bucketId in CAPABILITY_BUCKETS;
}

/**
 * Get all buckets as an array (useful for rendering)
 */
export function getAllBuckets(): BucketInfo[] {
  return Object.values(CAPABILITY_BUCKETS);
}
