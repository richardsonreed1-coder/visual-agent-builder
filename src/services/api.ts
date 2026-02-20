import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface BundleComponent {
  name: string;
  path: string;
  category: string; // 'agents', 'commands', 'skills', 'hooks'
  description?: string;
}

export interface BundleData {
  description?: string;
  components: {
    agents: BundleComponent[];
    commands: BundleComponent[];
    skills: BundleComponent[];
    hooks: BundleComponent[];
  };
  totalCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file' | 'bundle';
  category?: string;
  description?: string;
  repo?: string; // Source repository name
  children?: InventoryItem[];
  bundleData?: BundleData;

  // Phase 1: Search support
  searchText?: string; // Pre-computed: name + description + category

  // Phase 2: Extended metadata (future)
  tags?: string[];
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  domain?: string;
}

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const response = await axios.get<InventoryItem[]>(`${API_URL}/inventory`);
  return response.data;
};

export const fetchComponentContent = async (filePath: string): Promise<string> => {
  const response = await axios.get<{ content: string }>(
    `${API_URL}/component-content`,
    { params: { path: filePath } }
  );
  return response.data.content;
};

// =============================================================================
// Search API
// =============================================================================

export interface SearchFacets {
  repos: string[];
  types: string[];
  categories: string[];
  buckets: string[]; // Capability bucket IDs
  subcategories: string[]; // All unique subcategories in results
}

export interface FlattenedItem {
  id: string;
  name: string;
  path: string;
  nodeType: string;
  category?: string;
  description?: string;
  repo?: string;
  searchText: string;
  isBundle: boolean;
  buckets: string[]; // Capability bucket IDs
  subcategories: string[]; // Parallel array: subcategories[i] for buckets[i]
}

export interface SearchResult {
  items: FlattenedItem[];
  facets: SearchFacets;
  total: number;
  limit: number;
  offset: number;
}

export interface SearchParams {
  q?: string;
  types?: string[];
  repos?: string[];
  categories?: string[];
  buckets?: string[]; // Capability bucket filter (OR logic)
  subcategories?: string[]; // Requires bucket filter; AND with bucket, OR within subcategories
  limit?: number;
  offset?: number;
}

export const searchInventory = async (params: SearchParams): Promise<SearchResult> => {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.set('q', params.q);
  if (params.types?.length) queryParams.set('types', params.types.join(','));
  if (params.repos?.length) queryParams.set('repos', params.repos.join(','));
  if (params.categories?.length) queryParams.set('categories', params.categories.join(','));
  if (params.buckets?.length) queryParams.set('buckets', params.buckets.join(','));
  if (params.subcategories?.length) queryParams.set('subcategories', params.subcategories.join(','));
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  const response = await axios.get<SearchResult>(
    `${API_URL}/inventory/search?${queryParams.toString()}`
  );
  return response.data;
};

// =============================================================================
// Bucket Counts API
// =============================================================================

export interface BucketCounts {
  counts: Record<string, number>;
}

export const fetchBucketCounts = async (): Promise<BucketCounts> => {
  const response = await axios.get<BucketCounts>(`${API_URL}/inventory/bucket-counts`);
  return response.data;
};

// =============================================================================
// Systems API
// =============================================================================

export type DeploymentStatus = 'deployed' | 'stopped' | 'errored' | 'archived';
export type TriggerPattern = 'cron' | 'webhook' | 'messaging' | 'always-on';

export interface SystemManifest {
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string;
  requiredInputs: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  outputType: string;
  estimatedCostUsd: number;
  triggerPattern: TriggerPattern;
  nodeCount: number;
  edgeCount: number;
}

export interface DeploymentRecord {
  id: string;
  systemName: string;
  systemSlug: string;
  manifestJson: SystemManifest;
  canvasJson: unknown;
  openclawConfig: unknown;
  triggerType: TriggerPattern;
  triggerConfig: unknown;
  pm2ProcessName: string;
  status: DeploymentStatus;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchSystems = async (): Promise<DeploymentRecord[]> => {
  const response = await axios.get<{ systems: DeploymentRecord[] }>(`${API_URL}/systems`);
  return response.data.systems;
};

export const fetchSystem = async (slug: string): Promise<DeploymentRecord> => {
  const response = await axios.get<DeploymentRecord>(`${API_URL}/systems/${slug}`);
  return response.data;
};

export const updateSystemStatus = async (
  slug: string,
  status: DeploymentStatus
): Promise<void> => {
  await axios.put(`${API_URL}/systems/${slug}`, { status });
};

export const archiveSystem = async (slug: string): Promise<void> => {
  await axios.delete(`${API_URL}/systems/${slug}`);
};

// =============================================================================
// Operator Actions API
// =============================================================================

export type OperatorType = 'system_monitor' | 'remediation' | 'optimization';

export interface OperatorAction {
  id: string;
  deploymentId: string;
  systemSlug: string | null;
  operatorType: OperatorType;
  actionType: string;
  description: string;
  beforeState: unknown;
  afterState: unknown;
  autoApplied: boolean;
  approved: boolean | null;
  createdAt: string;
}

export interface OperatorActionsResponse {
  actions: OperatorAction[];
  total: number;
  limit: number;
  offset: number;
}

export const fetchOperatorActions = async (params?: {
  operatorType?: OperatorType;
  approved?: string;
  systemSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<OperatorActionsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.operatorType) queryParams.set('operator_type', params.operatorType);
  if (params?.approved) queryParams.set('approved', params.approved);
  if (params?.systemSlug) queryParams.set('system_slug', params.systemSlug);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());

  const qs = queryParams.toString();
  const response = await axios.get<OperatorActionsResponse>(
    `${API_URL}/operators/actions${qs ? `?${qs}` : ''}`
  );
  return response.data;
};

export const fetchPendingActions = async (
  systemSlug?: string
): Promise<{ actions: OperatorAction[] }> => {
  const qs = systemSlug ? `?system_slug=${encodeURIComponent(systemSlug)}` : '';
  const response = await axios.get<{ actions: OperatorAction[] }>(
    `${API_URL}/operators/actions/pending${qs}`
  );
  return response.data;
};

export const approveAction = async (id: string): Promise<void> => {
  await axios.post(`${API_URL}/operators/actions/${id}/approve`);
};

export const rejectAction = async (id: string): Promise<void> => {
  await axios.post(`${API_URL}/operators/actions/${id}/reject`);
};