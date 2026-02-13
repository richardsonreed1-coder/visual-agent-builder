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
 * - Auto-fixable checklist (things the agent should do immediately)
 * - Manual items checklist (instructions for the user)
 * - Node context (which nodes need what)
 * - Clear execution instructions
 */
export function compileFixerPrompt(
  requirements: MissingRequirement[],
  workflowContext: WorkflowContext
): string {
  const autoFixable = requirements.filter(
    (r) => (r.category || 'manual') === 'auto_fixable'
  );
  const manual = requirements.filter(
    (r) => (r.category || 'manual') === 'manual'
  );

  // Build node context — group requirements by node
  const nodeMap = new Map<string, { label: string; type: string; requirements: string[] }>();
  for (const req of requirements) {
    const nodeId = req.nodeId || 'unknown';
    const nodeLabel = req.nodeLabel || 'Unknown Node';
    if (!nodeMap.has(nodeId)) {
      const node = workflowContext.nodes.find((n) => n.id === nodeId);
      nodeMap.set(nodeId, {
        label: nodeLabel,
        type: node?.type || 'UNKNOWN',
        requirements: [],
      });
    }
    nodeMap.get(nodeId)!.requirements.push(req.description);
  }

  // Assemble the prompt
  const sections: string[] = [];

  sections.push(
    `You are a configuration fixer for a workflow with ${workflowContext.nodeCount} nodes. ` +
    `Your job is to resolve the following ${requirements.length} missing requirements. ` +
    `Work through each item systematically.`
  );

  // Auto-fixable section
  if (autoFixable.length > 0) {
    sections.push(`\n## Auto-Fixable Items (do these now)\n`);
    for (const req of autoFixable) {
      const nodeTag = req.nodeLabel ? ` [${req.nodeLabel}]` : '';
      sections.push(`- [ ] ${req.description}${nodeTag}`);
      sections.push(`      Solution: ${req.solution}`);
    }
  }

  // Manual section
  if (manual.length > 0) {
    sections.push(`\n## Manual Items (provide instructions for the user)\n`);
    for (const req of manual) {
      const nodeTag = req.nodeLabel ? ` [${req.nodeLabel}]` : '';
      sections.push(`- [ ] ${req.description}${nodeTag}`);
      sections.push(`      Instructions: ${req.solution}`);
    }
  }

  // Node context
  if (nodeMap.size > 0) {
    sections.push(`\n## Node Context\n`);
    for (const [, info] of nodeMap) {
      const reqList = info.requirements.join('; ');
      sections.push(`- ${info.label} (${info.type}): needs ${reqList}`);
    }
  }

  // Instructions
  sections.push(`
## Instructions
1. For auto-fixable items: Create the files, directories, configs, and boilerplate code needed. Use the sandbox tools available to you.
2. For manual items: Output clear, step-by-step instructions the user can follow to resolve each item themselves.
3. After completing all items, provide a summary report listing:
   - What was completed automatically
   - What still needs manual action from the user
   - Any additional recommendations`);

  return sections.join('\n');
}
