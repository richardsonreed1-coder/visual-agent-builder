// =============================================================================
// Centralized Edge Configuration
// Single source of truth for edge types and visual styling
// =============================================================================

import { MarkerType } from 'reactflow';  // Project uses reactflow v11

export interface EdgeTypeConfig {
  label: string;
  stroke: string;
  curveStyle: 'step' | 'smoothstep' | 'default';  // React Flow built-in curve style (renamed from 'type')
  dashed: boolean;
}

export const EDGE_TYPES: Record<string, EdgeTypeConfig> = {
  delegation: { label: 'Delegation (Manager → Worker)', stroke: '#f97316', curveStyle: 'step',       dashed: false },
  data:       { label: 'Data Flow (Stream)',            stroke: '#3b82f6', curveStyle: 'smoothstep', dashed: false },
  control:    { label: 'Control Flow (Sequence)',       stroke: '#10b981', curveStyle: 'smoothstep', dashed: false },
  event:      { label: 'Event (Trigger)',               stroke: '#a855f7', curveStyle: 'default',    dashed: false },
  failover:   { label: 'Failover (Backup)',             stroke: '#ef4444', curveStyle: 'smoothstep', dashed: true },
  default:    { label: 'Default Connection',            stroke: '#b1b1b7', curveStyle: 'default',    dashed: true },
};

/**
 * Get React Flow edge parameters for a given edge type
 * Used for creating new edges and updating existing edges
 */
export function getEdgeParams(edgeType: string = 'default') {
  const config = EDGE_TYPES[edgeType as keyof typeof EDGE_TYPES] || EDGE_TYPES.default;
  return {
    type: edgeType,  // Return semantic edge type key ('data', 'delegation', etc.) to match edgeTypes map in Canvas.tsx
    animated: edgeType === 'delegation',  // ONLY delegation gets animated CSS (prevents forced stroke-dasharray: 5 on all edges)
    style: {
      stroke: config.stroke,
      strokeWidth: 2,
      ...(config.dashed ? { strokeDasharray: '5 5' } : {}),  // Omit entirely for solid (SVG 'none' is invalid)
      cursor: 'pointer',
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: config.stroke },
    interactionWidth: 25,  // Thick invisible hit-area for easier clicking
    focusable: true,
    // Phase 7: Ensure edges render above container nodes (zIndex: 0) but below agents (zIndex: 10)
    zIndex: 5,
  };
}
