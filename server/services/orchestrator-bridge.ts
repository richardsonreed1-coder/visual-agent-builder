// =============================================================================
// Orchestrator Bridge
// Bridges the VAB server socket events to the real WorkflowEngine + AgentRunner
// Converts canvas state → ParsedWorkflow, executes via Claude API,
// and streams results back to TerminalPanel via socket events.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import {
  emitExecutionLog,
  emitExecutionStepStart,
  emitExecutionStepComplete,
  emitAgentResult,
  emitExecutionReport,
} from '../socket/emitter';
import { SANDBOX_TOOLS } from '../mcp/sandbox-mcp';

// ---------------------------------------------------------------------------
// Types — mirrored from agent-orchestrator/orchestrator/src/workflow/parser.ts
// (Inlined to avoid ESM/CJS boundary issues)
// ---------------------------------------------------------------------------

export interface WorkflowNode {
  id: string;
  type: string;          // React Flow type
  nodeType: string;      // AGENT, DEPARTMENT, MCP_SERVER, etc.
  label: string;
  config: Record<string, unknown>;
  parentId?: string;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: string;          // delegation, data, control, event, failover
}

export interface ParsedWorkflow {
  name: string;
  description: string;
  version: string;
  framework: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  agents: WorkflowNode[];
  departments: WorkflowNode[];
  mcpServers: WorkflowNode[];
  skills: WorkflowNode[];
  hooks: WorkflowNode[];
}

// ---------------------------------------------------------------------------
// Types — mirrored from agent-orchestrator/orchestrator/src/workflow/engine.ts
// ---------------------------------------------------------------------------

interface ExecutionPhase {
  name: string;
  agents: WorkflowNode[];
  parallel: boolean;
}

interface ExecutionPlan {
  phases: ExecutionPhase[];
}

export interface AgentResult {
  agentId: string;
  agentLabel: string;
  status: 'success' | 'error' | 'timeout';
  output: string;
  tokensUsed: { input: number; output: number };
  durationMs: number;
  cost: number;
}

interface PhaseReport {
  name: string;
  results: AgentResult[];
  durationMs: number;
}

export interface ExecutionReport {
  workflow: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  phases: PhaseReport[];
  status: 'success' | 'partial' | 'failed';
}

// ---------------------------------------------------------------------------
// Logger — bridges pino-style interface to socket event emission
// ---------------------------------------------------------------------------

interface BridgeLogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
}

