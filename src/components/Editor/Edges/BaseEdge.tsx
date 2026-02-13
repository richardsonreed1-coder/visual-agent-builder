import { BaseEdge as RFBaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { EdgeType, EDGE_TYPE_INFO } from '../../../types/core';

export interface TypedEdgeProps extends EdgeProps {
  edgeType: EdgeType;
}

export const BaseTypedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  edgeType,
  label,
  selected,
}: TypedEdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const typeInfo = EDGE_TYPE_INFO[edgeType];

  let strokeDasharray: string | undefined;
  if (typeInfo.strokeStyle === 'dashed') strokeDasharray = '8 4';
  else if (typeInfo.strokeStyle === 'dotted') strokeDasharray = '2 4';

  const edgeStyle = {
    ...style,
    stroke: typeInfo.color,
    strokeWidth: selected ? 3 : 2,
    ...(strokeDasharray ? { strokeDasharray } : {}),
  };

  return (
    <>
      <RFBaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        interactionWidth={25}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: typeInfo.color + '20',
              color: typeInfo.color,
              border: `1px solid ${typeInfo.color}40`,
            }}
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              selected ? 'ring-2 ring-offset-1 ring-indigo-500' : ''
            }`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
