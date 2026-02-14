import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useStore from '../store/useStore';
import { DEFAULT_LIBRARY_FILTERS } from '../store/useStore';
import { Node, Edge } from 'reactflow';

// =============================================================================
// Zustand Store Tests
// Tests for src/store/useStore.ts actions and state
// =============================================================================

// Helper to reset store state between tests
function resetStore() {
  useStore.setState({
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    libraryCategory: 'agents',
    addToAgentMode: false,
    isConfigModalOpen: false,
    libraryFilters: DEFAULT_LIBRARY_FILTERS,
    libraryViewMode: 'type',
    isLibraryPanelCollapsed: false,
    isPropertiesPanelCollapsed: false,
    configureWizardCache: null,
    isFixerRunning: false,
  });
}

// =============================================================================
// Tests: Node Operations
// =============================================================================

describe('Node Operations', () => {
  beforeEach(resetStore);

  it('should start with empty nodes', () => {
    expect(useStore.getState().nodes).toEqual([]);
  });

  it('addNode should add a node to the list', () => {
    const node: Node = {
      id: 'node-1',
      position: { x: 100, y: 200 },
      data: { label: 'Test Agent', type: 'AGENT' },
      type: 'customNode',
    };

    act(() => {
      useStore.getState().addNode(node);
    });

    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().nodes[0].id).toBe('node-1');
    expect(useStore.getState().nodes[0].data.label).toBe('Test Agent');
  });

  it('addNode should append multiple nodes', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'n1', position: { x: 0, y: 0 }, data: { label: 'A' }, type: 'customNode',
      });
      useStore.getState().addNode({
        id: 'n2', position: { x: 100, y: 0 }, data: { label: 'B' }, type: 'customNode',
      });
    });

    expect(useStore.getState().nodes).toHaveLength(2);
  });

  it('setNodes should replace all nodes', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'old', position: { x: 0, y: 0 }, data: { label: 'Old' }, type: 'customNode',
      });
    });

    const newNodes: Node[] = [
      { id: 'new-1', position: { x: 0, y: 0 }, data: { label: 'New 1' }, type: 'customNode' },
      { id: 'new-2', position: { x: 100, y: 0 }, data: { label: 'New 2' }, type: 'customNode' },
    ];

    act(() => {
      useStore.getState().setNodes(newNodes);
    });

    expect(useStore.getState().nodes).toHaveLength(2);
    expect(useStore.getState().nodes[0].id).toBe('new-1');
  });

  it('updateNodeData should update data on a specific node', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Agent 1', type: 'AGENT' }, type: 'customNode',
      });
    });

    act(() => {
      useStore.getState().updateNodeData('n1', { label: 'Updated Agent', model: 'claude-opus-4-20250514' });
    });

    const node = useStore.getState().nodes[0];
    expect(node.data.label).toBe('Updated Agent');
    expect(node.data.model).toBe('claude-opus-4-20250514');
    expect(node.data.type).toBe('AGENT'); // Existing data preserved
  });

  it('updateNodeData should also update selectedNode if it matches', () => {
    const node: Node = {
      id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Agent 1' }, type: 'customNode',
    };

    act(() => {
      useStore.getState().addNode(node);
      useStore.getState().setSelectedNode(node);
    });

    act(() => {
      useStore.getState().updateNodeData('n1', { label: 'Updated' });
    });

    expect(useStore.getState().selectedNode?.data.label).toBe('Updated');
  });
});

// =============================================================================
// Tests: Edge Operations
// =============================================================================

describe('Edge Operations', () => {
  beforeEach(resetStore);

  it('should start with empty edges', () => {
    expect(useStore.getState().edges).toEqual([]);
  });

  it('addEdge should add an edge', () => {
    const edge: Edge = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      type: 'data',
    };

    act(() => {
      useStore.getState().addEdge(edge);
    });

    expect(useStore.getState().edges).toHaveLength(1);
    expect(useStore.getState().edges[0].id).toBe('e1');
  });

  it('addEdge should handle rapid successive calls (stale closure fix)', () => {
    act(() => {
      useStore.getState().addEdge({ id: 'e1', source: 'n1', target: 'n2' });
      useStore.getState().addEdge({ id: 'e2', source: 'n2', target: 'n3' });
      useStore.getState().addEdge({ id: 'e3', source: 'n3', target: 'n4' });
    });

    expect(useStore.getState().edges).toHaveLength(3);
  });

  it('setEdges should replace all edges', () => {
    act(() => {
      useStore.getState().addEdge({ id: 'old', source: 'a', target: 'b' });
    });

    act(() => {
      useStore.getState().setEdges([
        { id: 'new-1', source: 'x', target: 'y' },
      ]);
    });

    expect(useStore.getState().edges).toHaveLength(1);
    expect(useStore.getState().edges[0].id).toBe('new-1');
  });

  it('updateEdgeType should update edge type and keep selectedEdge in sync', () => {
    const edge: Edge = { id: 'e1', source: 'n1', target: 'n2', type: 'default' };

    act(() => {
      useStore.getState().setEdges([edge]);
      useStore.getState().setSelectedEdge(edge);
    });

    act(() => {
      useStore.getState().updateEdgeType('e1', 'delegation');
    });

    const updated = useStore.getState().edges[0];
    expect(updated.data?.type).toBe('delegation');
    expect(useStore.getState().selectedEdge?.data?.type).toBe('delegation');
  });

  it('setEdgeType should update edge type in data', () => {
    act(() => {
      useStore.getState().setEdges([{ id: 'e1', source: 'n1', target: 'n2' }]);
    });

    act(() => {
      useStore.getState().setEdgeType('e1', 'control');
    });

    expect(useStore.getState().edges[0].data?.edgeType).toBe('control');
  });
});

