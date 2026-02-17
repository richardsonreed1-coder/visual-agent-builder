// =============================================================================
// Compile Fixer Prompt
// Takes all missing requirements from the Configure Wizard and produces a
// structured, context-rich prompt for an AI agent to resolve them.
// =============================================================================

import type { MissingRequirement } from '../../shared/configure-types';

interface WorkflowContext {
  nodeCount: number;
  nodes: Array<{ id: string; label: string; type: string }>;
}

/**
 * Compiles all missing requirements into a structured prompt with:
 * - Auto-fixable items grouped by node (with node IDs for targeted patches)
 * - User-provided values (manual items where the user supplied a value)
 * - Manual items grouped by node
 * - Explicit batching instructions to minimize iterations
 */
export function compileFixerPrompt(
  requirements: MissingRequirement[],
  workflowContext: WorkflowContext,
  userValues?: Map<number, string>
): string {
  const autoFixable = requirements.filter(
    (r) => (r.category || 'manual') === 'auto_fixable'
  );
  const manual = requirements.filter(
    (r) => (r.category || 'manual') === 'manual'
  );

  // Separate manual items with user-provided values from those without
  const userProvided: Array<{ req: MissingRequirement; value: string }> = [];
  const manualWithoutValues: MissingRequirement[] = [];

  manual.forEach((req) => {
    const globalIndex = requirements.indexOf(req);
    const value = userValues?.get(globalIndex);
    if (value && value.trim()) {
      userProvided.push({ req, value: value.trim() });
    } else {
      manualWithoutValues.push(req);
    }
  });

  // Group requirements by node for efficient patching
  const nodeGroups = new Map<
    string,
    {
      nodeId: string;
      label: string;
      type: string;
      autoFixes: Array<{ description: string; solution: string }>;
      manualFixes: Array<{ description: string; solution: string }>;
    }
  >();

  for (const req of requirements) {
    const nodeId = req.nodeId || 'unknown';
    const nodeLabel = req.nodeLabel || 'Unknown Node';

    if (!nodeGroups.has(nodeLabel)) {
      const node = workflowContext.nodes.find((n) => n.id === nodeId);
      nodeGroups.set(nodeLabel, {
        nodeId,
        label: nodeLabel,
        type: node?.type || 'UNKNOWN',
        autoFixes: [],
        manualFixes: [],
      });
    }

    const group = nodeGroups.get(nodeLabel)!;
    const entry = { description: req.description, solution: req.solution };

    if ((req.category || 'manual') === 'auto_fixable') {
      group.autoFixes.push(entry);
    } else {
      group.manualFixes.push(entry);
    }
  }

  // Assemble the prompt
  const sections: string[] = [];

  sections.push(
    `Fix ${requirements.length} configuration issues across ${workflowContext.nodeCount} workflow nodes. ` +
    `${autoFixable.length} are auto-fixable, ${userProvided.length} have user-provided values, ${manualWithoutValues.length} require manual action.\n`
  );

  sections.push(`IMPORTANT: Batch ALL file operations. Create the fixes/ directory and config-patches.json in ONE tool call batch. Do NOT create one file per tool call.\n`);

  // Auto-fixable section grouped by node
  if (autoFixable.length > 0) {
    sections.push(`## Auto-Fixable Items (${autoFixable.length} total) — write ALL to fixes/config-patches.json\n`);
    sections.push(`Output format: JSON object keyed by node label → config patch object.\n`);

    for (const [label, group] of nodeGroups) {
      if (group.autoFixes.length === 0) continue;
      sections.push(`### ${label} (nodeId: ${group.nodeId})`);
      for (const fix of group.autoFixes) {
        sections.push(`- ${fix.description}`);
        sections.push(`  → ${fix.solution}`);
      }
      sections.push('');
    }
  }

  // User-provided values section — these should be written to config files / .env
  if (userProvided.length > 0) {
    sections.push(`## User-Provided Values (${userProvided.length} total) — write these into the appropriate config files or .env\n`);
    sections.push(`The user has provided the following values. Write them into the correct locations (e.g., .env file, config JSON, etc.) and include them in fixes/config-patches.json.\n`);

    for (const { req, value } of userProvided) {
      const nodeLabel = req.nodeLabel || 'Unknown Node';
      sections.push(`- **${nodeLabel}**: ${req.description}`);
      sections.push(`  Value: \`${value}\``);
      sections.push(`  → ${req.solution}`);
    }
    sections.push('');
  }

  // Manual section grouped by node (only items without user-provided values)
  if (manualWithoutValues.length > 0) {
    sections.push(`## Manual Items (${manualWithoutValues.length} total) — write to fixes/manual-instructions.md\n`);

    for (const [label, group] of nodeGroups) {
      if (group.manualFixes.length === 0) continue;
      // Filter to only include manual fixes that don't have user-provided values
      const remainingFixes = group.manualFixes.filter((fix) =>
        manualWithoutValues.some(
          (req) => req.description === fix.description && req.solution === fix.solution
        )
      );
      if (remainingFixes.length === 0) continue;
      sections.push(`### ${label}`);
      for (const fix of remainingFixes) {
        sections.push(`- ${fix.description}`);
        sections.push(`  → ${fix.solution}`);
      }
      sections.push('');
    }
  }

  // Execution plan
  sections.push(`## Execution Plan
Step 1: Create "fixes/" directory AND "fixes/config-patches.json" with ALL auto-fix patches in ONE batch of tool calls.
Step 2: Create any supporting config files (RSS feeds, schemas, scan configs) AND "fixes/manual-instructions.md" in ONE batch.
Step 3: Output a brief summary report — what was fixed automatically vs what needs manual action.

Do NOT create individual markdown files per agent. Put everything in config-patches.json.
Do NOT verify each file individually — batch the verifications if needed.
Aim to finish in 3-5 iterations total.`);

  return sections.join('\n');
}
