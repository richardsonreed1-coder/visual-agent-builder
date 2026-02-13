// =============================================================================
// Headless Session Hook
// Integrates socket events with Zustand store for canvas manipulation
// =============================================================================

import { useCallback, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { useSocket, UseSocketReturn } from './useSocket';
import useStore from '../store/useStore';
import { getEdgeParams } from '../config/edgeConfig';
import {
  CanvasNodePayload,
  CanvasNodeUpdatePayload,
  CanvasEdgePayload,
  SessionMessage,
  SessionState,
} from '../../shared/socket-events';

// =============================================================================
// Phase 5.1: Visual Tuning & Bug Fixes
// =============================================================================

// Smart sizing based on container type - increased for grid layout
// Phase 6.2: Reduced DEPARTMENT height from 1200 to 900 to prevent overlap
const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  DEPARTMENT: { width: 2200, height: 900 },  // Fit 3-4 pools side by side (reduced from 1200)
  AGENT_POOL: { width: 850, height: 700 },   // Fit 3x2 grid of agents
  DEFAULT: { width: 400, height: 300 },      // Fallback for other containers
};

// Phase 7: Minimal client-side fallback defaults. The server (canvas_create_node)
// now generates comprehensive configs with enrichNodeConfig(), so these are only
// used as a safety net if the server sends sparse data.
const AGENT_DEFAULTS = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  role: 'specialist',
};

// Phase 6.3: Edge styles now imported from centralized config
// See src/config/edgeConfig.ts for EDGE_TYPES and getEdgeParams()

// Map NodeType to React Flow component type
const nodeTypeToComponent: Record<string, string> = {
  AGENT: 'customNode',
  SKILL: 'customNode',
  PLUGIN: 'customNode',
  TOOL: 'customNode',
  PROVIDER: 'customNode',
  HOOK: 'customNode',
  COMMAND: 'customNode',
  REASONING: 'customNode',
  DEPARTMENT: 'departmentNode',
  AGENT_POOL: 'agentPoolNode',
  MCP_SERVER: 'mcpServerNode',
};

// Container types that need special sizing
const CONTAINER_TYPES = ['DEPARTMENT', 'AGENT_POOL'];

export interface UseHeadlessSessionReturn extends UseSocketReturn {
  // Additional session-specific methods can be added here
}