// =============================================================================
// Tests: Selection
// =============================================================================

describe('Selection', () => {
  beforeEach(resetStore);

  it('setSelectedNode should select a node and deselect edge', () => {
    const edge: Edge = { id: 'e1', source: 'a', target: 'b' };
    const node: Node = { id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'customNode' };

    act(() => {
      useStore.getState().setSelectedEdge(edge);
      useStore.getState().setSelectedNode(node);
    });

    expect(useStore.getState().selectedNode?.id).toBe('n1');
    expect(useStore.getState().selectedEdge).toBeNull();
  });

  it('setSelectedEdge should select an edge and deselect node', () => {
    const node: Node = { id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'customNode' };
    const edge: Edge = { id: 'e1', source: 'a', target: 'b' };

    act(() => {
      useStore.getState().setSelectedNode(node);
      useStore.getState().setSelectedEdge(edge);
    });

    expect(useStore.getState().selectedEdge?.id).toBe('e1');
    expect(useStore.getState().selectedNode).toBeNull();
  });

  it('should allow deselecting by passing null', () => {
    act(() => {
      useStore.getState().setSelectedNode({ id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'customNode' });
      useStore.getState().setSelectedNode(null);
    });

    expect(useStore.getState().selectedNode).toBeNull();
  });
});

// =============================================================================
// Tests: Library Panel State
// =============================================================================

