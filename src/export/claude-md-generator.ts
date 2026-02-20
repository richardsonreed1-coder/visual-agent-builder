// =============================================================================
// Per-Agent CLAUDE.md Generator
// Converts an AgentConfig into an OpenClaw-compatible agent configuration file.
//
// Output sections: Agent Role, Tools, MCP Servers, Model, Memory, Constraints.
// =============================================================================

import {
  AgentConfig,
  MCPServerConfig,
  MemoryConfig,
  GuardrailsConfig,
  ExecutionConfig,
} from '@/types/core';

/**
 * Generate a per-agent CLAUDE.md from an AgentConfig.
 *
 * The output is a Markdown string with sections that OpenClaw reads as agent
 * configuration: Agent Role (system prompt), Tools (granted tools with
 * one-liner descriptions), MCP Servers (server names and connection details),
 * Model (model name and settings), Memory (memory configuration), and
 * Constraints (limits or rules).
 *
 * @param agentConfig  - The agent's full configuration
 * @param systemContext - Brief description of the overall system this agent belongs to
 */
export function generateClaudeMd(
  agentConfig: AgentConfig,
  systemContext: string,
): string {
  const sections: string[] = [];

  sections.push(buildHeader(agentConfig, systemContext));
  sections.push(buildAgentRoleSection(agentConfig, systemContext));
  sections.push(buildToolsSection(agentConfig));
  sections.push(buildMcpServersSection(agentConfig));
  sections.push(buildModelSection(agentConfig));
  sections.push(buildMemorySection(agentConfig.memory));
  sections.push(buildConstraintsSection(agentConfig));

  return sections.filter(Boolean).join('\n\n') + '\n';
}

// =============================================================================
// Section builders
// =============================================================================

function buildHeader(config: AgentConfig, systemContext: string): string {
  const lines: string[] = [];
  lines.push(`# ${config.name}`);
  lines.push('');

  if (config.description) {
    lines.push(`> ${config.description}`);
    lines.push('');
  }

  lines.push(`**System:** ${systemContext}`);
  lines.push(`**Role:** ${config.role}`);
  if (config.roleCategory) {
    lines.push(`**Category:** ${config.roleCategory}`);
  }
  if (config.department) {
    lines.push(`**Department:** ${config.department}`);
  }
  if (config.pool) {
    lines.push(`**Pool:** ${config.pool}`);
  }

  return lines.join('\n');
}

function buildAgentRoleSection(
  config: AgentConfig,
  systemContext: string,
): string {
  const lines: string[] = [];
  lines.push('## Agent Role');
  lines.push('');

  if (config.systemPrompt) {
    lines.push(config.systemPrompt);
  } else {
    lines.push(
      `You are ${config.name}, acting as ${config.role} in the ${systemContext} system.`,
    );
  }

  return lines.join('\n');
}

function buildToolsSection(config: AgentConfig): string {
  const hasTools = config.tools.length > 0;
  const hasSkills = config.skills.length > 0;
  const hasCommands = config.commands.length > 0;

  if (!hasTools && !hasSkills && !hasCommands) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Tools');
  lines.push('');

  if (hasTools) {
    for (const tool of config.tools) {
      const hint = config.capabilityConfig?.[tool]?.whenToUse;
      lines.push(`- **${tool}**${hint ? ` — ${hint}` : ''}`);
    }
  }

  if (hasSkills) {
    lines.push('');
    lines.push('**Skills:**');
    for (const skill of config.skills) {
      const hint = config.capabilityConfig?.[skill]?.whenToUse;
      lines.push(`- **${skill}**${hint ? ` — ${hint}` : ''}`);
    }
  }

  if (hasCommands) {
    lines.push('');
    lines.push('**Commands:**');
    for (const cmd of config.commands) {
      const hint = config.capabilityConfig?.[cmd]?.whenToUse;
      lines.push(`- \`/${cmd}\`${hint ? ` — ${hint}` : ''}`);
    }
  }

  if (config.disallowedTools && config.disallowedTools.length > 0) {
    lines.push('');
    lines.push('**Disallowed:**');
    for (const tool of config.disallowedTools) {
      lines.push(`- ${tool}`);
    }
  }

  return lines.join('\n');
}

