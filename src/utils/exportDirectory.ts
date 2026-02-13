import { Node, Edge } from 'reactflow';
import {
  DepartmentConfig,
  AgentPoolConfig,
  AgentConfig,
  MCPServerConfig,
  SkillConfig,
  HookConfig,
  CommandConfig,
  DirectoryExport,
} from '../types/core';
import { getChildNodes, getNodesByType, slugify } from './exportHelpers';
import { generateClaudeMdExecutable } from './generateClaudeMdExecutable';

// Options for directory export
export interface DirectoryExportOptions {
  /** 'executable' produces a step-by-step protocol; 'documentary' produces an architecture overview */
  claudeMdFormat?: 'executable' | 'documentary';
}

// Generate MCP server JSON config
const generateMcpServerEntry = (node: Node): Record<string, unknown> => {
  const config = node.data.config as MCPServerConfig;
  const entry: Record<string, unknown> = {
    command: config.command || 'npx',
    args: config.args || [],
  };

  if (config.env && Object.keys(config.env).length > 0) {
    entry.env = config.env;
  }

  return entry;
};

// Generate full MCP configuration JSON
export const generateMcpJson = (nodes: Node[]): string => {
  const mcpNodes = getNodesByType(nodes, 'MCP_SERVER');
  if (mcpNodes.length === 0) return '';

  const mcpServers: Record<string, unknown> = {};

  mcpNodes.forEach(node => {
    const name = (node.data.config as MCPServerConfig).name || node.data.label;
    mcpServers[name] = generateMcpServerEntry(node);
  });

  return JSON.stringify({ mcpServers }, null, 2);
};

// Generate hooks configuration JSON
export const generateHooksJson = (nodes: Node[]): string => {
  const hookNodes = getNodesByType(nodes, 'HOOK');
  if (hookNodes.length === 0) return '';

  const hooks: Record<string, Record<string, unknown>[]> = {};

  hookNodes.forEach(node => {
    const config = node.data.config as HookConfig;
    const event = config.event || 'PostToolUse';

    if (!hooks[event]) {
      hooks[event] = [];
    }

    const hookEntry: Record<string, unknown> = {
      command: config.command || '',
    };

    if (config.matcher) {
      hookEntry.matcher = config.matcher;
    }

    if (config.timeout) {
      hookEntry.timeout = config.timeout;
    }

    hooks[event].push(hookEntry);
  });

  return JSON.stringify({ hooks }, null, 2);
};

// Generate settings.json
export const generateSettingsJson = (nodes: Node[]): string => {
  const agentNodes = getNodesByType(nodes, 'AGENT');
  const toolNodes = getNodesByType(nodes, 'TOOL');

  // Collect all unique tools from agents
  const allTools = new Set<string>();
  agentNodes.forEach(node => {
    const config = node.data.config as AgentConfig;
    (config.tools || []).forEach(tool => allTools.add(tool));
  });
  toolNodes.forEach(node => {
    allTools.add(node.data.label);
  });

  // Determine if any agent has bypass permissions
  const hasBypassPermissions = agentNodes.some(node => {
    const config = node.data.config as AgentConfig;
    return config.permissionMode === 'bypassPermissions';
  });

  const settings: Record<string, unknown> = {};

  if (allTools.size > 0) {
    settings.allowedTools = Array.from(allTools);
  }

  if (hasBypassPermissions) {
    settings.trustProjectClaude = true;
  }

  return Object.keys(settings).length > 0 ? JSON.stringify(settings, null, 2) : '';
};

// Helper to export nested config objects as YAML
const exportNestedConfig = (
  lines: string[],
  obj: Record<string, unknown>,
  indent: number
): void => {
  const spaces = ' '.repeat(indent);

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      exportNestedConfig(lines, value as Record<string, unknown>, indent + 2);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`${spaces}${key}: [${value.join(', ')}]`);
      }
    } else if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${spaces}${key}: |`);
      value.split('\n').forEach((line: string) => {
        lines.push(`${spaces}  ${line}`);
      });
    } else if (typeof value === 'string') {
      lines.push(`${spaces}${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  });
};

