import { describe, it, expect, beforeEach } from 'vitest';
import { Node, Edge } from 'reactflow';
import { exportFullCanvas, exportSelection } from '../features/export-import/export';
import { importWorkflow, validateWorkflowFile } from '../features/export-import/import';
import {
  sanitizeNodeForExport,
  sanitizeEdgeForExport,
  buildIdRemapTable,
  remapNodeIds,
  remapEdgeIds,
  calculateBoundingBox,
  offsetNodesToPosition,
  getDescendantNodeIds,
  filterEdgesForNodes,
  resetIdCounter,
  generateUniqueId,
} from '../features/export-import/utils';
import { DEFAULT_WORKFLOW_CONFIG } from '../types/config';
import { ExportVisualNode } from '../features/export-import/types';

// =============================================================================
// Export-Import Round-Trip Tests
// =============================================================================

// Test data
function createTestNodes(): Node[] {
  return [
    {
      id: 'agent-1',
      type: 'customNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Supervisor',
        type: 'AGENT',
        config: { model: 'claude-opus-4-20250514', role: 'orchestrator' },
        status: 'running', // Transient - should be stripped
        logs: ['log1'],    // Transient - should be stripped
      },
    },
    {
      id: 'agent-2',
      type: 'customNode',
      position: { x: 300, y: 200 },
      data: {
        label: 'Worker',
        type: 'AGENT',
        config: { model: 'claude-sonnet-4-20250514', role: 'executor' },
      },
    },
    {
      id: 'skill-1',
      type: 'customNode',
      position: { x: 500, y: 200 },
      data: {
        label: 'Code Review',
        type: 'SKILL',
        config: { triggers: ['review'] },
      },
    },
  ];
}

function createTestEdges(): Edge[] {
  return [
    {
      id: 'e1',
      source: 'agent-1',
      target: 'agent-2',
      type: 'delegation',
      data: { type: 'delegation' },
      style: { stroke: '#f97316', strokeWidth: 2 },
    },
    {
      id: 'e2',
      source: 'agent-2',
      target: 'skill-1',
      type: 'data',
      data: { type: 'data' },
    },
  ];
}

// =============================================================================
// Tests: Node Sanitization
// =============================================================================

describe('Node Sanitization', () => {
  it('should strip transient data (status, logs)', () => {
    const node: Node = {
      id: 'n1',
      type: 'customNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'Test',
        type: 'AGENT',
        status: 'running',
        logs: ['error: something'],
        config: { model: 'claude' },
      },
    };

    const sanitized = sanitizeNodeForExport(node);
    expect(sanitized.data).not.toHaveProperty('status');
    expect(sanitized.data).not.toHaveProperty('logs');
    expect(sanitized.data.label).toBe('Test');
    expect((sanitized.data as any).config.model).toBe('claude');
  });

  it('should preserve hierarchy fields', () => {
    const node: Node = {
      id: 'child',
      type: 'customNode',
      position: { x: 20, y: 50 },
      data: { label: 'Child', type: 'AGENT' },
      parentId: 'parent-1',
    };
    (node as any).extent = 'parent';
    (node as any).expandParent = true;

    const sanitized = sanitizeNodeForExport(node);
    expect(sanitized.parentId).toBe('parent-1');
    expect(sanitized.extent).toBe('parent');
    expect(sanitized.expandParent).toBe(true);
  });

  it('should preserve container sizing', () => {
    const node: Node = {
      id: 'dept',
      type: 'departmentNode',
      position: { x: 0, y: 0 },
      data: { label: 'Department', type: 'DEPARTMENT' },
      style: { width: 400, height: 300 },
    };

    const sanitized = sanitizeNodeForExport(node);
    expect(sanitized.style?.width).toBe(400);
    expect(sanitized.style?.height).toBe(300);
  });
});

// =============================================================================
// Tests: Edge Sanitization
// =============================================================================

