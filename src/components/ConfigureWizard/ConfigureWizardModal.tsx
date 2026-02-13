import React, { useState, useCallback, useRef } from 'react';
import { Settings2, X, RotateCcw } from 'lucide-react';
import useStore from '../../store/useStore';
import type { ConfigureNodeStep } from '../../store/useStore';
import { scanWorkflow, analyzeNodeConfig } from '../../services/configureApi';
import { NodeStepperSidebar } from './NodeStepperSidebar';
import { WorkflowScanView } from './WorkflowScanView';
import { NodeConfigView } from './NodeConfigView';
import { SummaryView } from './SummaryView';
import type {
  ConfigurePhase,
  ConfigureNodeStatus,
  WorkflowAnalysis,
  ConfigSuggestion,
  MissingRequirement,
} from '../../../shared/configure-types';

interface ConfigureWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Re-export for internal use (matches store type)
type NodeStep = ConfigureNodeStep;

export const ConfigureWizardModal: React.FC<ConfigureWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { nodes, edges, updateNodeData, configureWizardCache, setConfigureWizardCache } = useStore();

  // Wizard state — initialized from cache if available
  const [phase, setPhase] = useState<ConfigurePhase>(
    configureWizardCache?.phase || 'workflow-scan'
  );
  const [workflowAnalysis, setWorkflowAnalysis] = useState<WorkflowAnalysis | null>(
    configureWizardCache?.workflowAnalysis || null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Per-node state — initialized from cache if available
  const [nodeSteps, setNodeSteps] = useState<NodeStep[]>(
    configureWizardCache?.nodeSteps || []
  );
  const [currentIndex, setCurrentIndex] = useState(
    configureWizardCache?.currentIndex || 0
  );
  const [suggestions, setSuggestions] = useState<Map<string, ConfigSuggestion>>(
    configureWizardCache?.suggestions || new Map()
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef(false);

  // Restore from cache when modal reopens
  React.useEffect(() => {
    if (isOpen && configureWizardCache) {
      setPhase(configureWizardCache.phase);
      setWorkflowAnalysis(configureWizardCache.workflowAnalysis);
      setNodeSteps(configureWizardCache.nodeSteps);
      setCurrentIndex(configureWizardCache.currentIndex);
      setSuggestions(configureWizardCache.suggestions);
    }
  }, [isOpen]); // Only trigger on open/close transitions

  // ---------- Phase 1: Workflow Scan ----------

  const runWorkflowScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const scanNodes = nodes.map((n) => ({
        id: n.id,
        type: n.data?.type || n.type || 'UNKNOWN',
        label: n.data?.label || n.id,
        config: n.data || {},
      }));
      const scanEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      }));

      const analysis = await scanWorkflow(scanNodes, scanEdges);
      setWorkflowAnalysis(analysis);

      // Build node steps from analysis order
      const steps: NodeStep[] = analysis.orderOfAnalysis.map((nodeId) => {
        const n = nodes.find((nd) => nd.id === nodeId);
        return {
          id: nodeId,
          label: n?.data?.label || nodeId,
          type: n?.data?.type || 'UNKNOWN',
          config: n?.data || {},
          status: 'pending' as ConfigureNodeStatus,
        };
      });
      setNodeSteps(steps);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [nodes, edges]);

  // Auto-scan when modal opens (skip if we have cached summary state)
  React.useEffect(() => {
    if (isOpen && !workflowAnalysis && !isScanning && phase === 'workflow-scan') {
      runWorkflowScan();
    }
  }, [isOpen, workflowAnalysis, isScanning, runWorkflowScan, phase]);

  // ---------- Phase 2: Per-Node Analysis ----------

  const analyzeNode = useCallback(
    async (index: number) => {
      const step = nodeSteps[index];
      if (!step) return;

      // Update status
      setNodeSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status: 'analyzing' } : s))
      );
      setIsStreaming(true);
      setStreamingText('');

      try {
        const workflowContext = {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          connectedNodes: edges
            .filter((e) => e.source === step.id || e.target === step.id)
            .map((e) => {
              const otherId = e.source === step.id ? e.target : e.source;
              const other = nodes.find((n) => n.id === otherId);
              return {
                type: other?.data?.type || 'UNKNOWN',
                label: other?.data?.label || otherId,
              };
            }),
          workflowName: 'Workflow',
        };

        const suggestion = await analyzeNodeConfig(
          {
            id: step.id,
            type: step.type,
            label: step.label,
            config: step.config,
          },
          workflowContext,
          (chunk) => {
            if (!abortRef.current) {
              setStreamingText((prev) => prev + chunk);
            }
          }
        );

        if (!abortRef.current) {
          setSuggestions((prev) => new Map(prev).set(step.id, suggestion));
          // If parsing failed, mark as error so retry is available
          const status = suggestion._parseFailed ? 'error' : 'ready';
          setNodeSteps((prev) =>
            prev.map((s, i) => (i === index ? { ...s, status } : s))
          );
        }
      } catch (err) {
        if (!abortRef.current) {
          setNodeSteps((prev) =>
            prev.map((s, i) => (i === index ? { ...s, status: 'error' } : s))
          );
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [nodeSteps, nodes, edges]
  );

  const handleStartConfig = useCallback(() => {
    setPhase('node-config');
    setCurrentIndex(0);
    // Start analyzing the first node
    setTimeout(() => analyzeNode(0), 100);
  }, [analyzeNode]);

  const advanceToNext = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex >= nodeSteps.length) {
        setPhase('summary');
      } else {
        setCurrentIndex(nextIndex);
        setTimeout(() => analyzeNode(nextIndex), 100);
      }
    },
    [nodeSteps.length, analyzeNode]
  );

  // ---------- Field Accept/Reject ----------

  const handleAcceptField = useCallback(
    (field: string) => {
      const step = nodeSteps[currentIndex];
      if (!step) return;

      setSuggestions((prev) => {
        const map = new Map(prev);
        const sug = map.get(step.id);
        if (sug) {
          map.set(step.id, {
            ...sug,
            suggestions: sug.suggestions.map((s) =>
              s.field === field ? { ...s, accepted: true } : s
            ),
          });
        }
        return map;
      });
    },
    [currentIndex, nodeSteps]
  );

  const handleRejectField = useCallback(
    (field: string) => {
      const step = nodeSteps[currentIndex];
      if (!step) return;

      setSuggestions((prev) => {
        const map = new Map(prev);
        const sug = map.get(step.id);
        if (sug) {
          map.set(step.id, {
            ...sug,
            suggestions: sug.suggestions.map((s) =>
              s.field === field ? { ...s, accepted: false } : s
            ),
          });
        }
        return map;
      });
    },
    [currentIndex, nodeSteps]
  );

  const handleAcceptAll = useCallback(() => {
    const step = nodeSteps[currentIndex];
    if (!step) return;

    // Mark all undecided changed fields as accepted (skip 'none' priority — already optimal)
    setSuggestions((prev) => {
      const map = new Map(prev);
      const sug = map.get(step.id);
      if (sug) {
        map.set(step.id, {
          ...sug,
          suggestions: sug.suggestions.map((s) =>
            s.accepted === undefined && s.priority !== 'none' ? { ...s, accepted: true } : s
          ),
        });
      }
      return map;
    });

    // Apply accepted suggestions to the store (skip unchanged 'none' fields)
    const sug = suggestions.get(step.id);
    if (sug) {
      const updates: Record<string, unknown> = {};
      sug.suggestions.forEach((field) => {
        // Only apply changed fields that aren't rejected
        if (field.priority !== 'none' && field.accepted !== false) {
          updates[field.field] = field.suggestedValue;
        }
      });
      if (Object.keys(updates).length > 0) {
        updateNodeData(step.id, updates);
      }
    }

    // Update status and advance
    setNodeSteps((prev) =>
      prev.map((s, i) => (i === currentIndex ? { ...s, status: 'accepted' } : s))
    );
    advanceToNext(currentIndex);
  }, [currentIndex, nodeSteps, suggestions, updateNodeData, advanceToNext]);

  const handleSkip = useCallback(() => {
    setNodeSteps((prev) =>
      prev.map((s, i) => (i === currentIndex ? { ...s, status: 'skipped' } : s))
    );
    advanceToNext(currentIndex);
  }, [currentIndex, advanceToNext]);

  const handleRetry = useCallback(() => {
    // Clear the old suggestion and re-analyze the current node
    const step = nodeSteps[currentIndex];
    if (!step) return;
    setSuggestions((prev) => {
      const map = new Map(prev);
      map.delete(step.id);
      return map;
    });
    analyzeNode(currentIndex);
  }, [currentIndex, nodeSteps, analyzeNode]);

  // ---------- Close / Reset ----------

  // Collect all missing requirements for summary
  const allMissingRequirements: MissingRequirement[] = [];
  suggestions.forEach((sug) => {
    allMissingRequirements.push(...sug.missingRequirements);
  });

  const handleClose = useCallback(() => {
    abortRef.current = true;

    // If we're on the summary page, cache the state for reopening
    if (phase === 'summary') {
      setConfigureWizardCache({
        phase,
        workflowAnalysis,
        nodeSteps,
        currentIndex,
        suggestions,
        allMissingRequirements,
      });
    } else {
      // Not on summary — reset local state so next open starts fresh
      setPhase('workflow-scan');
      setWorkflowAnalysis(null);
      setNodeSteps([]);
      setCurrentIndex(0);
      setSuggestions(new Map());
      setConfigureWizardCache(null);
    }

    setIsStreaming(false);
    setStreamingText('');
    setScanError(null);
    abortRef.current = false;
    onClose();
  }, [onClose, phase, workflowAnalysis, nodeSteps, currentIndex, suggestions, allMissingRequirements, setConfigureWizardCache]);

  // Explicit reset — clears cache and starts over
  const handleStartOver = useCallback(() => {
    setConfigureWizardCache(null);
    setPhase('workflow-scan');
    setWorkflowAnalysis(null);
    setNodeSteps([]);
    setCurrentIndex(0);
    setSuggestions(new Map());
    setIsStreaming(false);
    setStreamingText('');
    setScanError(null);
    // Re-trigger scan
    setTimeout(() => runWorkflowScan(), 100);
  }, [setConfigureWizardCache, runWorkflowScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-violet-900/40 to-purple-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Settings2 size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Configure Workflow
              </h2>
              <p className="text-xs text-slate-400">
                {phase === 'workflow-scan' && 'Scanning workflow for issues…'}
                {phase === 'node-config' &&
                  `Analyzing node ${currentIndex + 1} of ${nodeSteps.length}`}
                {phase === 'summary' && 'Configuration complete'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === 'summary' && (
              <button
                onClick={handleStartOver}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Reset and start configuration over"
              >
                <RotateCcw size={12} />
                Start Over
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar (phases 2 & 3) */}
          {phase !== 'workflow-scan' && nodeSteps.length > 0 && (
            <NodeStepperSidebar
              nodes={nodeSteps}
              currentIndex={currentIndex}
              onSelect={(idx) => {
                if (!isStreaming && nodeSteps[idx]?.status !== 'pending') {
                  setCurrentIndex(idx);
                }
              }}
            />
          )}

          {/* Main Content */}
          {phase === 'workflow-scan' && (
            <>
              {isScanning && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Scanning workflow…</p>
                  </div>
                </div>
              )}
              {scanError && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-red-400 mb-2">Scan Error</p>
                    <p className="text-xs text-slate-500">{scanError}</p>
                    <button
                      onClick={runWorkflowScan}
                      className="mt-3 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {workflowAnalysis && !isScanning && (
                <WorkflowScanView
                  analysis={workflowAnalysis}
                  onStart={handleStartConfig}
                />
              )}
            </>
          )}

          {phase === 'node-config' && nodeSteps[currentIndex] && (
            <NodeConfigView
              node={nodeSteps[currentIndex]}
              suggestion={suggestions.get(nodeSteps[currentIndex].id) || null}
              isStreaming={isStreaming}
              streamingText={streamingText}
              onAcceptField={handleAcceptField}
              onRejectField={handleRejectField}
              onAcceptAll={handleAcceptAll}
              onSkip={handleSkip}
              onRetry={handleRetry}
            />
          )}

          {phase === 'summary' && (
            <SummaryView
              suggestions={suggestions}
              statuses={
                new Map(nodeSteps.map((s) => [s.id, s.status]))
              }
              allMissingRequirements={allMissingRequirements}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
