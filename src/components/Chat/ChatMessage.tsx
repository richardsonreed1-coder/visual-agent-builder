// =============================================================================
// Chat Message Component
// Renders individual messages with role-based styling
// =============================================================================

import React from 'react';
import {
  User,
  Eye,
  Compass,
  Hammer,
  Info,
} from 'lucide-react';
import { SessionMessage } from '../../../shared/socket-events';

interface ChatMessageProps {
  message: SessionMessage;
}

const roleConfig: Record<
  SessionMessage['role'],
  {
    label: string;
    color: string;
    bgColor: string;
    Icon: React.ElementType;
    alignment: 'left' | 'right' | 'center';
  }
> = {
  user: {
    label: 'You',
    color: 'text-white',
    bgColor: 'bg-indigo-600',
    Icon: User,
    alignment: 'right',
  },
  supervisor: {
    label: 'Supervisor',
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
    Icon: Eye,
    alignment: 'left',
  },
  architect: {
    label: 'Architect',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    Icon: Compass,
    alignment: 'left',
  },
  builder: {
    label: 'Builder',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    Icon: Hammer,
    alignment: 'left',
  },
  system: {
    label: 'System',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    Icon: Info,
    alignment: 'center',
  },
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const config = roleConfig[message.role];
  const { Icon } = config;

  // Center-aligned system messages
  if (config.alignment === 'center') {
    return (
      <div className="flex justify-center mb-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 ${config.bgColor} rounded-full`}>
          <Icon size={12} className={config.color} />
          <span className={`text-xs ${config.color}`}>{message.content}</span>
        </div>
      </div>
    );
  }

  // Right-aligned user messages
  if (config.alignment === 'right') {
    return (
      <div className="flex justify-end mb-3">
        <div
          className={`max-w-[85%] ${config.bgColor} rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm`}
        >
          <p className={`text-sm ${config.color} whitespace-pre-wrap`}>
            {message.content}
          </p>
          <p className="text-xs text-indigo-200 mt-1 text-right">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Left-aligned agent messages
  return (
    <div className="flex gap-2 mb-3">
      <div
        className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 max-w-[85%]">
        <div
          className={`${config.bgColor} rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm`}
        >
          <p className={`text-xs font-semibold ${config.color} mb-1`}>
            {config.label}
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-1 ml-2">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