// Generate agent markdown file
export const generateAgentMarkdown = (
  agent: Node,
  pool?: Node,
  department?: Node
): string => {
  const config = agent.data.config as AgentConfig;
  const lines: string[] = ['---'];

  // Required fields
  lines.push(`name: ${config.name || agent.data.label}`);

  // Team/hierarchy
  if (department) {
    const deptConfig = department.data.config as DepartmentConfig;
    lines.push(`department: ${deptConfig.name || department.data.label}`);
  }

  if (pool) {
    const poolConfig = pool.data.config as AgentPoolConfig;
    lines.push(`pool: ${poolConfig.name || pool.data.label}`);
  }

  if (config.teamName) {
    lines.push(`team: ${config.teamName}`);
  }

  // Role & Category
  if (config.role) {
    lines.push(`role: ${config.role}`);
  }
  if (config.roleCategory) {
    lines.push(`roleCategory: ${config.roleCategory}`);
  }

  // Model configuration
  if (config.provider) {
    lines.push(`provider: ${config.provider}`);
  }
  if (config.model) {
    lines.push(`model: ${config.model}`);
  }
  if (config.temperature !== undefined && config.temperature !== 0.7) {
    lines.push(`temperature: ${config.temperature}`);
  }
  if (config.maxTokens !== undefined && config.maxTokens !== 4096) {
    lines.push(`maxTokens: ${config.maxTokens}`);
  }
  if (config.topP !== undefined && config.topP !== 1.0) {
    lines.push(`topP: ${config.topP}`);
  }
  // New model fields
  if (config.thinkingMode && config.thinkingMode !== 'none') {
    lines.push(`thinkingMode: ${config.thinkingMode}`);
  }
  if (config.contextWindow !== undefined && config.contextWindow !== 200000) {
    lines.push(`contextWindow: ${config.contextWindow}`);
  }
  if (config.reservedOutputTokens !== undefined && config.reservedOutputTokens !== 16000) {
    lines.push(`reservedOutputTokens: ${config.reservedOutputTokens}`);
  }

  // Capabilities
  if (config.tools && config.tools.length > 0) {
    lines.push(`tools: [${config.tools.join(', ')}]`);
  }
  if (config.skills && config.skills.length > 0) {
    lines.push(`skills: [${config.skills.join(', ')}]`);
  }
  if (config.mcps && config.mcps.length > 0) {
    lines.push(`mcps: [${config.mcps.join(', ')}]`);
  }
  if (config.commands && config.commands.length > 0) {
    lines.push(`commands: [${config.commands.join(', ')}]`);
  }

  // Capability configurations (when to use)
  if (config.capabilityConfig && Object.keys(config.capabilityConfig).length > 0) {
    // Skills config
    const skillConfigs = config.skills?.filter(s => config.capabilityConfig?.[s]?.whenToUse) || [];
    if (skillConfigs.length > 0) {
      lines.push('skillConfig:');
      skillConfigs.forEach(skill => {
        const cfg = config.capabilityConfig![skill];
        lines.push(`  ${skill}:`);
        if (cfg.whenToUse) {
          lines.push(`    whenToUse: "${cfg.whenToUse.replace(/"/g, '\\"')}"`);
        }
      });
    }

    // MCP configs
    const mcpConfigs = config.mcps?.filter(m => config.capabilityConfig?.[m]?.whenToUse) || [];
    if (mcpConfigs.length > 0) {
      lines.push('mcpConfig:');
      mcpConfigs.forEach(mcp => {
        const cfg = config.capabilityConfig![mcp];
        lines.push(`  ${mcp}:`);
        if (cfg.whenToUse) {
          lines.push(`    whenToUse: "${cfg.whenToUse.replace(/"/g, '\\"')}"`);
        }
      });
    }

    // Command configs
    const cmdConfigs = config.commands?.filter(c => config.capabilityConfig?.[c]?.whenToUse) || [];
    if (cmdConfigs.length > 0) {
      lines.push('commandConfig:');
      cmdConfigs.forEach(cmd => {
        const cfg = config.capabilityConfig![cmd];
        lines.push(`  ${cmd}:`);
        if (cfg.whenToUse) {
          lines.push(`    whenToUse: "${cfg.whenToUse.replace(/"/g, '\\"')}"`);
        }
      });
    }
  }

  // Permissions
  if (config.permissionMode && config.permissionMode !== 'default') {
    lines.push(`permissionMode: ${config.permissionMode}`);
  }
  if (config.disallowedTools && config.disallowedTools.length > 0) {
    lines.push(`disallowedTools: [${config.disallowedTools.join(', ')}]`);
  }
  if (config.fileAccessPatterns && config.fileAccessPatterns.length > 0) {
    lines.push(`fileAccessPatterns: [${config.fileAccessPatterns.join(', ')}]`);
  }
  if (config.requiresApprovalFor && config.requiresApprovalFor.length > 0) {
    lines.push(`requiresApprovalFor: [${config.requiresApprovalFor.join(', ')}]`);
  }

  // === EXTENDED CONFIGURATION SECTIONS ===

  // Guardrails
  if (config.guardrails && Object.keys(config.guardrails).length > 0) {
    lines.push('guardrails:');
    exportNestedConfig(lines, config.guardrails as Record<string, unknown>, 2);
  }

  // Observability
  if (config.observability && Object.keys(config.observability).length > 0) {
    lines.push('observability:');
    exportNestedConfig(lines, config.observability as Record<string, unknown>, 2);
  }

  // Memory & Context
  if (config.memory && Object.keys(config.memory).length > 0) {
    lines.push('memory:');
    exportNestedConfig(lines, config.memory as Record<string, unknown>, 2);
  }

  // Sub-Agent Config (coordinator only)
  if (config.subAgentConfig && Object.keys(config.subAgentConfig).length > 0) {
    lines.push('subAgentConfig:');
    exportNestedConfig(lines, config.subAgentConfig as Record<string, unknown>, 2);
  }

  // PAL Orchestration (coordinator only)
  if (config.palConfig && Object.keys(config.palConfig).length > 0) {
    lines.push('palConfig:');
    exportNestedConfig(lines, config.palConfig as Record<string, unknown>, 2);
  }

  // Delegation (coordinator + team)
  if (config.delegation && Object.keys(config.delegation).length > 0) {
    lines.push('delegation:');
    exportNestedConfig(lines, config.delegation as Record<string, unknown>, 2);
  }

  // Execution (executor role)
  if (config.execution && Object.keys(config.execution).length > 0) {
    lines.push('execution:');
    exportNestedConfig(lines, config.execution as Record<string, unknown>, 2);
  }

  // Monitoring (continuous category)
  if (config.monitoring && Object.keys(config.monitoring).length > 0) {
    lines.push('monitoring:');
    exportNestedConfig(lines, config.monitoring as Record<string, unknown>, 2);
  }

  // Description (multiline)
  if (config.description) {
    lines.push('description: |');
    config.description.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  // Failover
  if (config.failoverChain && config.failoverChain.length > 0) {
    lines.push(`failoverChain: [${config.failoverChain.join(', ')}]`);
  }

  lines.push('---');

  // System prompt
  if (config.systemPrompt) {
    lines.push('');
    lines.push('## System Prompt');
    lines.push('');
    lines.push(config.systemPrompt);
  }

  return lines.join('\n');
};

// Generate skill markdown file
export const generateSkillMarkdown = (skill: Node): string => {
  const config = skill.data.config as SkillConfig;
  const lines: string[] = ['---'];

  lines.push(`name: ${config.name || skill.data.label}`);

  if (config.description) {
    lines.push('description: |');
    config.description.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  if (config.triggers) {
    if (config.triggers.keywords && config.triggers.keywords.length > 0) {
      lines.push(`keywords: [${config.triggers.keywords.join(', ')}]`);
    }
    if (config.triggers.filePatterns && config.triggers.filePatterns.length > 0) {
      lines.push(`filePatterns: [${config.triggers.filePatterns.join(', ')}]`);
    }
    if (config.triggers.commands && config.triggers.commands.length > 0) {
      lines.push(`commands: [${config.triggers.commands.join(', ')}]`);
    }
  }

  if (config.priority !== undefined) {
    lines.push(`priority: ${config.priority}`);
  }

  if (config.maxTokens !== undefined) {
    lines.push(`maxTokens: ${config.maxTokens}`);
  }

  if (config.autoActivate !== undefined) {
    lines.push(`autoActivate: ${config.autoActivate}`);
  }

  lines.push('---');

  // Content
  if (config.content) {
    lines.push('');
    lines.push(config.content);
  }

  return lines.join('\n');
};

// Generate command markdown file
export const generateCommandMarkdown = (command: Node): string => {
  const config = command.data.config as CommandConfig;
  const lines: string[] = ['---'];

  lines.push(`name: ${config.name || command.data.label}`);

  if (config.description) {
    lines.push('description: |');
    config.description.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  if (config.department) {
    lines.push(`department: ${config.department}`);
  }

  if (config.agent) {
    lines.push(`agent: ${config.agent}`);
  }

  if (config.pools && config.pools.length > 0) {
    lines.push(`pools: [${config.pools.join(', ')}]`);
  }

  if (config.outputFormat) {
    lines.push(`outputFormat: ${config.outputFormat}`);
  }

  if (config.requiresApproval !== undefined) {
    lines.push(`requiresApproval: ${config.requiresApproval}`);
  }

  lines.push('---');

  // Content
  if (config.content) {
    lines.push('');
    lines.push(config.content);
  }

  return lines.join('\n');
};

// Generate CLAUDE.md overview
export const generateClaudeMd = (nodes: Node[], edges: Edge[], name: string = 'AI-OS Workflow'): string => {
  const departments = getNodesByType(nodes, 'DEPARTMENT');
  const pools = getNodesByType(nodes, 'AGENT_POOL');
  const agents = getNodesByType(nodes, 'AGENT');
  const skills = getNodesByType(nodes, 'SKILL');
  const mcpServers = getNodesByType(nodes, 'MCP_SERVER');
  const hooks = getNodesByType(nodes, 'HOOK');
  const commands = getNodesByType(nodes, 'COMMAND');

  const lines: string[] = [];
  lines.push(`# ${name}`);
  lines.push('');
  lines.push(`Generated by Visual Agent Builder on ${new Date().toLocaleDateString()}`);
  lines.push('');

  // Overview section
  lines.push('## Overview');
  lines.push('');
  lines.push('| Component | Count |');
  lines.push('|-----------|-------|');
  if (departments.length > 0) lines.push(`| Departments | ${departments.length} |`);
  if (pools.length > 0) lines.push(`| Agent Pools | ${pools.length} |`);
  lines.push(`| Agents | ${agents.length} |`);
  if (skills.length > 0) lines.push(`| Skills | ${skills.length} |`);
  if (mcpServers.length > 0) lines.push(`| MCP Servers | ${mcpServers.length} |`);
  if (hooks.length > 0) lines.push(`| Hooks | ${hooks.length} |`);
  if (commands.length > 0) lines.push(`| Commands | ${commands.length} |`);
  lines.push(`| Connections | ${edges.length} |`);
  lines.push('');

  // Architecture section
  if (departments.length > 0) {
    lines.push('## Architecture');
    lines.push('');

    departments.forEach(dept => {
      const deptConfig = dept.data.config as DepartmentConfig;
      lines.push(`### ${deptConfig.name || dept.data.label}`);
      if (deptConfig.description) {
        lines.push('');
        lines.push(deptConfig.description);
      }
      lines.push('');

      // Find pools in this department
      const deptPools = getChildNodes(dept.id, nodes).filter(n => n.data.type === 'AGENT_POOL');
      if (deptPools.length > 0) {
        lines.push('**Agent Pools:**');
        deptPools.forEach(pool => {
          const poolConfig = pool.data.config as AgentPoolConfig;
          const poolAgents = getChildNodes(pool.id, nodes).filter(n => n.data.type === 'AGENT');
          lines.push(`- **${poolConfig.name || pool.data.label}** (${poolAgents.length} agents)`);
          if (poolConfig.scaling) {
            lines.push(`  - Scaling: ${poolConfig.scaling.minInstances}-${poolConfig.scaling.maxInstances} instances`);
          }
        });
        lines.push('');
      }
    });
  }

  // Agents section
  if (agents.length > 0) {
    lines.push('## Agents');
    lines.push('');

    agents.forEach(agent => {
      const config = agent.data.config as AgentConfig;
      lines.push(`### ${config.name || agent.data.label}`);
      if (config.description) {
        lines.push('');
        lines.push(config.description);
      }
      lines.push('');
      lines.push('| Property | Value |');
      lines.push('|----------|-------|');
      if (config.role) lines.push(`| Role | ${config.role} |`);
      if (config.model) lines.push(`| Model | ${config.model} |`);
      if (config.tools && config.tools.length > 0) {
        lines.push(`| Tools | ${config.tools.join(', ')} |`);
      }
      lines.push('');

      // Show connections
      const outgoing = edges.filter(e => e.source === agent.id);
      const incoming = edges.filter(e => e.target === agent.id);
      if (outgoing.length > 0 || incoming.length > 0) {
        lines.push('**Connections:**');
        outgoing.forEach(edge => {
          const target = nodes.find(n => n.id === edge.target);
          if (target) lines.push(`- -> ${target.data.label} (${edge.type || 'data'})`);
        });
        incoming.forEach(edge => {
          const source = nodes.find(n => n.id === edge.source);
          if (source) lines.push(`- <- ${source.data.label} (${edge.type || 'data'})`);
        });
        lines.push('');
      }
    });
  }

  // MCP Servers section
  if (mcpServers.length > 0) {
    lines.push('## MCP Servers');
    lines.push('');
    lines.push('See `.claude/mcp.json` for full configuration.');
    lines.push('');
    mcpServers.forEach(mcp => {
      const config = mcp.data.config as MCPServerConfig;
      lines.push(`- **${config.name || mcp.data.label}**: \`${config.command}\``);
    });
    lines.push('');
  }

  // Skills section
  if (skills.length > 0) {
    lines.push('## Skills');
    lines.push('');
    skills.forEach(skill => {
      const config = skill.data.config as SkillConfig;
      lines.push(`- **${config.name || skill.data.label}**`);
      if (config.description) {
        lines.push(`  ${config.description.split('\n')[0]}`);
      }
    });
    lines.push('');
  }

  return lines.join('\n');
};

// Main function to generate directory export structure
export const generateDirectoryExport = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'AI-OS Workflow',
  options: DirectoryExportOptions = {}
): DirectoryExport => {
  const { claudeMdFormat = 'executable' } = options;

  const files: DirectoryExport = {
    'CLAUDE.md': claudeMdFormat === 'executable'
      ? generateClaudeMdExecutable(nodes, edges, name)
      : generateClaudeMd(nodes, edges, name),
  };

  // Generate .claude/mcp.json if MCP servers exist
  const mcpJson = generateMcpJson(nodes);
  if (mcpJson) {
    files['.claude/mcp.json'] = mcpJson;
  }

  // Generate .claude/settings.json if needed
  const settingsJson = generateSettingsJson(nodes);
  if (settingsJson) {
    files['.claude/settings.json'] = settingsJson;
  }

  // Generate .claude/hooks/hooks.json if hooks exist
  const hooksJson = generateHooksJson(nodes);
  if (hooksJson) {
    files['.claude/hooks/hooks.json'] = hooksJson;
  }

  // Generate agent files organized by hierarchy
  const departments = getNodesByType(nodes, 'DEPARTMENT');
  const pools = getNodesByType(nodes, 'AGENT_POOL');
  const agents = getNodesByType(nodes, 'AGENT');

  agents.forEach(agent => {
    // Find parent pool and department
    const pool = pools.find(p => agent.parentId === p.id);
    const department = pool ? departments.find(d => pool.parentId === d.id) : undefined;

    // Build path (using slugify for consistency with executable CLAUDE.md references)
    let path = 'agents/';
    if (department) {
      const deptConfig = department.data.config as DepartmentConfig;
      path += `${slugify(deptConfig.name || department.data.label)}/`;
    }
    if (pool) {
      const poolConfig = pool.data.config as AgentPoolConfig;
      path += `${slugify(poolConfig.name || pool.data.label)}/`;
    }
    const agentConfig = agent.data.config as AgentConfig;
    path += `${slugify(agentConfig.name || agent.data.label)}.md`;

    files[path] = generateAgentMarkdown(agent, pool, department);
  });

  // Generate skill files
  const skills = getNodesByType(nodes, 'SKILL');
  skills.forEach(skill => {
    const config = skill.data.config as SkillConfig;
    const skillName = slugify(config.name || skill.data.label);
    files[`skills/${skillName}/SKILL.md`] = generateSkillMarkdown(skill);
  });

  // Generate command files
  const commands = getNodesByType(nodes, 'COMMAND');
  commands.forEach(command => {
    const config = command.data.config as CommandConfig;
    const commandName = slugify(config.name || command.data.label);
    files[`commands/${commandName}.md`] = generateCommandMarkdown(command);
  });

  return files;
};