function buildMcpServersSection(config: AgentConfig): string {
  // Resolve MCP configs from the agent config's embedded references
  const mcpConfigs = resolveMcpConfigs(config);

  if (mcpConfigs.length === 0 && config.mcps.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## MCP Servers');
  lines.push('');

  if (mcpConfigs.length > 0) {
    for (const mcp of mcpConfigs) {
      lines.push(`### ${mcp.name}`);
      if (mcp.description) {
        lines.push(mcp.description);
      }
      lines.push('');
      lines.push(
        `- **Command:** \`${mcp.command}${mcp.args?.length ? ' ' + mcp.args.join(' ') : ''}\``,
      );
      if (mcp.env && Object.keys(mcp.env).length > 0) {
        lines.push(
          `- **Environment:** ${Object.keys(mcp.env).map((k) => `\`${k}\``).join(', ')}`,
        );
      }
      if (mcp.auth) {
        lines.push(
          `- **Auth:** ${mcp.auth.type}${mcp.auth.envVar ? ` (via \`${mcp.auth.envVar}\`)` : ''}`,
        );
      }
      if (mcp.tools && mcp.tools.length > 0) {
        lines.push(
          `- **Available tools:** ${mcp.tools.join(', ')}`,
        );
      }
      if (mcp.resources && mcp.resources.length > 0) {
        lines.push(`- **Resources:** ${mcp.resources.join(', ')}`);
      }
      if (mcp.timeout) {
        lines.push(`- **Timeout:** ${mcp.timeout}ms`);
      }
      if (mcp.rateLimit) {
        const parts: string[] = [];
        if (mcp.rateLimit.requestsPerMinute) {
          parts.push(`${mcp.rateLimit.requestsPerMinute} req/min`);
        }
        if (mcp.rateLimit.tokensPerMinute) {
          parts.push(`${mcp.rateLimit.tokensPerMinute} tokens/min`);
        }
        if (parts.length > 0) {
          lines.push(`- **Rate limit:** ${parts.join(', ')}`);
        }
      }

      const hint = config.capabilityConfig?.[mcp.name]?.whenToUse;
      if (hint) {
        lines.push(`- **When to use:** ${hint}`);
      }

      lines.push('');
    }
  } else {
    // Fallback: list MCP names without resolved configs
    for (const mcpName of config.mcps) {
      const hint = config.capabilityConfig?.[mcpName]?.whenToUse;
      lines.push(`- **${mcpName}**${hint ? ` — ${hint}` : ''}`);
    }
  }

  return lines.join('\n');
}

function buildModelSection(config: AgentConfig): string {
  const lines: string[] = [];
  lines.push('## Model');
  lines.push('');
  lines.push(`- **Provider:** ${config.provider}`);
  lines.push(`- **Model:** ${config.model}`);

  if (config.temperature !== undefined) {
    lines.push(`- **Temperature:** ${config.temperature}`);
  }
  if (config.maxTokens !== undefined) {
    lines.push(`- **Max tokens:** ${config.maxTokens}`);
  }
  if (config.topP !== undefined) {
    lines.push(`- **Top-P:** ${config.topP}`);
  }
  if (config.thinkingMode && config.thinkingMode !== 'none') {
    lines.push(`- **Thinking mode:** ${config.thinkingMode}`);
  }
  if (config.contextWindow !== undefined) {
    lines.push(`- **Context window:** ${config.contextWindow}`);
  }
  if (config.reservedOutputTokens !== undefined) {
    lines.push(`- **Reserved output tokens:** ${config.reservedOutputTokens}`);
  }

  return lines.join('\n');
}

function buildMemorySection(memory?: MemoryConfig): string {
  if (!memory || Object.keys(memory).length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Memory');
  lines.push('');

  if (memory.contextPersistence) {
    lines.push(`- **Context persistence:** ${memory.contextPersistence}`);
  }
  if (memory.memoryType) {
    lines.push(`- **Memory type:** ${memory.memoryType}`);
  }
  if (memory.maxContextTokens !== undefined) {
    lines.push(`- **Max context tokens:** ${memory.maxContextTokens}`);
  }
  if (memory.summarizationThreshold !== undefined) {
    lines.push(`- **Summarization threshold:** ${memory.summarizationThreshold}`);
  }

  return lines.join('\n');
}

function buildConstraintsSection(config: AgentConfig): string {
  const items: string[] = [];

  // Permission mode (always emit — even 'default' is useful context for OpenClaw)
  items.push(`Permission mode: **${config.permissionMode}**`);

  // File access restrictions
  if (config.fileAccessPatterns && config.fileAccessPatterns.length > 0) {
    items.push(
      `File access restricted to: ${config.fileAccessPatterns.map((p) => `\`${p}\``).join(', ')}`,
    );
  }

  // Approval requirements
  if (config.requiresApprovalFor && config.requiresApprovalFor.length > 0) {
    items.push(
      `Requires approval for: ${config.requiresApprovalFor.join(', ')}`,
    );
  }

  // Guardrails
  appendGuardrailItems(items, config.guardrails);

  // Execution constraints
  appendExecutionItems(items, config.execution);

  // Failover chain
  if (config.failoverChain && config.failoverChain.length > 0) {
    items.push(`Failover chain: ${config.failoverChain.join(' → ')}`);
  }

  if (items.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Constraints');
  lines.push('');
  for (const item of items) {
    lines.push(`- ${item}`);
  }

  return lines.join('\n');
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract MCPServerConfig objects that are embedded inside the AgentConfig.
 * In the canvas, MCP servers can be stored as full config objects within the
 * agent's data when collected by the bundle generator. If the agent only has
 * string references (names), this returns an empty array and the caller
 * falls back to listing names.
 */
function resolveMcpConfigs(_config: AgentConfig): MCPServerConfig[] {
  // Since this generator receives only the AgentConfig (no canvas context),
  // we cannot resolve full MCPServerConfig objects here. Callers that need
  // rich details should resolve them upstream. Return empty to trigger the
  // name-only fallback.
  return [];
}

function appendGuardrailItems(
  items: string[],
  guardrails?: GuardrailsConfig,
): void {
  if (!guardrails || Object.keys(guardrails).length === 0) return;

  if (guardrails.tokenLimit !== undefined) {
    items.push(`Token limit: ${guardrails.tokenLimit} per session`);
  }
  if (guardrails.costCap !== undefined) {
    items.push(`Cost cap: $${guardrails.costCap} per session`);
  }
  if (guardrails.timeoutSeconds !== undefined) {
    items.push(`Timeout: ${guardrails.timeoutSeconds}s`);
  }
  if (guardrails.maxRetries !== undefined) {
    items.push(`Max retries: ${guardrails.maxRetries}`);
  }
  if (guardrails.contentFilters) {
    const filters: string[] = [];
    if (guardrails.contentFilters.profanity) filters.push('profanity');
    if (guardrails.contentFilters.pii) filters.push('PII');
    if (guardrails.contentFilters.injection) filters.push('injection');
    if (filters.length > 0) {
      items.push(`Content filters: ${filters.join(', ')}`);
    }
  }
}

function appendExecutionItems(
  items: string[],
  execution?: ExecutionConfig,
): void {
  if (!execution || Object.keys(execution).length === 0) return;

  if (execution.executionMode) {
    items.push(`Execution mode: ${execution.executionMode}`);
  }
  if (execution.retryPolicy) {
    const parts: string[] = [];
    if (execution.retryPolicy.maxRetries !== undefined) {
      parts.push(`max ${execution.retryPolicy.maxRetries} retries`);
    }
    if (execution.retryPolicy.backoffMs !== undefined) {
      parts.push(`${execution.retryPolicy.backoffMs}ms backoff`);
    }
    if (execution.retryPolicy.exponential) {
      parts.push('exponential');
    }
    if (parts.length > 0) {
      items.push(`Retry policy: ${parts.join(', ')}`);
    }
  }
  if (execution.checkpointing) {
    items.push('Checkpointing: enabled');
  }
  if (execution.rollbackOnFailure) {
    items.push('Rollback on failure: enabled');
  }
}
