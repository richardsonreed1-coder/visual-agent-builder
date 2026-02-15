import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle2, SkipForward, AlertTriangle, BarChart3, Wrench, Loader2, Clipboard, ExternalLink } from 'lucide-react';
import type { ConfigSuggestion, MissingRequirement } from '../../../shared/configure-types';
import { compileFixerPrompt } from '../../utils/compileFixerPrompt';
import { useSocket } from '../../hooks/useSocket';
import useStore from '../../store/useStore';

/* ---------- Deduplication Types & Logic ---------- */

interface DeduplicatedRequirement {
  dedupKey: string;
  primaryReq: MissingRequirement;
  originalIndices: number[];
  affectedNodes: string[];
}

// Known env var patterns to look for in description/solution text
const ENV_VAR_PATTERNS = [
  'BRAVE_SEARCH_API_KEY', 'BRAVE_API_KEY',
  'TAVILY_API_KEY',
  'FIRECRAWL_API_KEY',
  'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'TWENTYFIRST_DEV_API_KEY', '21ST_DEV_API_KEY',
  'CONTEXT7_API_KEY',
  'GITHUB_TOKEN', 'GITHUB_PERSONAL_ACCESS_TOKEN',
  'CHROME_PATH', 'PUPPETEER_EXECUTABLE_PATH',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'PERPLEXITY_API_KEY',
];

// Service name patterns (case-insensitive matching)
const SERVICE_PATTERNS = [
  'brave search', 'tavily', 'firecrawl', 'context7',
  'gemini', '21st-dev', '21st.dev', 'github',
  'lighthouse', 'puppeteer', 'openai', 'anthropic',
  'perplexity',
];

