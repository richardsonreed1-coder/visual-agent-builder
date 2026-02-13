import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const ControlEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="control" />;
};
