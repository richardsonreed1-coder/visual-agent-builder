import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { EdgeType } from '../types/core';
import { WorkflowConfig, DEFAULT_WORKFLOW_CONFIG } from '../types/config';
import { needsMigration, migrateWorkflow } from '../utils/workflowMigration';
import { getEdgeParams } from '../config/edgeConfig';
import type {
  ConfigurePhase,
  ConfigureNodeStatus,
  WorkflowAnalysis,
  ConfigSuggestion,
  MissingRequirement,
} from '../../shared/configure-types';

// Configure wizard cached state
export interface ConfigureNodeStep {
  id: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
  status: ConfigureNodeStatus;
}

export interface ConfigureWizardCache {
  phase: ConfigurePhase;
  workflowAnalysis: WorkflowAnalysis | null;
  nodeSteps: ConfigureNodeStep[];
  currentIndex: number;
  suggestions: Map<string, ConfigSuggestion>;
  allMissingRequirements: MissingRequirement[];
}

// Re-export WorkflowConfig for backwards compatibility
export type { WorkflowConfig } from '../types/config';

// Library filter state
export interface LibraryFilters {
  search: string;
  globalSearch: boolean; // When true, search across all categories
  types: string[];
  repos: string[];
  categories: string[];
  buckets: string[]; // Capability bucket filter (OR logic)
  subcategories: string[]; // Requires bucket filter; AND with bucket, OR within subcategories
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  search: '',
  globalSearch: false,
  types: [],
  repos: [],
  categories: [],
  buckets: [],
  subcategories: [],
};

// View mode for library panel
export type LibraryViewMode = 'type' | 'bucket';

interface StoreState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;  // Phase 6.3: Track selected edge
  libraryCategory: string;
  addToAgentMode: boolean;
  workflowConfig: WorkflowConfig;
  isConfigModalOpen: boolean;
  libraryFilters: LibraryFilters;
  libraryViewMode: LibraryViewMode;
  // Panel collapse state
  isLibraryPanelCollapsed: boolean;
  isPropertiesPanelCollapsed: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  addNode: (node: Node) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;  // Phase 6.3: Select edge action
  updateNodeData: (nodeId: string, newData: any) => void;
  updateEdgeType: (edgeId: string, newType: string) => void;  // Phase 6.3: Update edge type
  setLibraryCategory: (category: string, addToAgentMode?: boolean) => void;
  // Workflow config
  setWorkflowConfig: (config: Partial<WorkflowConfig>) => void;
  setConfigModalOpen: (open: boolean) => void;
  // Library filters
  setLibraryFilters: (filters: Partial<LibraryFilters>) => void;
  resetLibraryFilters: () => void;
  // View mode
  setLibraryViewMode: (mode: LibraryViewMode) => void;
  // Panel collapse
  setLibraryPanelCollapsed: (collapsed: boolean) => void;
  setPropertiesPanelCollapsed: (collapsed: boolean) => void;
  toggleLibraryPanel: () => void;
  togglePropertiesPanel: () => void;
  // Hierarchy helpers
  addChildNode: (parentId: string, node: Node) => void;
  moveNodeToParent: (nodeId: string, parentId: string | null) => void;
  getChildNodes: (parentId: string) => Node[];
  // Edge type helper
  setEdgeType: (edgeId: string, edgeType: EdgeType) => void;
  // Configure wizard cache
  configureWizardCache: ConfigureWizardCache | null;
  setConfigureWizardCache: (cache: ConfigureWizardCache | null) => void;
  // Fixer running state (shared between SummaryView and TerminalPanel)
  isFixerRunning: boolean;
  setFixerRunning: (running: boolean) => void;
}