function extractDedupKey(req: MissingRequirement): string {
  const text = `${req.description} ${req.solution}`.toUpperCase();

  // Check for known env var patterns first (most specific)
  for (const pattern of ENV_VAR_PATTERNS) {
    if (text.includes(pattern)) {
      return `env:${pattern}`;
    }
  }

  // Check for service name patterns
  const textLower = text.toLowerCase();
  for (const service of SERVICE_PATTERNS) {
    if (textLower.includes(service)) {
      return `service:${service}`;
    }
  }

  // Fallback: normalized description (lowercase, trimmed, collapse whitespace)
  return `desc:${req.description.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}

function deduplicateRequirements(
  allRequirements: MissingRequirement[]
): { autoFixable: Array<{ req: MissingRequirement; index: number }>; dedupedManual: DeduplicatedRequirement[] } {
  const autoFixable: Array<{ req: MissingRequirement; index: number }> = [];
  const manualByKey = new Map<string, { indices: number[]; reqs: MissingRequirement[] }>();

  allRequirements.forEach((req, i) => {
    if ((req.category || 'manual') === 'auto_fixable') {
      autoFixable.push({ req, index: i });
      return;
    }

    const key = extractDedupKey(req);
    const existing = manualByKey.get(key);
    if (existing) {
      existing.indices.push(i);
      existing.reqs.push(req);
    } else {
      manualByKey.set(key, { indices: [i], reqs: [req] });
    }
  });

  const dedupedManual: DeduplicatedRequirement[] = [];
  for (const [key, group] of manualByKey) {
    // Pick the requirement with the longest solution text as primary
    let primaryIdx = 0;
    let maxLen = 0;
    group.reqs.forEach((r, i) => {
      if (r.solution.length > maxLen) {
        maxLen = r.solution.length;
        primaryIdx = i;
      }
    });

    const affectedNodes = [
      ...new Set(group.reqs.map((r) => r.nodeLabel).filter(Boolean) as string[]),
    ];

    dedupedManual.push({
      dedupKey: key,
      primaryReq: group.reqs[primaryIdx],
      originalIndices: group.indices,
      affectedNodes,
    });
  }

  return { autoFixable, dedupedManual };
}

/* ---------- Component Props ---------- */

interface SummaryViewProps {
  suggestions: Map<string, ConfigSuggestion>;
  statuses: Map<string, string>;
  allMissingRequirements: MissingRequirement[];
  onClose: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  suggestions,
  statuses,
  allMissingRequirements,
  onClose,
}) => {
  const { nodes, setFixerRunning } = useStore();
  const { isConnected, sessionId, socket, startSession } = useSocket();
  const [isLaunching, setIsLaunching] = useState(false);
  const [userValues, setUserValues] = useState<Map<number, string>>(new Map());

  const acceptedCount = Array.from(statuses.values()).filter(s => s === 'accepted').length;
  const skippedCount = Array.from(statuses.values()).filter(s => s === 'skipped').length;
  const errorCount = Array.from(statuses.values()).filter(s => s === 'error').length;

  let totalFieldsChanged = 0;
  suggestions.forEach((sug) => {
    totalFieldsChanged += sug.suggestions.filter(f => f.accepted === true).length;
  });

  // Deduplication
  const { autoFixable, dedupedManual } = useMemo(
    () => deduplicateRequirements(allMissingRequirements),
    [allMissingRequirements]
  );

  const autoFixableCount = autoFixable.length;
  const uniqueManualCount = dedupedManual.length;

  // ---------- Open Fixer ----------

  const handleOpenFixer = useCallback(async () => {
    if (!isConnected || !socket) {
      console.warn('[Fixer] Cannot launch: not connected');
      return;
    }

    setIsLaunching(true);

    try {
      // Compile the prompt
      const workflowContext = {
        nodeCount: nodes.length,
        nodes: nodes.map((n) => ({
          id: n.id,
          label: (n.data as Record<string, unknown>)?.label as string || n.id,
          type: (n.data as Record<string, unknown>)?.type as string || n.type || 'UNKNOWN',
        })),
      };

      const compiledPrompt = compileFixerPrompt(allMissingRequirements, workflowContext, userValues);

      // Start session if needed
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await startSession();
      }

      // Mark fixer as running (shared state for terminal)
      setFixerRunning(true);

      // Emit fixer:start — runs as a standalone Claude call,
      // NOT through the multi-agent orchestrator
      socket.emit('fixer:start', {
        sessionId: activeSessionId,
        prompt: compiledPrompt,
      });

      // Close the configure modal — terminal will take over
      onClose();
    } catch (err) {
      console.error('[Fixer] Failed to launch:', err);
      setIsLaunching(false);
    }
  }, [isConnected, socket, sessionId, startSession, nodes, allMissingRequirements, userValues, onClose]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 mb-3">
          <BarChart3 size={28} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Configuration Complete</h3>
        <p className="text-sm text-slate-400 mt-1">All components have been reviewed</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
          <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-emerald-300">{acceptedCount}</p>
          <p className="text-xs text-slate-400">Accepted</p>
        </div>
        <div className="bg-slate-500/10 rounded-lg p-3 text-center border border-slate-600/30">
          <SkipForward size={20} className="text-slate-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-slate-300">{skippedCount}</p>
          <p className="text-xs text-slate-400">Skipped</p>
        </div>
        <div className="bg-violet-500/10 rounded-lg p-3 text-center border border-violet-500/20">
          <BarChart3 size={20} className="text-violet-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-violet-300">{totalFieldsChanged}</p>
          <p className="text-xs text-slate-400">Fields Changed</p>
        </div>
      </div>

      {/* Errors */}
      {errorCount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-300">{errorCount} node(s) encountered errors during analysis.</p>
        </div>
      )}

      {/* Remaining Missing Requirements */}
      {allMissingRequirements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Remaining Requirements ({autoFixableCount + uniqueManualCount})
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {autoFixableCount > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench size={10} className="text-blue-400" />
                  {autoFixableCount} auto-fixable
                </span>
              )}
              {uniqueManualCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clipboard size={10} className="text-amber-400" />
                  {uniqueManualCount} unique credential{uniqueManualCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {/* Auto-fixable items — no dedup needed */}
            {autoFixable.map(({ req, index }) => (
              <RequirementCard
                key={`auto-${index}`}
                req={req}
                index={index}
                userValue=""
                onValueChange={() => {}}
              />
            ))}

            {/* Deduplicated manual items */}
            {dedupedManual.map((group) => (
              <DedupRequirementCard
                key={group.dedupKey}
                group={group}
                userValue={userValues.get(group.originalIndices[0]) || ''}
                onValueChange={(value) => {
                  setUserValues((prev) => {
                    const next = new Map(prev);
                    for (const idx of group.originalIndices) {
                      next.set(idx, value);
                    }
                    return next;
                  });
                }}
              />
            ))}
          </div>

          {/* Open Fixer Button */}
          <button
            onClick={handleOpenFixer}
            disabled={isLaunching || !isConnected}
            className="mt-4 w-full flex items-center justify-center gap-3 px-5 py-3 text-sm font-medium text-white
                       bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-xl transition-all shadow-lg shadow-violet-900/30
                       border border-violet-500/30"
          >
            {isLaunching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Launching Fixer...
              </>
            ) : (
              <>
                <Wrench size={16} />
                Open Fixer
                <span className="text-xs text-violet-300 opacity-75">
                  Compile & execute in terminal
                </span>
              </>
            )}
          </button>

          {!isConnected && (
            <p className="text-xs text-amber-400 text-center mt-2">
              Socket not connected. Fixer requires a server connection.
            </p>
          )}
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t border-slate-700/50">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     rounded-lg transition-all shadow-lg shadow-violet-900/30"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/* ---------- Requirement Card Sub-component ---------- */

interface RequirementCardProps {
  req: MissingRequirement;
  index: number;
  userValue: string;
  onValueChange: (value: string) => void;
}

function getPlaceholder(req: MissingRequirement): string {
  const desc = req.description.toLowerCase();

  // Try to extract a specific hint from the solution text
  // e.g., "Set auth.envVar to the environment variable name containing your API key (e.g., GITHUB_TOKEN)"
  const egMatch = req.solution.match(/\(e\.g\.,?\s*([^)]+)\)/i);
  if (egMatch) {
    return `e.g., ${egMatch[1].trim()}`;
  }

  // Context-specific placeholders based on what the requirement is about
  if (desc.includes('api key') || desc.includes('credential') || desc.includes('token')) {
    return 'sk-... or token value';
  }
  if (desc.includes('env var') || desc.includes('environment variable')) {
    return 'VARIABLE_NAME=value';
  }
  if (desc.includes('url') || desc.includes('endpoint') || desc.includes('webhook')) {
    return 'https://...';
  }
  if (desc.includes('rss') || desc.includes('feed')) {
    return 'https://example.com/feed.xml';
  }
  if (desc.includes('mcp') || desc.includes('server')) {
    return 'npx @org/mcp-server-name';
  }
  if (desc.includes('command') || desc.includes('script')) {
    return 'command or path to script';
  }

  // Fall back to type-based hints
  switch (req.type) {
    case 'api_key':
      return 'Paste API key or token...';
    case 'env_var':
      return 'ENV_VAR_NAME=value';
    case 'config_field':
      return 'Enter value...';
    case 'connection':
      return 'https://... or connection string';
    default:
      return 'Enter value...';
  }
}

const RequirementCard: React.FC<RequirementCardProps> = ({ req, index: _index, userValue, onValueChange }) => {
  const isAutoFixable = (req.category || 'manual') === 'auto_fixable';
  const isManual = !isAutoFixable;

  return (
    <div className={`p-3 rounded-lg ${isAutoFixable ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {req.nodeLabel && (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {req.nodeLabel}
              </span>
            )}
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isAutoFixable
                  ? 'text-blue-400 bg-blue-500/15'
                  : userValue
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-amber-400 bg-amber-500/15'
              }`}
            >
              {isAutoFixable ? 'Auto-fixable' : userValue ? 'Provided' : 'Manual'}
            </span>
          </div>
          <p className="text-sm text-slate-200">{req.description}</p>
          <p className="text-xs text-slate-400 mt-1">{req.solution}</p>

          {/* Inline input for manual requirements */}
          {isManual && (
            <input
              type={req.type === 'api_key' ? 'password' : 'text'}
              value={userValue}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={getPlaceholder(req)}
              className="mt-2 w-full px-3 py-1.5 text-sm rounded-md
                         bg-slate-800 border border-slate-600 text-slate-200
                         placeholder-slate-500
                         focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30
                         transition-colors"
            />
          )}
        </div>
        <div className="shrink-0 mt-1">
          {isAutoFixable ? (
            <Wrench size={14} className="text-blue-400" />
          ) : (
            <ExternalLink size={14} className="text-amber-400" />
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Deduplicated Requirement Card ---------- */

interface DedupRequirementCardProps {
  group: DeduplicatedRequirement;
  userValue: string;
  onValueChange: (value: string) => void;
}

const DedupRequirementCard: React.FC<DedupRequirementCardProps> = ({ group, userValue, onValueChange }) => {
  const { primaryReq, affectedNodes } = group;
  const hasMultipleNodes = affectedNodes.length > 1;

  return (
    <div className={`p-3 rounded-lg ${userValue ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                userValue
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-amber-400 bg-amber-500/15'
              }`}
            >
              {userValue ? 'Provided' : 'Manual'}
            </span>
            {hasMultipleNodes && (
              <span className="text-[10px] text-slate-500">
                Used by {affectedNodes.length} agents
              </span>
            )}
          </div>
          <p className="text-sm text-slate-200">{primaryReq.description}</p>
          <p className="text-xs text-slate-400 mt-1">{primaryReq.solution}</p>

          {/* Affected node badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {affectedNodes.map((label) => (
              <span
                key={label}
                className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Single input for the entire group */}
          <input
            type={primaryReq.type === 'api_key' ? 'password' : 'text'}
            value={userValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={getPlaceholder(primaryReq)}
            className="mt-2 w-full px-3 py-1.5 text-sm rounded-md
                       bg-slate-800 border border-slate-600 text-slate-200
                       placeholder-slate-500
                       focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30
                       transition-colors"
          />
        </div>
        <div className="shrink-0 mt-1">
          <ExternalLink size={14} className="text-amber-400" />
        </div>
      </div>
    </div>
  );
};
