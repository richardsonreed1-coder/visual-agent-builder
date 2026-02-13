import { EdgeProps } from 'reactflow';
import { BaseTypedEdge } from './BaseEdge';

export const EventEdge = (props: EdgeProps) => {
  return <BaseTypedEdge {...props} edgeType="event" />;
};
