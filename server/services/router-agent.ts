// =============================================================================
// Router Agent — Sits between OpenClaw messaging channels and the Systems
// Library. Classifies inbound messages into one of three actions:
//   1) Direct answer — simple question, respond without triggering a system
//   2) Clarify — message maps to a system but lacks required inputs
//   3) Trigger system — message clearly maps to a system with sufficient context
// =============================================================================

import type Anthropic from '@anthropic-ai/sdk';
import { smartGenerate } from '../lib/anthropic-client';
import { listSystems } from './registry';
import { matchSystem, type SystemMatchResult } from './system-matcher';
import { emitSessionMessage, emitSessionStateChange, emitExecutionLog } from '../socket/emitter';
import type { SystemManifest, DeploymentRecord } from '../types/registry';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RouterDecision =
  | { kind: 'direct-answer'; response: string }
  | { kind: 'clarify'; system: SystemManifest; missingInputs: string[]; question: string }
  | { kind: 'trigger'; system: SystemManifest; inputs: Record<string, string> };

interface GatheringState {
  system: SystemManifest;
  collectedInputs: Record<string, string>;
  remainingInputs: string[];
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class RouterError extends Error {
  constructor(
    message: string,
    public readonly step?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RouterError';
  }
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Confidence above which we proceed without clarification. */
const HIGH_CONFIDENCE_THRESHOLD = 0.75;

// -----------------------------------------------------------------------------
// Direct Answer via LLM (isolated for test mocking)
// -----------------------------------------------------------------------------

const DIRECT_ANSWER_SYSTEM_PROMPT = `You are a helpful assistant embedded in an AI agent orchestration platform called AUTOPILATE.
The user's message does not match any deployed system. Answer their question directly and concisely.
If you cannot help, say so politely and suggest they check available systems.`;

export async function generateDirectAnswer(message: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: message },
  ];

