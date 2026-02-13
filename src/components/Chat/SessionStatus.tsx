// =============================================================================
// Session Status Badge
// Displays the current session state with color-coded indicator
// =============================================================================

import React from 'react';
import {
  Circle,
  Router,
  Compass,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SessionState } from '../../../shared/socket-events';

interface SessionStatusProps {
  state: SessionState;
  isConnected: boolean;
}

const stateConfig: Record<
  SessionState,
  { label: string; color: string; bgColor: string; Icon: React.ElementType }
> = {
  idle: {
    label: 'Ready',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    Icon: Circle,
  },
  routing: {
    label: 'Analyzing...',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    Icon: Router,
  },
  planning: {
    label: 'Planning...',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    Icon: Compass,
  },
  executing: {
    label: 'Executing',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    Icon: Play,
  },
  paused: {
    label: 'Paused',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    Icon: Pause,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    Icon: CheckCircle,
  },
  error: {
    label: 'Error',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    Icon: AlertCircle,
  },
};

export const SessionStatus: React.FC<SessionStatusProps> = ({
  state,
  isConnected,
}) => {
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
        <Loader2 size={14} className="text-slate-500 animate-spin" />
        <span className="text-xs font-medium text-slate-500">Connecting...</span>
      </div>
    );
  }

  const config = stateConfig[state];
  const { Icon } = config;
  const isAnimated = state === 'routing' || state === 'planning' || state === 'executing';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 ${config.bgColor} rounded-full`}
    >
      <Icon
        size={14}
        className={`${config.color} ${isAnimated ? 'animate-pulse' : ''}`}
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
};

export default SessionStatus;
