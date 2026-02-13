import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, MCPServerConfig } from '../../../types/core';
import { Server, Key, Gauge, Terminal } from 'lucide-react';

/**
 * MCP Server Node - Configuration node for Model Context Protocol servers
 * Shows command, auth type, rate limits, and environment variables
 */
export const MCPServerNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const config = data.config as MCPServerConfig;

  // Count env vars
  const envVarCount = config?.env ? Object.keys(config.env).length : 0;

  // Get auth type label
  const authLabel = config?.auth?.type ? {
    api_key: 'API Key',
    oauth: 'OAuth',
    basic: 'Basic',
    none: 'None',
  }[config.auth.type] : null;

  return (
    <div
      className={`
        min-w-[220px] rounded-xl border-2 shadow-lg transition-all duration-200
        border-violet-400 bg-gradient-to-br from-violet-50 to-white
        ${selected ? 'ring-2 ring-offset-2 ring-indigo-500 scale-[1.02]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-100">
        <div className="p-2 rounded-lg bg-violet-100/80">
          <Server size={18} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-900 truncate">
            {data.label}
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-500">
            MCP Server
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Command */}
        {config?.command && (
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-gray-400 flex-shrink-0" />
            <code className="text-xs font-mono text-gray-600 truncate flex-1">
              {config.command} {config.args?.slice(0, 2).join(' ')}
              {config.args && config.args.length > 2 ? '...' : ''}
            </code>
          </div>
        )}

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5">
          {/* Auth Badge */}
          {authLabel && authLabel !== 'None' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
              <Key size={10} />
              {authLabel}
            </span>
          )}

          {/* Env Vars Badge */}
          {envVarCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
              {envVarCount} env var{envVarCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Rate Limit Badge */}
          {config?.rateLimit?.requestsPerMinute && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">
              <Gauge size={10} />
              {config.rateLimit.requestsPerMinute}/min
            </span>
          )}

          {/* Timeout Badge */}
          {config?.timeout && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
              {config.timeout}ms
            </span>
          )}
        </div>

        {/* Description */}
        {config?.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-2">
            {config.description}
          </p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white hover:!bg-violet-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white hover:!bg-violet-600 transition-colors"
      />
    </div>
  );
});

MCPServerNode.displayName = 'MCPServerNode';