  const response = await smartGenerate(
    'BUILDER',
    DIRECT_ANSWER_SYSTEM_PROMPT,
    messages
  );

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

// -----------------------------------------------------------------------------
// Input Extraction via LLM (isolated for test mocking)
// -----------------------------------------------------------------------------

export async function extractInputsFromMessage(
  message: string,
  system: SystemManifest,
  alreadyCollected: Record<string, string>
): Promise<Record<string, string>> {
  const prompt = [
    `The user sent this message in the context of triggering the "${system.name}" system.`,
    `Already collected inputs: ${JSON.stringify(alreadyCollected)}`,
    `Still needed inputs: ${JSON.stringify(
      system.requiredInputs
        .filter((i) => i.required && !alreadyCollected[i.name])
        .map((i) => ({ name: i.name, type: i.type, description: i.description }))
    )}`,
    '',
    `USER MESSAGE: ${message}`,
    '',
    'Extract any input values the user provided. Return ONLY valid JSON mapping input names to extracted string values.',
    'If the message does not contain a value for an input, omit it from the JSON.',
    'Example: {"topic": "machine learning", "format": "blog post"}',
  ].join('\n');

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  const response = await smartGenerate(
    'BUILDER',
    'You extract structured inputs from natural language. Return ONLY valid JSON, no markdown fences.',
    messages
  );

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// Router Agent Class
// -----------------------------------------------------------------------------

export class RouterAgent {
  private gatheringState: GatheringState | null = null;

  constructor(private readonly sessionId: string) {}

  /**
   * Process an inbound message. Returns the routing decision taken.
   * Emits socket events as side effects for real-time UI updates.
   */
  async handleMessage(message: string): Promise<RouterDecision> {
    this.emitState('routing');
    this.emitLog(`[Router] Received message: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`);

    // If we're in the middle of gathering inputs for a system, continue that flow
    if (this.gatheringState) {
      return this.handleGatheringResponse(message);
    }

    // Fetch deployed systems and match
    const deployedSystems = await this.fetchDeployedManifests();
    const matchResult = await matchSystem(message, deployedSystems);

    return this.routeFromMatch(message, matchResult);
  }

  /** Reset any in-progress input gathering. */
  resetGatheringState(): void {
    this.gatheringState = null;
  }

  /** Check if the router is currently gathering inputs for a system. */
  isGathering(): boolean {
    return this.gatheringState !== null;
  }

  // ---------------------------------------------------------------------------
  // Private: Routing Logic
  // ---------------------------------------------------------------------------

  private async routeFromMatch(
    message: string,
    matchResult: SystemMatchResult
  ): Promise<RouterDecision> {
    // No match → direct answer
    if (!matchResult.system) {
      this.emitLog('[Router] No system match. Generating direct answer.');
      const response = await generateDirectAnswer(message);
      const decision: RouterDecision = { kind: 'direct-answer', response };
      this.emitRouterMessage(response);
      this.emitState('idle');
      return decision;
    }

    const { system, missingInputs } = matchResult;
    const requiredMissing = missingInputs.filter((name) =>
      system.requiredInputs.some((i) => i.name === name && i.required)
    );

    // High confidence + all required inputs present → trigger
    if (matchResult.confidence >= HIGH_CONFIDENCE_THRESHOLD && requiredMissing.length === 0) {
      this.emitLog(`[Router] Matched "${system.name}" (confidence: ${matchResult.confidence.toFixed(2)}). Triggering.`);
      const inputs = await extractInputsFromMessage(message, system, {});
      const decision: RouterDecision = { kind: 'trigger', system, inputs };
      this.emitRouterMessage(`Triggering system: **${system.name}**`);
      this.emitState('idle');
      return decision;
    }

    // Match found but missing inputs → enter clarify / gathering mode
    this.emitLog(
      `[Router] Matched "${system.name}" (confidence: ${matchResult.confidence.toFixed(2)}) but missing inputs: ${requiredMissing.join(', ')}`
    );

    // Collect any inputs already present in the message
    const partialInputs = await extractInputsFromMessage(message, system, {});
    const stillMissing = requiredMissing.filter((name) => !partialInputs[name]);

    if (stillMissing.length === 0) {
      // LLM found all inputs on second pass
      this.emitLog(`[Router] All inputs extracted on re-analysis. Triggering "${system.name}".`);
      const decision: RouterDecision = { kind: 'trigger', system, inputs: partialInputs };
      this.emitRouterMessage(`Triggering system: **${system.name}**`);
      this.emitState('idle');
      return decision;
    }

    // Enter gathering mode
    this.gatheringState = {
      system,
      collectedInputs: partialInputs,
      remainingInputs: stillMissing,
    };

    const question = this.buildClarifyQuestion(system, stillMissing);
    const decision: RouterDecision = {
      kind: 'clarify',
      system,
      missingInputs: stillMissing,
      question,
    };
    this.emitRouterMessage(question);
    this.emitState('idle');
    return decision;
  }

  private async handleGatheringResponse(message: string): Promise<RouterDecision> {
    const state = this.gatheringState!;

    const extracted = await extractInputsFromMessage(
      message,
      state.system,
      state.collectedInputs
    );

    // Merge newly extracted inputs
    Object.assign(state.collectedInputs, extracted);
    state.remainingInputs = state.remainingInputs.filter(
      (name) => !state.collectedInputs[name]
    );

    if (state.remainingInputs.length === 0) {
      // All inputs gathered — trigger
      this.emitLog(`[Router] All inputs collected for "${state.system.name}". Triggering.`);
      const decision: RouterDecision = {
        kind: 'trigger',
        system: state.system,
        inputs: state.collectedInputs,
      };
      this.emitRouterMessage(`Triggering system: **${state.system.name}**`);
      this.gatheringState = null;
      this.emitState('idle');
      return decision;
    }

    // Still missing some — ask again
    const question = this.buildClarifyQuestion(state.system, state.remainingInputs);
    const decision: RouterDecision = {
      kind: 'clarify',
      system: state.system,
      missingInputs: state.remainingInputs,
      question,
    };
    this.emitRouterMessage(question);
    this.emitState('idle');
    return decision;
  }

  // ---------------------------------------------------------------------------
  // Private: Helpers
  // ---------------------------------------------------------------------------

  private async fetchDeployedManifests(): Promise<SystemManifest[]> {
    try {
      const records: DeploymentRecord[] = await listSystems();
      return records
        .filter((r) => r.status === 'deployed')
        .map((r) => r.manifestJson);
    } catch (err) {
      throw new RouterError('Failed to fetch deployed systems', 'fetch-manifests', err);
    }
  }

  private buildClarifyQuestion(system: SystemManifest, missing: string[]): string {
    const inputDescriptions = missing.map((name) => {
      const input = system.requiredInputs.find((i) => i.name === name);
      return input
        ? `- **${input.name}** (${input.type}): ${input.description}`
        : `- **${name}**`;
    });

    return [
      `I can run **${system.name}** for you, but I need a bit more info:`,
      '',
      ...inputDescriptions,
      '',
      'Please provide the missing details.',
    ].join('\n');
  }

  private emitState(state: 'routing' | 'idle'): void {
    emitSessionStateChange({ sessionId: this.sessionId, state });
  }

  private emitRouterMessage(content: string): void {
    emitSessionMessage({
      sessionId: this.sessionId,
      message: {
        id: `router-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'system',
        content,
        timestamp: Date.now(),
        metadata: { intent: 'router' },
      },
    });
  }

  private emitLog(output: string): void {
    emitExecutionLog(this.sessionId, output, 'stdout', 'workflow');
  }
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createRouterAgent(sessionId: string): RouterAgent {
  return new RouterAgent(sessionId);
}