describe('Edge Sanitization', () => {
  it('should preserve essential edge fields', () => {
    const edge: Edge = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      type: 'delegation',
      data: { type: 'delegation' },
      style: { stroke: '#f97316', strokeWidth: 2 },
    };

    const sanitized = sanitizeEdgeForExport(edge);
    expect(sanitized.id).toBe('e1');
    expect(sanitized.source).toBe('n1');
    expect(sanitized.target).toBe('n2');
    expect(sanitized.type).toBe('delegation');
    expect(sanitized.style?.stroke).toBe('#f97316');
  });

  it('should handle edges with no style', () => {
    const edge: Edge = { id: 'e1', source: 'a', target: 'b' };
    const sanitized = sanitizeEdgeForExport(edge);
    expect(sanitized.style).toBeUndefined();
  });
});

// =============================================================================
// Tests: ID Remapping
// =============================================================================

describe('ID Remapping', () => {
  beforeEach(() => resetIdCounter());

  it('buildIdRemapTable should create unique IDs for all nodes', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A', type: 'AGENT' } },
      { id: 'b', position: { x: 0, y: 0 }, data: { label: 'B', type: 'AGENT' } },
    ];

    const remap = buildIdRemapTable(nodes);
    expect(remap.size).toBe(2);
    expect(remap.get('a')).toBeDefined();
    expect(remap.get('b')).toBeDefined();
    expect(remap.get('a')).not.toBe(remap.get('b'));
  });

  it('remapNodeIds should update node and parent IDs', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'parent', position: { x: 0, y: 0 }, data: { label: 'P', type: 'DEPARTMENT' } },
      { id: 'child', parentId: 'parent', position: { x: 0, y: 0 }, data: { label: 'C', type: 'AGENT' } },
    ];

    const remap = new Map([['parent', 'new-parent'], ['child', 'new-child']]);
    const remapped = remapNodeIds(nodes, remap);

    expect(remapped[0].id).toBe('new-parent');
    expect(remapped[1].id).toBe('new-child');
    expect(remapped[1].parentId).toBe('new-parent');
  });

  it('remapEdgeIds should update source and target IDs', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
    ];

    const remap = new Map([['a', 'new-a'], ['b', 'new-b']]);
    const remapped = remapEdgeIds(edges, remap);

    expect(remapped[0].source).toBe('new-a');
    expect(remapped[0].target).toBe('new-b');
    expect(remapped[0].id).not.toBe('e1'); // Gets new ID
  });
});

// =============================================================================
// Tests: Bounding Box
// =============================================================================

describe('Bounding Box', () => {
  it('should calculate correct bounding box', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'a', position: { x: 100, y: 50 }, data: { label: 'A', type: 'AGENT' } },
      { id: 'b', position: { x: 400, y: 300 }, data: { label: 'B', type: 'AGENT' } },
    ];

    const bbox = calculateBoundingBox(nodes);
    expect(bbox.minX).toBe(100);
    expect(bbox.minY).toBe(50);
    // maxX = 400 + 200 (default width) = 600
    expect(bbox.maxX).toBe(600);
    // maxY = 300 + 80 (default height) = 380
    expect(bbox.maxY).toBe(380);
  });

  it('should handle empty nodes', () => {
    const bbox = calculateBoundingBox([]);
    expect(bbox.width).toBe(0);
    expect(bbox.height).toBe(0);
  });

  it('should skip child nodes for bounding box', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'parent', position: { x: 0, y: 0 }, data: { label: 'P', type: 'DEPARTMENT' }, style: { width: 400, height: 300 } },
      { id: 'child', parentId: 'parent', position: { x: 1000, y: 1000 }, data: { label: 'C', type: 'AGENT' } },
    ];

    const bbox = calculateBoundingBox(nodes);
    // Child at (1000, 1000) should be ignored
    expect(bbox.maxX).toBe(400); // parent width
    expect(bbox.maxY).toBe(300);
  });
});

// =============================================================================
// Tests: Offset Positioning
// =============================================================================