export function useHeadlessSession(): UseHeadlessSessionReturn {
  const {
    nodes,
    edges,
    addNode,
    addEdge,
    setNodes,
    setEdges,
    updateNodeData,
  } = useStore();

  // Handle node created from server
  const handleNodeCreated = useCallback((payload: CanvasNodePayload) => {
    // 1. Normalize type to UPPERCASE_UNDERSCORE format
    const normalizedType = payload.type.toUpperCase().replace(/-/g, '_');

    // 2. Resolve React Flow component type (fallback to 'customNode' prevents crash)
    const componentType = nodeTypeToComponent[normalizedType] || 'customNode';

    // 3. Smart sizing based on type
    const size = DEFAULT_SIZES[normalizedType] || DEFAULT_SIZES.DEFAULT;
    const isContainer = CONTAINER_TYPES.includes(normalizedType);
    const isAgent = normalizedType === 'AGENT';

    // ✅ Phase 5.1 Fix: Robust config extraction - handle nested or flat data
    const incomingConfig = (payload.data?.config || payload.data || {}) as Record<string, unknown>;

    // ✅ Phase 5.1 Fix: Ghost Config Bug - only use incoming values if truthy (not empty string)
    const mergedConfig = isAgent ? {
      ...AGENT_DEFAULTS,
      // Only override if incoming value is NOT empty string
      provider: (incomingConfig.provider as string) || AGENT_DEFAULTS.provider,
      model: (incomingConfig.model as string) || AGENT_DEFAULTS.model,
      role: (incomingConfig.role as string) || AGENT_DEFAULTS.role,
      temperature: (incomingConfig.temperature as number) ?? AGENT_DEFAULTS.temperature,
      // Include any other fields from incoming config
      ...Object.fromEntries(
        Object.entries(incomingConfig).filter(([k]) =>
          !['provider', 'model', 'role', 'temperature'].includes(k)
        )
      ),
    } : incomingConfig;

    const newNode: Node = {
      id: payload.nodeId,
      type: componentType,
      position: payload.position,
      parentId: payload.parentId,
      extent: payload.parentId ? 'parent' : undefined,
      expandParent: payload.parentId ? true : undefined,

      // ✅ Phase 7 Fix: Z-index control
      // Containers at 0 (not -1 which pushed them behind the React Flow edge SVG layer)
      // Agents at 10 to sit above containers. Edges naturally render between 0 and 10.
      zIndex: isContainer ? 0 : 10,

      data: {
        // ✅ CRITICAL: Spread payload.data FIRST so our fixes override it
        ...payload.data,

        label: payload.label,
        // ✅ FIX: Explicitly set 'type' key expected by PropertiesPanel
        type: normalizedType,
        // ✅ Phase 5.1 Fix: Use hardened merge that ignores empty strings
        config: mergedConfig,
      },

      // ✅ Phase 5 Fix: Smart container sizing (1800px for Departments, 500x800 for Pools)
      // ✅ Phase 7 Fix: Removed pointerEvents: 'none' from node-level style.
      // GroupNode.tsx handles pointer-events internally (header=auto, body=none).
      // Setting it at node-level was blocking the React Flow edge interaction layer,
      // preventing users from clicking edges that overlap container areas.
      style: isContainer
        ? {
            width: size.width,
            height: size.height,
            ...(payload as any).style,
          }
        : (payload as any).style,
    };

    // ✅ Phase 5 Fix: Use Zustand store's addNode for state management
    addNode(newNode);
    console.log(`[Headless] Node created: ${payload.nodeId} (type: ${normalizedType}, component: ${componentType})`);
  }, [addNode]);

  // Handle node updated from server
  const handleNodeUpdated = useCallback((payload: CanvasNodeUpdatePayload) => {
    const { nodeId, changes } = payload;

    if (changes.position) {
      setNodes(
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, position: changes.position! }
            : node
        )
      );
    }

    if (changes.data || changes.label) {
      const dataUpdate: Record<string, unknown> = {};
      if (changes.data) Object.assign(dataUpdate, changes.data);
      if (changes.label) dataUpdate.label = changes.label;
      updateNodeData(nodeId, dataUpdate);
    }

    console.log(`[Headless] Node updated: ${nodeId}`);
  }, [nodes, setNodes, updateNodeData]);

  // Handle node deleted from server
  const handleNodeDeleted = useCallback((nodeId: string) => {
    setNodes(nodes.filter((node) => node.id !== nodeId));
    // Also remove edges connected to this node
    setEdges(
      edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );
    console.log(`[Headless] Node deleted: ${nodeId}`);
  }, [nodes, edges, setNodes, setEdges]);

  // Handle edge created from server
  // Phase 6.3 v4: Uses addEdge() which reads fresh state via get() inside store
  // This eliminates the stale closure bug when Builder creates many edges in rapid succession
  const handleEdgeCreated = useCallback((payload: CanvasEdgePayload) => {
    const edgeType = (payload.edgeType || (payload.data as any)?.type || 'default').toLowerCase();
    const params = getEdgeParams(edgeType);

    const newEdge: Edge = {
      id: payload.edgeId,
      source: payload.sourceId,
      target: payload.targetId,
      ...params,  // Spread all params (type, style, markerEnd, interactionWidth, focusable, animated)
      data: { ...payload.data, type: edgeType },  // Use 'type' not 'edgeType' for consistency
    };

    // Phase 6.3 v4: Use addEdge() — reads fresh edges via get() inside store, no stale closure
    addEdge(newEdge);
    console.log(`[Headless] Edge created: ${payload.edgeId} (type: ${edgeType})`);
  }, [addEdge]);

  // Handle edge deleted from server
  const handleEdgeDeleted = useCallback((edgeId: string) => {
    setEdges(edges.filter((edge) => edge.id !== edgeId));
    console.log(`[Headless] Edge deleted: ${edgeId}`);
  }, [edges, setEdges]);

  // Handle session state changes
  const handleSessionStateChange = useCallback(
    (state: SessionState, previousState?: SessionState) => {
      console.log(`[Headless] Session state: ${previousState} → ${state}`);
    },
    []
  );

  // Handle session messages
  const handleSessionMessage = useCallback((message: SessionMessage) => {
    console.log(`[Headless] ${message.role}: ${message.content}`);
  }, []);

  // Handle execution progress
  const handleExecutionStepStart = useCallback(
    (stepName: string, stepOrder: number, totalSteps: number) => {
      console.log(`[Headless] Step ${stepOrder}/${totalSteps}: ${stepName}`);
    },
    []
  );

  const handleExecutionStepComplete = useCallback(
    (stepName: string, success: boolean, error?: string) => {
      if (success) {
        console.log(`[Headless] Step completed: ${stepName}`);
      } else {
        console.error(`[Headless] Step failed: ${stepName} - ${error}`);
      }
    },
    []
  );

  // Handle errors
  const handleError = useCallback((code: string, message: string) => {
    console.error(`[Headless] Error ${code}: ${message}`);
  }, []);

  // Initialize socket with handlers
  const socketReturn = useSocket({
    onNodeCreated: handleNodeCreated,
    onNodeUpdated: handleNodeUpdated,
    onNodeDeleted: handleNodeDeleted,
    onEdgeCreated: handleEdgeCreated,
    onEdgeDeleted: handleEdgeDeleted,
    onSessionStateChange: handleSessionStateChange,
    onSessionMessage: handleSessionMessage,
    onExecutionStepStart: handleExecutionStepStart,
    onExecutionStepComplete: handleExecutionStepComplete,
    onError: handleError,
  });

  // Sync canvas to server when nodes/edges change (debounced in real implementation)
  useEffect(() => {
    if (socketReturn.isConnected && socketReturn.sessionId) {
      // Only sync if we have an active session
      socketReturn.syncCanvas(nodes, edges);
    }
  }, [nodes, edges, socketReturn.isConnected, socketReturn.sessionId]);

  return socketReturn;
}