const useStore = create<StoreState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,  // Phase 6.3: Track selected edge
  libraryCategory: 'agents',
  addToAgentMode: false,
  workflowConfig: DEFAULT_WORKFLOW_CONFIG,
  isConfigModalOpen: false,
  libraryFilters: DEFAULT_LIBRARY_FILTERS,
  libraryViewMode: 'type' as LibraryViewMode,
  isLibraryPanelCollapsed: false,
  isPropertiesPanelCollapsed: false,
  configureWizardCache: null,
  isFixerRunning: false,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  setNodes: (nodes) => {
    // Apply migration for legacy workflows if needed
    const migratedNodes = needsMigration(nodes) ? migrateWorkflow(nodes) : nodes;
    set({ nodes: migratedNodes });
  },
  setEdges: (edges) => set({ edges }),

  // Phase 6.3 v4: Append a single edge using get() for fresh state
  // Eliminates stale closure bug when Builder creates many edges in rapid succession
  addEdge: (edge) => {
    set({ edges: [...get().edges, edge] });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  setSelectedNode: (node) => {
    // Phase 6.3: Deselect edge when selecting a node
    set({ selectedNode: node, selectedEdge: null });
  },

  // Phase 6.3: Select edge (deselects any selected node)
  setSelectedEdge: (edge) => {
    set({ selectedEdge: edge, selectedNode: null });
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // If this is the selected node, update it as well
          const updatedNode = { ...node, data: { ...node.data, ...newData } };
          if (get().selectedNode?.id === nodeId) {
             set({ selectedNode: updatedNode });
          }
          return updatedNode;
        }
        return node;
      }),
    });
  },

  // Phase 6.3: Update edge type with visual params from centralized config
  updateEdgeType: (edgeId, newType) => {
    const params = getEdgeParams(newType);
    const newEdges = get().edges.map((edge) =>
      edge.id === edgeId
        // Update edge with new params and store type in data
        ? { ...edge, ...params, data: { ...edge.data, type: newType } }
        : edge
    );

    // Keep selectedEdge in sync if it's the one being updated
    const selectedEdge = get().selectedEdge;
    const newSelection = selectedEdge?.id === edgeId
      ? newEdges.find((e) => e.id === edgeId) || null
      : selectedEdge;

    set({ edges: newEdges, selectedEdge: newSelection });
  },

  setLibraryCategory: (category, addToAgentMode = false) => {
    set({ libraryCategory: category, addToAgentMode });
  },

  setWorkflowConfig: (config) => {
    set({ workflowConfig: { ...get().workflowConfig, ...config } });
  },

  setConfigModalOpen: (open) => {
    set({ isConfigModalOpen: open });
  },

  setLibraryFilters: (filters) => {
    set({ libraryFilters: { ...get().libraryFilters, ...filters } });
  },

  resetLibraryFilters: () => {
    set({ libraryFilters: DEFAULT_LIBRARY_FILTERS });
  },

  setLibraryViewMode: (mode) => {
    // When switching modes, preserve search text but reset type/bucket/category/subcategory filters
    set({
      libraryViewMode: mode,
      libraryFilters: {
        ...get().libraryFilters,
        types: [],
        buckets: [],
        subcategories: [],
        categories: [],
        // search and globalSearch are preserved
      },
    });
  },

  // Panel collapse actions
  setLibraryPanelCollapsed: (collapsed) => set({ isLibraryPanelCollapsed: collapsed }),
  setPropertiesPanelCollapsed: (collapsed) => set({ isPropertiesPanelCollapsed: collapsed }),
  toggleLibraryPanel: () => set({ isLibraryPanelCollapsed: !get().isLibraryPanelCollapsed }),
  togglePropertiesPanel: () => set({ isPropertiesPanelCollapsed: !get().isPropertiesPanelCollapsed }),

  // Configure wizard cache
  setConfigureWizardCache: (cache) => set({ configureWizardCache: cache }),
  setFixerRunning: (running) => set({ isFixerRunning: running }),

  // Hierarchy helpers for container nodes (Department, Agent Pool)
  addChildNode: (parentId, node) => {
    // Add node as child of parent with proper React Flow hierarchy setup
    const childNode: Node = {
      ...node,
      parentId,
      extent: 'parent', // Constrain to parent bounds
      expandParent: true, // Allow parent to expand when dragged to edge
    };
    set({ nodes: [...get().nodes, childNode] });
  },

  moveNodeToParent: (nodeId, parentId) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          if (parentId === null) {
            // Remove from parent - create new object without parentId/extent
            const { parentId: _, extent: __, expandParent: ___, ...rest } = node;
            return rest as Node;
          }
          // Move to new parent
          return {
            ...node,
            parentId,
            extent: 'parent' as const,
            expandParent: true,
          };
        }
        return node;
      }),
    });
  },

  getChildNodes: (parentId) => {
    return get().nodes.filter((node) => node.parentId === parentId);
  },

  // Edge type helper for typed connections
  setEdgeType: (edgeId, edgeType) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            type: edgeType,
            data: { ...edge.data, edgeType },
          };
        }
        return edge;
      }),
    });
  },
}));

export default useStore;