import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const DefaultEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="default" />;
};
