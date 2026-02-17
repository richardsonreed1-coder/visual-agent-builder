// =============================================================================
// Terminal Panel Component
// Phase 7+: Displays streaming execution logs with progress, agent outputs,
// and post-execution results panel
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Play,
  Square,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import useStore from '../../store/useStore';
import { AgentOutputBlock } from './AgentOutputBlock';
import { TerminalProgressBar } from './TerminalProgressBar';
import { ExecutionResultsPanel } from './ExecutionResultsPanel';
import { ExecutionPromptModal } from './ExecutionPromptModal';
import type {
  AgentResultPayload,
  ExecutionReportPayload,
} from '../../../shared/socket-events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  id: string;
  timestamp: number;
  output: string;
  stream: 'stdout' | 'stderr';
  type: 'text' | 'phase-start' | 'agent-result';
  phaseInfo?: { index: number; total: number; name: string };
  agentResult?: AgentResultPayload;
}

type TerminalTab = 'workflow' | 'fixer';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TerminalPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [executionReport, setExecutionReport] = useState<ExecutionReportPayload | null>(null);

  // Phase progress state
  const [currentPhase, setCurrentPhase] = useState(0);
  const [totalPhases, setTotalPhases] = useState(0);
  const [currentPhaseName, setCurrentPhaseName] = useState('');

  // Fixer tab state
  const [activeTab, setActiveTab] = useState<TerminalTab>('workflow');
  const [fixerLogs, setFixerLogs] = useState<LogEntry[]>([]);
  const [fixerCompleted, setFixerCompleted] = useState(false);
  const [patchesApplied, setPatchesApplied] = useState(false);
  const [isApplyingPatches, setIsApplyingPatches] = useState(false);
  const { isFixerRunning, setFixerRunning } = useStore();

  // Resizable height state
  const [contentHeight, setContentHeight] = useState(256); // default h-64 = 256px
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const { nodes, edges } = useStore();

  // Socket connection with all event callbacks
  const { isConnected, sessionId, socket, startSession } = useSocket({
    onExecutionStepStart: (stepName, stepOrder, totalSteps) => {
      setCurrentPhase(stepOrder);
      setTotalPhases(totalSteps);
      setCurrentPhaseName(stepName);

      // Add phase separator to logs
      const entry: LogEntry = {
        id: `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        output: '',
        stream: 'stdout',
        type: 'phase-start',
        phaseInfo: { index: stepOrder, total: totalSteps, name: stepName },
      };
      setLogs((prev) => [...prev, entry]);
    },
    onAgentResult: (payload: AgentResultPayload) => {
      const entry: LogEntry = {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        output: '',
        stream: 'stdout',
        type: 'agent-result',
        agentResult: payload,
      };
      setLogs((prev) => [...prev, entry]);
    },
    onExecutionReport: (payload: ExecutionReportPayload) => {
      setExecutionReport(payload);
      setIsRunning(false);
      setCurrentPhase(0);
      setTotalPhases(0);
      setCurrentPhaseName('');
    },
  });

  // Listen for plain text execution logs
  useEffect(() => {
    if (!socket) return;

    const handleExecutionLog = (payload: {
      output: string;
      stream?: 'stdout' | 'stderr';
      timestamp?: number;
      source?: 'workflow' | 'fixer';
    }) => {
      const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: payload.timestamp || Date.now(),
        output: payload.output,
        stream: payload.stream || 'stdout',
        type: 'text',
      };

      // Route logs based on source tag
      if (payload.source === 'fixer') {
        setFixerLogs((prev) => [...prev, entry]);
        // Auto-switch to fixer tab and expand
        setActiveTab('fixer');
        setIsExpanded(true);

        // Detect fixer completion
        if (
          payload.output.includes('Fixer completed') ||
          payload.output.includes('Fixer failed') ||
          payload.output.includes('Fixer error') ||
          payload.output.includes('Fixer launched')
        ) {
          setFixerRunning(false);
          setFixerCompleted(true);
        }
      } else {
        setLogs((prev) => [...prev, entry]);
        setIsExpanded(true);

        // Detect workflow execution completion or cancellation
        if (
          payload.output.includes('completed successfully') ||
          payload.output.includes('completed with warnings') ||
          payload.output.includes('FAILED') ||
          payload.output.includes('Execution cancelled') ||
          payload.output.includes('Validation failed')
        ) {
          setIsRunning(false);
        }
      }
    };

    const handlePatchesApplied = (payload: {
      sessionId: string;
      results: Array<{ nodeLabel: string; fieldsApplied: string[]; success: boolean; error?: string }>;
      totalApplied: number;
      totalFailed: number;
    }) => {
      setIsApplyingPatches(false);
      setPatchesApplied(true);

      const entry: LogEntry = {
        id: `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        output: `Patches applied: ${payload.totalApplied} succeeded, ${payload.totalFailed} failed`,
        stream: 'stdout',
        type: 'text',
      };
      setFixerLogs((prev) => [...prev, entry]);
    };

    socket.on('execution:log', handleExecutionLog);
    socket.on('fixer:patches-applied', handlePatchesApplied);
    return () => {
      socket.off('execution:log', handleExecutionLog);
      socket.off('fixer:patches-applied', handlePatchesApplied);
    };
  }, [socket]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (isExpanded && !showResults && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded, showResults]);

  // Open prompt modal when Run is clicked
  const handleRun = useCallback(() => {
    if (!isConnected || !socket) {
      console.warn('[Terminal] Cannot run: not connected');
      return;
    }
    setShowPromptModal(true);
  }, [isConnected, socket]);

  // Execute workflow with user-provided brief
  const handleExecuteWithBrief = useCallback(async (brief: string) => {
    setShowPromptModal(false);

    if (!isConnected || !socket) {
      console.warn('[Terminal] Cannot run: not connected');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setIsExpanded(true);
    setShowResults(false);
    setExecutionReport(null);
    setCurrentPhase(0);
    setTotalPhases(0);
    setCurrentPhaseName('');

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        activeSessionId = await startSession();
      } catch (err) {
        console.error('[Terminal] Failed to start session:', err);
        setIsRunning(false);
        return;
      }
    }

    socket.emit('system:start', {
      sessionId: activeSessionId,
      brief,
      nodes: nodes.map((n) => ({
        id: n.id,
        data: n.data,
        type: n.type,
        parentId: n.parentId,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        data: e.data,
      })),
    });
  }, [isConnected, socket, sessionId, startSession, nodes, edges]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (socket && sessionId) {
      socket.emit('system:stop', { sessionId });
    }
  }, [socket, sessionId]);

  const handleClear = useCallback(() => {
    if (activeTab === 'fixer') {
      setFixerLogs([]);
      setFixerCompleted(false);
      setPatchesApplied(false);
    } else {
      setLogs([]);
      setExecutionReport(null);
      setShowResults(false);
    }
  }, [activeTab]);

  const handleApplyPatches = useCallback(async () => {
    if (!socket) return;
    setIsApplyingPatches(true);

    // Auto-create session if needed (fixer was started from a different hook instance)
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        activeSessionId = await startSession();
      } catch (err) {
        console.error('[TerminalPanel] Failed to create session for apply-patches:', err);
        setIsApplyingPatches(false);
        return;
      }
    }

    socket.emit('fixer:apply-patches', { sessionId: activeSessionId });
  }, [socket, sessionId, startSession]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Drag-to-resize handler
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartYRef.current = e.clientY;
      dragStartHeightRef.current = contentHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      const handleDragMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        // Dragging up (negative deltaY) = increase height
        const deltaY = dragStartYRef.current - moveEvent.clientY;
        const newHeight = Math.min(
          Math.max(dragStartHeightRef.current + deltaY, 128),
          600
        );
        setContentHeight(newHeight);
      };

      const handleDragEnd = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [contentHeight]
  );

  // -------------------------------------------------------------------------
  // Collapsed bar at bottom
  // -------------------------------------------------------------------------
  if (!isExpanded) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-slate-300
                     rounded-t-lg hover:bg-slate-800 transition-colors shadow-lg
                     border border-slate-700 border-b-0"
        >
          <Terminal size={16} className="text-emerald-400" />
          <span className="text-sm font-mono">Terminal</span>
          <ChevronUp size={16} />
          {(logs.length > 0 || fixerLogs.length > 0) && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded text-xs font-mono">
              {logs.length + fixerLogs.length}
            </span>
          )}
          {(isRunning || isFixerRunning) && (
            <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Expanded terminal
  // -------------------------------------------------------------------------
  return (
    <div className="fixed bottom-10 left-4 right-4 z-40">
      <div className="bg-slate-900 rounded-t-lg shadow-2xl border border-slate-700 border-b-0 overflow-hidden max-w-5xl mx-auto">
        {/* Resize handle */}
        <div
          onMouseDown={handleDragStart}
          className="h-1.5 cursor-ns-resize bg-slate-800 hover:bg-slate-600
                     transition-colors flex items-center justify-center rounded-t-lg"
          title="Drag to resize"
        >
          <div className="w-8 h-0.5 rounded-full bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Terminal size={16} className="text-emerald-400" />
            {/* Tab switcher */}
            <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('workflow')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'workflow'
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Workflow
                {logs.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-600/50 text-slate-300 rounded text-[10px]">
                    {logs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('fixer')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'fixer'
                    ? 'bg-violet-600/80 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Fixer
                {fixerLogs.length > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                    activeTab === 'fixer' ? 'bg-violet-500/50 text-violet-100' : 'bg-slate-600/50 text-slate-300'
                  }`}>
                    {fixerLogs.length}
                  </span>
                )}
                {isFixerRunning && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
                )}
              </button>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Results button (workflow tab only) */}
            {activeTab === 'workflow' && executionReport && !isRunning && (
              <button
                onClick={() => setShowResults(!showResults)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors font-medium ${
                  showResults
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title="View execution results"
              >
                <BarChart3 size={14} />
                {showResults ? 'View Logs' : 'View Results'}
              </button>
            )}

            {/* Workflow tab: Run/Stop button */}
            {activeTab === 'workflow' && (
              !isRunning ? (
                <button
                  onClick={handleRun}
                  disabled={!isConnected || nodes.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600
                             hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed
                             text-white text-sm rounded transition-colors font-medium"
                  title={
                    nodes.length === 0
                      ? 'Add nodes to canvas first'
                      : 'Execute workflow via Claude API'
                  }
                >
                  <Play size={14} />
                  Execute
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600
                             hover:bg-red-500 text-white text-sm rounded transition-colors font-medium"
                >
                  <Square size={14} />
                  Stop
                </button>
              )
            )}

            {/* Fixer tab: Stop button when running */}
            {activeTab === 'fixer' && isFixerRunning && (
              <button
                onClick={() => {
                  setFixerRunning(false);
                  if (socket && sessionId) {
                    socket.emit('fixer:stop', { sessionId });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600
                           hover:bg-red-500 text-white text-sm rounded transition-colors font-medium"
              >
                <Square size={14} />
                Stop Fixer
              </button>
            )}

            {/* Fixer tab: Apply Patches button when fixer is done */}
            {activeTab === 'fixer' && fixerCompleted && !isFixerRunning && !patchesApplied && (
              <button
                onClick={handleApplyPatches}
                disabled={isApplyingPatches}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600
                           hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed
                           text-white text-sm rounded transition-colors font-medium"
              >
                {isApplyingPatches ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Apply Patches
                  </>
                )}
              </button>
            )}

            {/* Fixer tab: Patches applied indicator */}
            {activeTab === 'fixer' && patchesApplied && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 text-sm font-medium">
                <CheckCircle2 size={14} />
                Patches Applied
              </span>
            )}

            {/* Clear */}
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 size={16} className="text-slate-400 hover:text-slate-200" />
            </button>

            {/* Collapse */}
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Minimize terminal"
            >
              <ChevronDown size={16} className="text-slate-400 hover:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Progress bar — visible while running workflow (not shown for fixer tab) */}
        {activeTab === 'workflow' && (
          <TerminalProgressBar
            currentPhase={currentPhase}
            totalPhases={totalPhases}
            phaseName={currentPhaseName}
            isRunning={isRunning}
          />
        )}

        {/* Content area — either logs, results, or fixer output */}
        {activeTab === 'workflow' && showResults && executionReport ? (
          <ExecutionResultsPanel report={executionReport} height={contentHeight} />
        ) : (
          <div className="overflow-y-auto p-3 font-mono text-sm bg-[#0d1117]" style={{ height: contentHeight }}>
            {activeTab === 'fixer' ? (
              /* --- Fixer tab content --- */
              fixerLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  <Terminal size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No fixer output yet.</p>
                  <p className="text-xs mt-1">
                    Use the &quot;Open Fixer&quot; button in the Configure wizard to launch.
                  </p>
                </div>
              ) : (
                fixerLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-2 py-0.5 hover:bg-slate-800/30 px-1 -mx-1 rounded ${
                      log.stream === 'stderr' ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none shrink-0">
                      [{formatTimestamp(log.timestamp)}]
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {log.output.startsWith('>') || log.output.startsWith('[') ? (
                        <span
                          className={
                            log.output.includes('ERROR') || log.output.includes('WARN')
                              ? log.output.includes('ERROR')
                                ? 'text-red-400'
                                : 'text-yellow-400'
                              : log.output.startsWith('>')
                              ? 'text-violet-400'
                              : 'text-violet-300'
                          }
                        >
                          {log.output}
                        </span>
                      ) : (
                        log.output
                      )}
                    </span>
                  </div>
                ))
              )
            ) : (
              /* --- Workflow tab content --- */
              logs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  <Terminal size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No output yet.</p>
                  <p className="text-xs mt-1">
                    Click &quot;Execute&quot; to run agents via Claude API.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  // Phase separator
                  if (log.type === 'phase-start' && log.phaseInfo) {
                    return (
                      <div
                        key={log.id}
                        className="my-2 flex items-center gap-2 px-2 py-1.5 bg-blue-900/30 border border-blue-800/40 rounded"
                      >
                        <span className="text-blue-400 text-xs font-bold">
                          PHASE {log.phaseInfo.index}/{log.phaseInfo.total}
                        </span>
                        <span className="text-blue-300 text-xs font-medium">
                          {log.phaseInfo.name}
                        </span>
                      </div>
                    );
                  }

                  // Agent result block
                  if (log.type === 'agent-result' && log.agentResult) {
                    return <AgentOutputBlock key={log.id} result={log.agentResult} />;
                  }

                  // Plain text log
                  return (
                    <div
                      key={log.id}
                      className={`flex gap-2 py-0.5 hover:bg-slate-800/30 px-1 -mx-1 rounded ${
                        log.stream === 'stderr' ? 'text-red-400' : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-600 select-none shrink-0">
                        [{formatTimestamp(log.timestamp)}]
                      </span>
                      <span className="whitespace-pre-wrap break-all">
                        {log.output.startsWith('>') || log.output.startsWith('[') ? (
                          <span
                            className={
                              log.output.includes('ERROR') || log.output.includes('WARN')
                                ? log.output.includes('ERROR')
                                  ? 'text-red-400'
                                  : 'text-yellow-400'
                                : log.output.startsWith('>')
                                ? 'text-blue-400'
                                : 'text-emerald-400'
                            }
                          >
                            {log.output}
                          </span>
                        ) : (
                          log.output
                        )}
                      </span>
                    </div>
                  );
                })
              )
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Prompt modal */}
      <ExecutionPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onExecute={handleExecuteWithBrief}
        agentCount={nodes.length}
      />
    </div>
  );
};

export default TerminalPanel;