describe('Offset Positioning', () => {
  it('should center nodes at target position', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: { label: 'A', type: 'AGENT' } },
      { id: 'b', position: { x: 200, y: 0 }, data: { label: 'B', type: 'AGENT' } },
    ];

    // Bounding box center: ((0 + 200+200)/2, (0 + 0+80)/2) = (200, 40)
    const offset = offsetNodesToPosition(nodes, 500, 400);

    // Offset = 500 - 200 = 300 for x, 400 - 40 = 360 for y
    expect(offset[0].position.x).toBe(300);
    expect(offset[0].position.y).toBe(360);
    expect(offset[1].position.x).toBe(500);
    expect(offset[1].position.y).toBe(360);
  });

  it('should not offset child nodes', () => {
    const nodes: ExportVisualNode[] = [
      { id: 'parent', position: { x: 0, y: 0 }, data: { label: 'P', type: 'DEPARTMENT' }, style: { width: 200, height: 200 } },
      { id: 'child', parentId: 'parent', position: { x: 20, y: 30 }, data: { label: 'C', type: 'AGENT' } },
    ];

    const offset = offsetNodesToPosition(nodes, 1000, 1000);

    // Child position should be unchanged
    expect(offset[1].position.x).toBe(20);
    expect(offset[1].position.y).toBe(30);
  });
});

// =============================================================================
// Tests: Selection Helpers
// =============================================================================

describe('Selection Helpers', () => {
  it('getDescendantNodeIds should find all descendants', () => {
    const nodes: Node[] = [
      { id: 'dept', position: { x: 0, y: 0 }, data: {}, type: 'departmentNode' },
      { id: 'pool', parentId: 'dept', position: { x: 0, y: 0 }, data: {}, type: 'agentPoolNode' },
      { id: 'agent', parentId: 'pool', position: { x: 0, y: 0 }, data: {}, type: 'customNode' },
      { id: 'orphan', position: { x: 0, y: 0 }, data: {}, type: 'customNode' },
    ];

    const descendants = getDescendantNodeIds(nodes, new Set(['dept']));
    expect(descendants.has('dept')).toBe(true);
    expect(descendants.has('pool')).toBe(true);
    expect(descendants.has('agent')).toBe(true);
    expect(descendants.has('orphan')).toBe(false);
  });

  it('filterEdgesForNodes should keep only edges between included nodes', () => {
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'a', target: 'c' },
    ];

    const filtered = filterEdgesForNodes(edges, new Set(['a', 'b']));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('e1');
  });
});

// =============================================================================
// Tests: Full Export
// =============================================================================

describe('Full Canvas Export', () => {
  it('should produce a valid WorkflowFile', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const result = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);

    expect(result.header.formatVersion).toBe('1.0.0');
    expect(result.header.exportedFrom).toBe('visual-agent-builder');
    expect(result.header.nodeCount).toBe(3);
    expect(result.header.edgeCount).toBe(2);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.workflowConfig.name).toBe(DEFAULT_WORKFLOW_CONFIG.name);
  });

  it('should strip transient data from nodes', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const result = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);

    // status and logs should be stripped
    const supervisorNode = result.nodes.find((n) => n.data.label === 'Supervisor');
    expect(supervisorNode).toBeDefined();
    expect((supervisorNode!.data as any).status).toBeUndefined();
    expect((supervisorNode!.data as any).logs).toBeUndefined();
    // config should be preserved
    expect((supervisorNode!.data as any).config?.model).toBe('claude-opus-4-20250514');
  });
});

// =============================================================================
// Tests: Partial Export
// =============================================================================

describe('Partial Export', () => {
  it('should export only selected nodes and connecting edges', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const result = await exportSelection(nodes, edges, ['agent-1', 'agent-2']);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1); // Only e1 connects agent-1 → agent-2
    expect(result.header.nodeCount).toBe(2);
  });
});

// =============================================================================
// Tests: Round-Trip Export → Import
// =============================================================================

