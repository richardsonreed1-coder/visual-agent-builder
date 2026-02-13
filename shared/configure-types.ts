// =============================================================================
// Configuration Wizard Types
// Shared between frontend and backend for the AI-powered Configure feature
// =============================================================================

// ---------------------------------------------------------------------------
// Per-Node AI Suggestion
// ---------------------------------------------------------------------------

export interface ConfigSuggestion {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  summary: string;
  overallScore: number; // 1-10
  suggestions: FieldSuggestion[];
  missingRequirements: MissingRequirement[];
  _parseFailed?: boolean; // true when AI response couldn't be parsed
}

export interface FieldSuggestion {
  field: string;
  currentValue: unknown;
  suggestedValue: unknown;
  reason: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  accepted?: boolean; // tracked on frontend
}

export interface MissingRequirement {
  type: 'api_key' | 'env_var' | 'config_field' | 'connection';
  description: string;
  solution: string;
  nodeId?: string;                          // Which node this belongs to
  nodeLabel?: string;                       // Human-readable node name
  category: 'auto_fixable' | 'manual';     // Can an AI agent auto-fix this?
}

// ---------------------------------------------------------------------------
// Workflow-Level Scan (Deterministic, No AI)
// ---------------------------------------------------------------------------

export interface WorkflowAnalysis {
  overallHealth: 'good' | 'needs-attention' | 'critical';
  nodeIssues: NodeIssue[];
  missingRequirements: MissingRequirement[];
  orderOfAnalysis: string[]; // node IDs in recommended order
  configurableNodeCount: number;
  estimatedCost: number; // rough estimate in USD
}

export interface NodeIssue {
  nodeId: string;
  nodeLabel: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  solution: string;
}

// ---------------------------------------------------------------------------
// Wizard State
// ---------------------------------------------------------------------------

export type ConfigureNodeStatus =
  | 'pending'
  | 'analyzing'
  | 'ready'     // suggestion received, awaiting user decision
  | 'accepted'
  | 'skipped'
  | 'error';

export type ConfigurePhase = 'workflow-scan' | 'node-config' | 'summary';

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export interface ConfigureWorkflowRequest {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
}

export interface ConfigureNodeRequest {
  node: {
    id: string;
    type: string;
    label: string;
    config: Record<string, unknown>;
  };
  workflowContext: {
    nodeCount: number;
    edgeCount: number;
    connectedNodes: Array<{ type: string; label: string }>;
    workflowName: string;
  };
}
