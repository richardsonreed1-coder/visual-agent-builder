// =============================================================================
// LogStream Component
// Connects to the WebSocket log stream for a deployed system and displays
// streaming output in a scrollable, terminal-style panel.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Pause, Play, Trash2, Wifi, WifiOff } from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  level: 'stdout' | 'stderr' | 'info';
}

interface LogStreamProps {
  slug: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_LOG_LINES = 500;
const WS_BASE = `ws://localhost:3001`;
const RECONNECT_DELAY_MS = 3_000;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function LogStream({ slug }: LogStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Stable log appender that trims to MAX_LOG_LINES
  const appendLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
    });
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to pause auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(atBottom);
  }, []);

  // WebSocket lifecycle
  useEffect(() => {
    mountedRef.current = true;

    function connect(): void {
      if (!mountedRef.current) return;

      const ws = new WebSocket(`${WS_BASE}/api/systems/${slug}/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string);
        } catch {
          return;
        }

        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (data.type === 'connected') {
          appendLog({
            id,
            timestamp: new Date().toISOString(),
            text: `Connected to log stream for ${data.slug}`,
            level: 'info',
          });
          return;
        }

        if (data.type === 'error') {
          appendLog({
            id,
            timestamp: new Date().toISOString(),
            text: `Stream error: ${data.message}`,
            level: 'stderr',
          });
          return;
        }

        // Log output from Redis pub/sub (matches openclaw-client publishLogEvent)
        const timestamp = (data.timestamp as string) ?? new Date().toISOString();
        const event_type = data.event as string | undefined;

        if (event_type === 'log') {
          appendLog({
            id,
            timestamp,
            text: data.output as string,
            level: (data.stream as 'stdout' | 'stderr') ?? 'stdout',
          });
        } else if (event_type === 'execution:started') {
          appendLog({
            id,
            timestamp,
            text: `Execution started (${data.executionId}) triggered by ${data.triggeredBy}`,
            level: 'info',
          });
        } else if (event_type === 'execution:completed') {
          appendLog({
            id,
            timestamp,
            text: `Execution completed (${data.executionId}) — ${data.durationSeconds}s, $${data.costUsd}`,
            level: 'info',
          });
        } else if (event_type === 'execution:failed') {
          appendLog({
            id,
            timestamp,
            text: `Execution failed (${data.executionId}): ${data.error}`,
            level: 'stderr',
          });
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // Auto-reconnect
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        // onclose fires after onerror — reconnect handled there
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [slug, appendLog]);

  const handleClear = useCallback(() => {
    setLogs([]);
  }, []);

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const lineColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'stderr':
        return 'text-red-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <Terminal size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Live Logs</span>
          {connected ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <Wifi size={11} />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <WifiOff size={11} />
              Disconnected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded transition-colors ${
              autoScroll
                ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60'
            }`}
            title={autoScroll ? 'Auto-scroll on — click to pause' : 'Auto-scroll paused — click to resume'}
          >
            {autoScroll ? <Play size={10} /> : <Pause size={10} />}
            {autoScroll ? 'Following' : 'Paused'}
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 size={12} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto p-3 font-mono text-xs leading-5 h-64"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Terminal size={20} className="mb-2 opacity-50" />
            <p className="text-[11px]">Waiting for log output...</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Logs will appear here when the system executes.
            </p>
          </div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className={`flex gap-2 py-px hover:bg-slate-800/30 px-1 -mx-1 rounded ${lineColor(entry.level)}`}
            >
              <span className="text-slate-600 select-none shrink-0">
                [{formatTime(entry.timestamp)}]
              </span>
              <span className="whitespace-pre-wrap break-all">{entry.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800/50 border-t border-slate-700/50">
        <span className="text-[10px] text-slate-600">
          {logs.length} line{logs.length !== 1 ? 's' : ''}
        </span>
        {!autoScroll && logs.length > 0 && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }}
            className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Jump to bottom
          </button>
        )}
      </div>
    </div>
  );
}