describe('Round-Trip Export → Import', () => {
  beforeEach(() => resetIdCounter());

  it('should round-trip full canvas export → import', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    // Export
    const exported = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);
    const json = JSON.stringify(exported);

    // Import with replace canvas
    const { result, imported } = await importWorkflow(json, {
      conflictStrategy: 'overwrite',
      replaceCanvas: true,
    });

    expect(result.success).toBe(true);
    expect(imported).toBeDefined();
    expect(imported!.nodes).toHaveLength(3);
    expect(imported!.edges).toHaveLength(2);
    expect(imported!.isPartial).toBe(false);
    expect(imported!.workflowConfig).toBeDefined();
  });

  it('should preserve node data through round-trip', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const exported = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);
    const json = JSON.stringify(exported);

    const { imported } = await importWorkflow(json, {
      conflictStrategy: 'overwrite',
      replaceCanvas: true,
    });

    const supervisor = imported!.nodes.find((n) => n.data.label === 'Supervisor');
    expect(supervisor).toBeDefined();
    expect(supervisor!.data.config?.model).toBe('claude-opus-4-20250514');
    expect(supervisor!.data.config?.role).toBe('orchestrator');
    // Transient defaults should be restored
    expect(supervisor!.data.status).toBe('idle');
    expect(supervisor!.data.logs).toEqual([]);
  });

  it('should round-trip partial export → import', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    // Export selection
    const exported = await exportSelection(nodes, edges, ['agent-1', 'agent-2']);
    const json = JSON.stringify(exported);

    // Import
    const { result, imported } = await importWorkflow(json, {
      conflictStrategy: 'regenerate',
      replaceCanvas: false,
    });

    expect(result.success).toBe(true);
    expect(imported!.isPartial).toBe(true);
    expect(imported!.nodes).toHaveLength(2);
    expect(imported!.workflowConfig).toBeUndefined(); // Partial has no config
  });

  it('should regenerate IDs on conflict', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const exported = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);
    const json = JSON.stringify(exported);

    // Import into existing canvas with same node IDs
    const existingNodes: Node[] = [
      { id: 'agent-1', position: { x: 0, y: 0 }, data: { label: 'Existing' }, type: 'customNode' },
    ];

    const { result, imported } = await importWorkflow(json, {
      conflictStrategy: 'regenerate',
      replaceCanvas: false,
    }, existingNodes);

    expect(result.success).toBe(true);
    // IDs should be remapped
    const importedIds = imported!.nodes.map((n) => n.id);
    expect(importedIds).not.toContain('agent-1'); // Original ID should be remapped
    expect(imported!.nodes).toHaveLength(3);
  });

  it('should skip conflicting nodes', async () => {
    const nodes = createTestNodes();
    const edges = createTestEdges();

    const exported = await exportFullCanvas(nodes, edges, DEFAULT_WORKFLOW_CONFIG);
    const json = JSON.stringify(exported);

    const existingNodes: Node[] = [
      { id: 'agent-1', position: { x: 0, y: 0 }, data: { label: 'Existing' }, type: 'customNode' },
    ];

    const { result, imported } = await importWorkflow(json, {
      conflictStrategy: 'skip',
      replaceCanvas: false,
    }, existingNodes);

    expect(result.success).toBe(true);
    // agent-1 should be skipped
    expect(imported!.nodes).toHaveLength(2);
    expect(imported!.nodes.map((n) => n.id)).not.toContain('agent-1');
  });
});

// =============================================================================
// Tests: Validation
// =============================================================================

describe('Validation', () => {
  it('should reject invalid JSON', async () => {
    const { result } = await importWorkflow('not json at all', {
      conflictStrategy: 'overwrite',
      replaceCanvas: true,
    });

    expect(result.success).toBe(false);
    expect(result.success === false && result.errors[0].code).toBe('invalid_json');
  });

  it('should reject JSON with wrong structure', async () => {
    const { result } = await importWorkflow('{"foo": "bar"}', {
      conflictStrategy: 'overwrite',
      replaceCanvas: true,
    });

    expect(result.success).toBe(false);
  });

  it('should accept legacy format', async () => {
    const legacy = {
      id: 'workflow-1',
      name: 'Legacy Workflow',
      nodes: [
        {
          id: 'n1',
          type: 'AGENT',
          position: { x: 0, y: 0 },
          data: { label: 'Agent 1', type: 'AGENT', config: {} },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await validateWorkflowFile(legacy);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Tests: ID Generation
// =============================================================================

describe('ID Generation', () => {
  beforeEach(() => resetIdCounter());

  it('generateUniqueId should produce unique IDs', () => {
    const id1 = generateUniqueId('test');
    const id2 = generateUniqueId('test');
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^test_/);
  });

  it('generateUniqueId should use default prefix', () => {
    const id = generateUniqueId();
    expect(id).toMatch(/^node_/);
  });
});
