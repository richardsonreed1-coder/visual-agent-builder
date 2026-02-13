import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const FailoverEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="failover" />;
};
