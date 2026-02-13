import type {
  WorkflowAnalysis,
  ConfigSuggestion,
  ConfigureWorkflowRequest,
  ConfigureNodeRequest,
} from '../../shared/configure-types';

const API_BASE = 'http://localhost:3001';

/**
 * Deterministic workflow scan — no AI, fast rules-based check.
 */
export async function scanWorkflow(
  nodes: ConfigureWorkflowRequest['nodes'],
  edges: ConfigureWorkflowRequest['edges']
): Promise<WorkflowAnalysis> {
  const res = await fetch(`${API_BASE}/api/configure-workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges }),
  });
  if (!res.ok) {
    throw new Error(`Workflow scan failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * AI-powered per-node configuration analysis with SSE streaming.
 * Calls onChunk for each text token, returns the final ConfigSuggestion.
 */
export async function analyzeNodeConfig(
  node: ConfigureNodeRequest['node'],
  workflowContext: ConfigureNodeRequest['workflowContext'],
  onChunk: (text: string) => void
): Promise<ConfigSuggestion> {
  const res = await fetch(`${API_BASE}/api/configure-node`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node, workflowContext }),
  });

  if (!res.ok) {
    throw new Error(`Node analysis failed: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let result: ConfigSuggestion | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();

      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'chunk') {
          onChunk(parsed.text);
        } else if (parsed.type === 'result') {
          result = parsed.suggestion;
        } else if (parsed.type === 'error') {
          throw new Error(parsed.message);
        }
      } catch {
        // Skip malformed SSE lines (JSON parse errors)
        continue;
      }
    }
  }

  if (!result) {
    throw new Error('No suggestion received from analysis');
  }

  return result;
}
