import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const DataEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="data" />;
};