function createSocketLogger(sessionId: string): BridgeLogger {
  const formatObj = (obj: Record<string, unknown>): string => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        parts.push(`${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  return {
    info: (obj, msg) => emitExecutionLog(sessionId, `[INFO] ${msg}${formatObj(obj)}`),
    warn: (obj, msg) => emitExecutionLog(sessionId, `[WARN] ${msg}${formatObj(obj)}`),
    error: (obj, msg) => emitExecutionLog(sessionId, `[ERROR] ${msg}${formatObj(obj)}`, 'stderr'),
  };
}

// ---------------------------------------------------------------------------
// Canvas → ParsedWorkflow converter
// ---------------------------------------------------------------------------

interface CanvasNode {
  id: string;
  data?: Record<string, unknown>;
  type?: string;
  parentId?: string;
  position?: { x: number; y: number };
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, unknown>;
}

function convertToWorkflow(
  canvasNodes: CanvasNode[],
  canvasEdges: CanvasEdge[],
  name: string
): ParsedWorkflow {
  // Convert canvas nodes to WorkflowNodes
  const nodes: WorkflowNode[] = canvasNodes.map((n) => {
    const data = n.data || {};
    const nodeType = (data.type as string) || n.type || 'AGENT';
    // Properties Panel stores fields directly on data (model, systemPrompt, etc.)
    // Fall back to data.config for workflow files that use nested config
    const config = (data.config as Record<string, unknown>) || (data as Record<string, unknown>);

    return {
      id: n.id,
      type: n.type || 'customNode',
      nodeType,
      label: (data.label as string) || `${nodeType} Node`,
      config,
      parentId: n.parentId,
      position: n.position || { x: 0, y: 0 },
    };
  });

  // Convert canvas edges to WorkflowEdges
  const edges: WorkflowEdge[] = canvasEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type || (e.data?.type as string) || (e.data?.edgeType as string) || 'default',
  }));

  // Categorize nodes
  const agents = nodes.filter((n) => n.nodeType === 'AGENT');
  const departments = nodes.filter((n) => n.nodeType === 'DEPARTMENT');
  const mcpServers = nodes.filter((n) => n.nodeType === 'MCP_SERVER');
  const skills = nodes.filter((n) => n.nodeType === 'SKILL');
  const hooks = nodes.filter((n) => n.nodeType === 'HOOK');

  return {
    name,
    description: '',
    version: '1.0.0',
    framework: 'vab-native',
    nodes,
    edges,
    agents,
    departments,
    mcpServers,
    skills,
    hooks,
  };
}

// ---------------------------------------------------------------------------
// Execution Plan Builder — adapted from WorkflowEngine.buildPlan()
// ---------------------------------------------------------------------------

function buildPlan(workflow: ParsedWorkflow, logger: BridgeLogger): ExecutionPlan {
  const { agents, edges } = workflow;
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  // Find delegation edges
  const delegationEdges = edges.filter((e) => e.type === 'delegation');
  const targetsOfDelegation = new Set(delegationEdges.map((e) => e.target));
  const sourcesOfDelegation = new Set(delegationEdges.map((e) => e.source));

  // Orchestrators: delegate but aren't delegated to
  const orchestrators = agents.filter(
    (a) => sourcesOfDelegation.has(a.id) && !targetsOfDelegation.has(a.id)
  );

  // Team leads: receive delegation and also delegate
  const leads = agents.filter(
    (a) => targetsOfDelegation.has(a.id) && sourcesOfDelegation.has(a.id)
  );

  // Specialists: receive delegation but don't delegate
  const specialists = agents.filter(
    (a) => targetsOfDelegation.has(a.id) && !sourcesOfDelegation.has(a.id)
  );

  // Auditors: receive control edges
  const controlTargets = new Set(
    edges.filter((e) => e.type === 'control').map((e) => e.target)
  );
  const auditors = agents.filter((a) => controlTargets.has(a.id));

  // Data edges between agents
  const dataEdges = edges.filter(
    (e) => e.type === 'data' && agentMap.has(e.source) && agentMap.has(e.target)
  );

  const phases: ExecutionPhase[] = [];

  // Phase 0: Orchestrator intake
  if (orchestrators.length > 0) {
    phases.push({ name: 'Intake', agents: orchestrators, parallel: false });
  }

  // Determine lead order from data edges between leads
  const leadOrder: WorkflowNode[] = [];
  const visitedLeads = new Set<string>();

  for (const edge of dataEdges) {
    const src = agentMap.get(edge.source);
    const tgt = agentMap.get(edge.target);
    if (src && tgt && leads.includes(src) && leads.includes(tgt)) {
      if (!visitedLeads.has(src.id)) {
        leadOrder.push(src);
        visitedLeads.add(src.id);
      }
      if (!visitedLeads.has(tgt.id)) {
        leadOrder.push(tgt);
        visitedLeads.add(tgt.id);
      }
    }
  }

  // Add any leads not in the data-edge order
  for (const lead of leads) {
    if (!visitedLeads.has(lead.id)) {
      leadOrder.push(lead);
    }
  }

  // Build department phases from lead order
  for (const lead of leadOrder) {
    const deptId = lead.parentId || 'unknown';
    const deptAgents = specialists.filter((s) => s.parentId === deptId);

    phases.push({
      name: `${lead.label} Phase`,
      agents: [lead, ...deptAgents],
      parallel: deptAgents.length > 1,
    });
  }

  // If no delegation structure, treat all agents as a single sequential phase
  if (phases.length === 0 && agents.length > 0) {
    phases.push({
      name: 'Execution',
      agents,
      parallel: false,
    });
  }

  // Quality gate phase
  if (auditors.length > 0) {
    phases.push({ name: 'Quality Gate', agents: auditors, parallel: false });
  }

  logger.info(
    {
      phases: phases.length,
      totalAgents: phases.reduce((sum, p) => sum + p.agents.length, 0),
    },
    'Execution plan built'
  );

  return { phases };
}

// ---------------------------------------------------------------------------
// Agent Runner — adapted from AgentRunner.executeAgent()
// ---------------------------------------------------------------------------

async function runAgent(
  client: Anthropic,
  agent: WorkflowNode,
  input: string,
  context: Record<string, unknown>,
  sessionId: string,
  logger: BridgeLogger,
  abortSignal?: AbortSignal
): Promise<AgentResult> {
  const config = agent.config;
  const model = (config.model as string) || 'claude-sonnet-4-5-20250929';
  const maxTokens = (config.maxTokens as number) || 4096;
  const temperature = (config.temperature as number) || 0.5;
  const systemPrompt =
    (config.systemPrompt as string) || `You are ${agent.label}.`;
  const timeoutMs =
    ((config.guardrails as Record<string, unknown>)?.timeoutSeconds as number || 120) * 1000;

  logger.info({ agent: agent.label, model, temperature }, 'Executing agent');
  const startTime = Date.now();

  try {
    // Check if already aborted
    if (abortSignal?.aborted) {
      throw new Error('Execution cancelled');
    }

    // Set up timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Also abort if external signal fires
    const onExternalAbort = () => controller.abort();
    abortSignal?.addEventListener('abort', onExternalAbort);

    try {
      // Use streaming API — required for Opus models (operations >10min)
      // and beneficial for all models (enables real-time log output)
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: context
              ? `## Context\n${JSON.stringify(context, null, 2)}\n\n## Task\n${input}`
              : input,
          },
        ],
      });

      // Collect streamed text chunks
      let output = '';
      stream.on('text', (text) => {
        output += text;
      });

      // Wait for the stream to complete and get the final message
      const finalMessage = await stream.finalMessage();

      clearTimeout(timeout);
      abortSignal?.removeEventListener('abort', onExternalAbort);

      const durationMs = Date.now() - startTime;
      const tokensUsed = {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
      };

      // Cost estimate (Claude pricing)
      const inputCostPer1M = model.includes('opus')
        ? 15
        : model.includes('haiku')
        ? 0.25
        : 3;
      const outputCostPer1M = model.includes('opus')
        ? 75
        : model.includes('haiku')
        ? 1.25
        : 15;
      const cost =
        (tokensUsed.input / 1_000_000) * inputCostPer1M +
        (tokensUsed.output / 1_000_000) * outputCostPer1M;

      logger.info(
        {
          agent: agent.label,
          durationMs,
          tokens: `${tokensUsed.input}in/${tokensUsed.output}out`,
          cost: `$${cost.toFixed(4)}`,
        },
        'Agent completed'
      );

      return {
        agentId: agent.id,
        agentLabel: agent.label,
        status: 'success',
        output,
        tokensUsed,
        durationMs,
        cost,
      };
    } finally {
      clearTimeout(timeout);
      abortSignal?.removeEventListener('abort', onExternalAbort);
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error({ agent: agent.label, error: errorMessage }, 'Agent failed');

    return {
      agentId: agent.id,
      agentLabel: agent.label,
      status: (err as Error)?.name === 'AbortError' ? 'timeout' : 'error',
      output: errorMessage,
      tokensUsed: { input: 0, output: 0 },
      durationMs,
      cost: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Active executions — for stop support
// ---------------------------------------------------------------------------

const activeExecutions = new Map<string, AbortController>();

/**
 * Stop an active execution by session ID
 */
export function stopExecution(sessionId: string): void {
  const controller = activeExecutions.get(sessionId);
  if (controller) {
    controller.abort();
    activeExecutions.delete(sessionId);
    emitExecutionLog(sessionId, '[SYSTEM] Execution cancelled by user');
  }
}

// ---------------------------------------------------------------------------
// Standalone Fixer Agent — agentic tool-use loop for configuration fixes
// ---------------------------------------------------------------------------

const FIXER_SYSTEM_PROMPT = `You are a configuration fixer agent with access to sandbox tools.
You can create files, directories, execute commands, and read files in the sandbox environment.

IMPORTANT: All file paths must be RELATIVE to the sandbox root. Never use absolute paths.
- Correct: "config/settings.json", "agents/my-agent.md", ".claude/hooks/pre-commit.json"
- Wrong: "/Users/someone/Desktop/project/config/settings.json"

For sandbox_execute_command: use relative paths only. The working directory is already the sandbox root.

For auto-fixable items: USE YOUR TOOLS to actually create the files, directories, and configs. Do not just output instructions — execute the fixes directly.

For manual items (like obtaining API keys): Provide clear instructions the user can follow.

Work through each requirement systematically. After completing each fix, verify it worked by reading the file or listing the directory.

Be concise in your text output. Focus on executing fixes, not explaining what you would do.`;

/**
 * Execute the fixer agent with a compiled prompt.
 * Runs as an agentic tool-use loop with sandbox tools — NOT through the multi-agent orchestrator.
 * Claude can create files, directories, run commands, and verify fixes.
 * Streams output to the terminal via execution:log events.
 */
export async function executeFixerAgent(
  sessionId: string,
  prompt: string
): Promise<void> {
  const log = (msg: string, stream: 'stdout' | 'stderr' = 'stdout') =>
    emitExecutionLog(sessionId, msg, stream, 'fixer');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('═'.repeat(60), 'stderr');
    log('ERROR: ANTHROPIC_API_KEY not set', 'stderr');
    log('', 'stderr');
    log('To run the fixer, set your API key:', 'stderr');
    log('  1. Create server/.env file', 'stderr');
    log('  2. Add: ANTHROPIC_API_KEY=sk-ant-...', 'stderr');
    log('  3. Restart the server', 'stderr');
    log('═'.repeat(60), 'stderr');
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Set up abort controller
  const abortController = new AbortController();
  activeExecutions.set(sessionId, abortController);

  const startTime = Date.now();

  try {
    log('═'.repeat(60));
    log('CONFIGURATION FIXER — Agentic Tool-Use Loop');
    log('═'.repeat(60));
    log('');
    log('[INIT] Starting fixer agent with sandbox tools (claude-sonnet-4-5-20250929)...');
    log('');

    const client = new Anthropic({ apiKey });
    const model = 'claude-sonnet-4-5-20250929';

    // Build Anthropic tool definitions from SANDBOX_TOOLS
    const tools: Anthropic.Tool[] = Object.values(SANDBOX_TOOLS).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    let iteration = 0;
    const MAX_ITERATIONS = 25;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Agentic loop
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      if (abortController.signal.aborted) {
        log('[CANCELLED] Fixer stopped by user');
        break;
      }

      log(`[ITERATION ${iteration}/${MAX_ITERATIONS}]`);

      // Per-iteration timeout (2 minutes) to prevent hanging
      const iterationTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API call timed out after 2 minutes')), 120_000)
      );

      const response = await Promise.race([
        client.messages.create({
          model,
          max_tokens: 8192,
          temperature: 0.3,
          system: FIXER_SYSTEM_PROMPT,
          tools,
          messages,
        }),
        iterationTimeout,
      ]);

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Process content blocks
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (abortController.signal.aborted) break;

        if (block.type === 'text') {
          // Stream text to terminal line by line
          for (const line of block.text.split('\n')) {
            log(line);
          }
        } else if (block.type === 'tool_use') {
          const inputPreview = JSON.stringify(block.input);
          const truncated = inputPreview.length > 120
            ? inputPreview.slice(0, 120) + '...'
            : inputPreview;
          log(`[TOOL] ${block.name}(${truncated})`);

          // Look up the tool handler
          const toolDef = SANDBOX_TOOLS[block.name as keyof typeof SANDBOX_TOOLS];
          if (!toolDef) {
            log(`[TOOL] ✗ Unknown tool: ${block.name}`, 'stderr');
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ success: false, error: `Unknown tool: ${block.name}` }),
            });
            continue;
          }

          // Inject sessionId and source for command execution so output routes to Fixer tab
          const input = { ...(block.input as Record<string, unknown>) };
          if (block.name === 'sandbox_execute_command') {
            input.sessionId = sessionId;
            input.source = 'fixer';
          }

          try {
            const result = await toolDef.handler(input as any);

            if (result.success) {
              log(`[TOOL] ✓ ${block.name} succeeded`);
            } else {
              log(`[TOOL] ✗ ${block.name} failed: ${result.error}`, 'stderr');
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            log(`[TOOL] ✗ ${block.name} threw: ${errMsg}`, 'stderr');
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ success: false, error: errMsg }),
            });
          }
        }
      }

      // If stop_reason is not tool_use, the agent is done
      if (response.stop_reason !== 'tool_use') {
        break;
      }

      // Append assistant response + tool results for next iteration
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    if (iteration >= MAX_ITERATIONS) {
      log(`[WARN] Fixer reached maximum iteration limit (${MAX_ITERATIONS})`, 'stderr');
    }

    // Final summary with cumulative stats
    const durationMs = Date.now() - startTime;
    const cost =
      (totalInputTokens / 1_000_000) * 3 +
      (totalOutputTokens / 1_000_000) * 15;

    log('');
    log('═'.repeat(60));
    log(`> Fixer completed in ${iteration} iteration(s)`);
    log(`> Duration: ${(durationMs / 1000).toFixed(1)}s`);
    log(`> Cost: $${cost.toFixed(4)}`);
    log(`> Tokens: ${totalInputTokens} input, ${totalOutputTokens} output`);
    log('═'.repeat(60));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`[ERROR] Fixer failed: ${errorMessage}`, 'stderr');
    throw err;
  } finally {
    activeExecutions.delete(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Main execution entry point
// ---------------------------------------------------------------------------

/**
 * Execute a workflow from canvas state.
 * Converts canvas nodes/edges → ParsedWorkflow, builds execution plan,
 * runs agents via Claude API, and streams results to TerminalPanel.
 */
export async function executeWorkflow(
  sessionId: string,
  canvasNodes: CanvasNode[],
  canvasEdges: CanvasEdge[],
  brief: string = 'Execute the workflow.',
  workflowName: string = 'Canvas Workflow'
): Promise<ExecutionReport> {
  const logger = createSocketLogger(sessionId);
  const log = (msg: string, stream: 'stdout' | 'stderr' = 'stdout') =>
    emitExecutionLog(sessionId, msg, stream);

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('═'.repeat(60), 'stderr');
    log('ERROR: ANTHROPIC_API_KEY not set', 'stderr');
    log('', 'stderr');
    log('To run workflows, set your API key:', 'stderr');
    log('  1. Create server/.env file', 'stderr');
    log('  2. Add: ANTHROPIC_API_KEY=sk-ant-...', 'stderr');
    log('  3. Restart the server', 'stderr');
    log('═'.repeat(60), 'stderr');
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Set up abort controller
  const abortController = new AbortController();
  activeExecutions.set(sessionId, abortController);

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    log('═'.repeat(60));
    log('VISUAL AGENT BUILDER — Workflow Execution');
    log('═'.repeat(60));
    log('');

    // Convert canvas state to workflow
    log('[SETUP] Converting canvas to workflow...');
    const workflow = convertToWorkflow(canvasNodes, canvasEdges, workflowName);
    log(`  > ${workflow.agents.length} agent(s), ${workflow.departments.length} department(s), ${workflow.edges.length} edge(s)`);
    log('');

    if (workflow.agents.length === 0) {
      log('ERROR: No agents found in workflow. Add agent nodes to the canvas.', 'stderr');
      throw new Error('No agents in workflow');
    }

    // Build execution plan
    log('[PLANNING] Building execution plan...');
    const plan = buildPlan(workflow, logger);
    log(`  > ${plan.phases.length} phase(s) planned`);
    for (const phase of plan.phases) {
      log(`    • ${phase.name}: ${phase.agents.map((a) => a.label).join(', ')}${phase.parallel ? ' (parallel)' : ''}`);
    }
    log('');

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });
    log('[INIT] Claude API client initialized');
    log('');

    // Execute phases
    const phaseReports: PhaseReport[] = [];
    let currentContext: Record<string, unknown> = {
      brief,
    };
    let overallStatus: 'success' | 'partial' | 'failed' = 'success';

    for (let i = 0; i < plan.phases.length; i++) {
      const phase = plan.phases[i];

      // Check abort
      if (abortController.signal.aborted) {
        log('[CANCELLED] Execution stopped by user');
        overallStatus = 'failed';
        break;
      }

      log(`[PHASE ${i + 1}/${plan.phases.length}] ${phase.name}`);
      log('─'.repeat(40));

      // Emit step start event
      const planId = `plan_${sessionId}`;
      emitExecutionStepStart({
        sessionId,
        planId,
        stepId: `phase_${i}`,
        stepName: phase.name,
        stepOrder: i + 1,
        totalSteps: plan.phases.length,
      });

      const phaseStart = Date.now();
      let results: AgentResult[];

      if (phase.parallel && phase.agents.length > 1) {
        // Run agents in parallel
        log(`  Running ${phase.agents.length} agents in parallel...`);
        results = await Promise.all(
          phase.agents.map((agent) =>
            runAgent(client, agent, brief, currentContext, sessionId, logger, abortController.signal)
          )
        );
        // Emit structured result for each agent (parallel)
        for (const result of results) {
          emitAgentResult({
            sessionId,
            phaseIndex: i,
            phaseName: phase.name,
            agentId: result.agentId,
            agentLabel: result.agentLabel,
            status: result.status,
            output: result.output,
            tokensUsed: result.tokensUsed,
            durationMs: result.durationMs,
            cost: result.cost,
          });
        }
      } else {
        // Run agents sequentially
        results = [];
        for (const agent of phase.agents) {
          if (abortController.signal.aborted) break;

          log(`  > Running: ${agent.label}...`);
          const result = await runAgent(
            client,
            agent,
            brief,
            currentContext,
            sessionId,
            logger,
            abortController.signal
          );
          results.push(result);

          // Emit structured result for this agent (sequential)
          emitAgentResult({
            sessionId,
            phaseIndex: i,
            phaseName: phase.name,
            agentId: result.agentId,
            agentLabel: result.agentLabel,
            status: result.status,
            output: result.output,
            tokensUsed: result.tokensUsed,
            durationMs: result.durationMs,
            cost: result.cost,
          });

          // Feed output into context for next agent
          currentContext[agent.label.replace(/[^a-zA-Z0-9]/g, '_')] = result.output;
        }
      }

      // Check for failures
      const failures = results.filter((r) => r.status !== 'success');
      if (failures.length > 0) {
        if (failures.length === results.length) {
          overallStatus = 'failed';
          log(`  FAILED: All agents in phase failed`, 'stderr');
        } else {
          overallStatus = 'partial';
          log(`  WARNING: ${failures.length}/${results.length} agents failed`);
        }
      }

      // Merge successful outputs into context
      for (const result of results.filter((r) => r.status === 'success')) {
        currentContext[result.agentLabel.replace(/[^a-zA-Z0-9]/g, '_')] =
          result.output;
      }

      const phaseDuration = Date.now() - phaseStart;
      const phaseCost = results.reduce((sum, r) => sum + r.cost, 0);
      const phaseTokens = results.reduce(
        (sum, r) => sum + r.tokensUsed.input + r.tokensUsed.output,
        0
      );

      log(`  ✓ Phase complete: ${(phaseDuration / 1000).toFixed(1)}s, $${phaseCost.toFixed(4)}, ${phaseTokens} tokens`);
      log('');

      // Emit step complete event
      emitExecutionStepComplete({
        sessionId,
        planId,
        stepId: `phase_${i}`,
        stepName: phase.name,
        stepOrder: i + 1,
        totalSteps: plan.phases.length,
        success: failures.length === 0,
      });

      phaseReports.push({
        name: phase.name,
        results,
        durationMs: phaseDuration,
      });
    }

    // Final report
    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;
    const allResults = phaseReports.flatMap((p) => p.results);
    const totalCost = allResults.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = {
      input: allResults.reduce((sum, r) => sum + r.tokensUsed.input, 0),
      output: allResults.reduce((sum, r) => sum + r.tokensUsed.output, 0),
    };

    log('═'.repeat(60));
    log(`> Workflow ${overallStatus === 'success' ? 'completed successfully' : overallStatus === 'partial' ? 'completed with warnings' : 'FAILED'}!`);
    log(`> Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
    log(`> Total Cost: $${totalCost.toFixed(4)}`);
    log(`> Tokens: ${totalTokens.input} input, ${totalTokens.output} output`);
    log(`> Phases: ${phaseReports.length}, Agents: ${allResults.length}`);
    log('═'.repeat(60));

    const report: ExecutionReport = {
      workflow: workflowName,
      startedAt,
      completedAt,
      totalDurationMs,
      totalCost,
      totalTokens,
      phases: phaseReports,
      status: overallStatus,
    };

    // Emit structured execution report to frontend
    emitExecutionReport({
      sessionId,
      workflow: report.workflow,
      startedAt: report.startedAt,
      completedAt: report.completedAt,
      totalDurationMs: report.totalDurationMs,
      totalCost: report.totalCost,
      totalTokens: report.totalTokens,
      phases: report.phases.map((p) => ({
        name: p.name,
        results: p.results.map((r) => ({
          agentId: r.agentId,
          agentLabel: r.agentLabel,
          status: r.status,
          output: r.output,
          tokensUsed: r.tokensUsed,
          durationMs: r.durationMs,
          cost: r.cost,
        })),
        durationMs: p.durationMs,
      })),
      status: report.status,
    });

    return report;
  } finally {
    activeExecutions.delete(sessionId);
  }
}
