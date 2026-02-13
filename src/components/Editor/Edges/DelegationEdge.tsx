import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const DelegationEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="delegation" />;
};