describe('Library Panel State', () => {
  beforeEach(resetStore);

  it('setLibraryCategory should update category', () => {
    act(() => {
      useStore.getState().setLibraryCategory('skills');
    });

    expect(useStore.getState().libraryCategory).toBe('skills');
    expect(useStore.getState().addToAgentMode).toBe(false);
  });

  it('setLibraryCategory should support addToAgentMode', () => {
    act(() => {
      useStore.getState().setLibraryCategory('skills', true);
    });

    expect(useStore.getState().libraryCategory).toBe('skills');
    expect(useStore.getState().addToAgentMode).toBe(true);
  });

  it('setLibraryFilters should merge partial filters', () => {
    act(() => {
      useStore.getState().setLibraryFilters({ search: 'test', types: ['AGENT'] });
    });

    const filters = useStore.getState().libraryFilters;
    expect(filters.search).toBe('test');
    expect(filters.types).toEqual(['AGENT']);
    expect(filters.repos).toEqual([]); // Default preserved
  });

  it('resetLibraryFilters should restore defaults', () => {
    act(() => {
      useStore.getState().setLibraryFilters({ search: 'test', types: ['AGENT'] });
      useStore.getState().resetLibraryFilters();
    });

    expect(useStore.getState().libraryFilters).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it('setLibraryViewMode should update mode and reset type/bucket filters', () => {
    act(() => {
      useStore.getState().setLibraryFilters({ search: 'test', types: ['AGENT'], buckets: ['dev'] });
    });

    act(() => {
      useStore.getState().setLibraryViewMode('bucket');
    });

    expect(useStore.getState().libraryViewMode).toBe('bucket');
    expect(useStore.getState().libraryFilters.types).toEqual([]);
    expect(useStore.getState().libraryFilters.buckets).toEqual([]);
    expect(useStore.getState().libraryFilters.search).toBe('test'); // Preserved
  });
});

// =============================================================================
// Tests: Panel Collapse
// =============================================================================

describe('Panel Collapse', () => {
  beforeEach(resetStore);

  it('toggleLibraryPanel should toggle collapsed state', () => {
    expect(useStore.getState().isLibraryPanelCollapsed).toBe(false);

    act(() => {
      useStore.getState().toggleLibraryPanel();
    });
    expect(useStore.getState().isLibraryPanelCollapsed).toBe(true);

    act(() => {
      useStore.getState().toggleLibraryPanel();
    });
    expect(useStore.getState().isLibraryPanelCollapsed).toBe(false);
  });

  it('togglePropertiesPanel should toggle collapsed state', () => {
    expect(useStore.getState().isPropertiesPanelCollapsed).toBe(false);

    act(() => {
      useStore.getState().togglePropertiesPanel();
    });
    expect(useStore.getState().isPropertiesPanelCollapsed).toBe(true);
  });

  it('setLibraryPanelCollapsed should set state directly', () => {
    act(() => {
      useStore.getState().setLibraryPanelCollapsed(true);
    });
    expect(useStore.getState().isLibraryPanelCollapsed).toBe(true);
  });
});

// =============================================================================
// Tests: Hierarchy Helpers
// =============================================================================

describe('Hierarchy Helpers', () => {
  beforeEach(resetStore);

  it('addChildNode should add a node with parent hierarchy fields', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'dept-1',
        position: { x: 0, y: 0 },
        data: { label: 'Engineering', type: 'DEPARTMENT' },
        type: 'departmentNode',
      });
    });

    act(() => {
      useStore.getState().addChildNode('dept-1', {
        id: 'agent-1',
        position: { x: 20, y: 50 },
        data: { label: 'Agent 1', type: 'AGENT' },
        type: 'customNode',
      });
    });

    const children = useStore.getState().nodes.filter((n) => n.parentId === 'dept-1');
    expect(children).toHaveLength(1);
    expect(children[0].parentId).toBe('dept-1');
    expect((children[0] as any).extent).toBe('parent');
    expect((children[0] as any).expandParent).toBe(true);
  });

  it('getChildNodes should return children of a parent', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'parent',
        position: { x: 0, y: 0 },
        data: { label: 'Parent' },
        type: 'departmentNode',
      });
      useStore.getState().addChildNode('parent', {
        id: 'child-1', position: { x: 0, y: 0 }, data: { label: 'C1' }, type: 'customNode',
      });
      useStore.getState().addChildNode('parent', {
        id: 'child-2', position: { x: 0, y: 0 }, data: { label: 'C2' }, type: 'customNode',
      });
      useStore.getState().addNode({
        id: 'orphan', position: { x: 0, y: 0 }, data: { label: 'Orphan' }, type: 'customNode',
      });
    });

    const children = useStore.getState().getChildNodes('parent');
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toContain('child-1');
    expect(children.map((c) => c.id)).toContain('child-2');
  });

  it('moveNodeToParent should reparent a node', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'dept', position: { x: 0, y: 0 }, data: {}, type: 'departmentNode',
      });
      useStore.getState().addNode({
        id: 'agent', position: { x: 0, y: 0 }, data: {}, type: 'customNode',
      });
    });

    act(() => {
      useStore.getState().moveNodeToParent('agent', 'dept');
    });

    const agent = useStore.getState().nodes.find((n) => n.id === 'agent')!;
    expect(agent.parentId).toBe('dept');
  });

  it('moveNodeToParent(null) should remove from parent', () => {
    act(() => {
      useStore.getState().addNode({
        id: 'dept', position: { x: 0, y: 0 }, data: {}, type: 'departmentNode',
      });
      useStore.getState().addChildNode('dept', {
        id: 'agent', position: { x: 0, y: 0 }, data: {}, type: 'customNode',
      });
    });

    act(() => {
      useStore.getState().moveNodeToParent('agent', null);
    });

    const agent = useStore.getState().nodes.find((n) => n.id === 'agent')!;
    expect(agent.parentId).toBeUndefined();
  });
});

// =============================================================================
// Tests: Workflow Config
// =============================================================================

describe('Workflow Config', () => {
  beforeEach(resetStore);

  it('setWorkflowConfig should merge partial config', () => {
    act(() => {
      useStore.getState().setWorkflowConfig({ name: 'My Workflow', description: 'A test' });
    });

    const config = useStore.getState().workflowConfig;
    expect(config.name).toBe('My Workflow');
    expect(config.description).toBe('A test');
    expect(config.framework).toBe('vab-native'); // Default preserved
  });

  it('setConfigModalOpen should update modal state', () => {
    act(() => {
      useStore.getState().setConfigModalOpen(true);
    });
    expect(useStore.getState().isConfigModalOpen).toBe(true);

    act(() => {
      useStore.getState().setConfigModalOpen(false);
    });
    expect(useStore.getState().isConfigModalOpen).toBe(false);
  });
});

// =============================================================================
// Tests: Configure Wizard & Fixer
// =============================================================================

describe('Configure Wizard & Fixer', () => {
  beforeEach(resetStore);

  it('setConfigureWizardCache should store cache', () => {
    act(() => {
      useStore.getState().setConfigureWizardCache({
        phase: 'workflow-scan',
        workflowAnalysis: null,
        nodeSteps: [],
        currentIndex: 0,
        suggestions: new Map(),
        allMissingRequirements: [],
      });
    });

    expect(useStore.getState().configureWizardCache).not.toBeNull();
    expect(useStore.getState().configureWizardCache!.phase).toBe('workflow-scan');
  });

  it('setFixerRunning should update fixer state', () => {
    act(() => {
      useStore.getState().setFixerRunning(true);
    });
    expect(useStore.getState().isFixerRunning).toBe(true);

    act(() => {
      useStore.getState().setFixerRunning(false);
    });
    expect(useStore.getState().isFixerRunning).toBe(false);
  });
});
