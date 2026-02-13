import { Node, Edge } from 'reactflow';
import { Workflow, Connection, EdgeType } from '../types/core';

export const generateWorkflowJson = (nodes: Node[], edges: Edge[], name: string = 'New Workflow'): Workflow => {
  // Build hierarchy map: containerId → { childIds, childLabels, containerType }
  const hierarchy: Record<string, { type: string; label: string; children: { id: string; type: string; label: string }[] }> = {};
  const containerTypes = new Set(['DEPARTMENT', 'AGENT_POOL']);

  for (const n of nodes) {
    if (containerTypes.has(n.data.type)) {
      const children = nodes
        .filter((child) => child.parentId === n.id)
        .map((child) => ({
          id: child.id,
          type: child.data.type as string,
          label: child.data.label as string || 'Untitled',
        }));

      hierarchy[n.id] = {
        type: n.data.type,
        label: n.data.label || 'Untitled',
        children,
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    name,
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.data.type,
      position: n.position,
      data: n.data,
      // Preserve React Flow hierarchy for container nodes (Department, Agent Pool)
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.style ? { style: { width: n.style.width as number | undefined, height: n.style.height as number | undefined } } : {}),
      ...((n as Record<string, unknown>).extent === 'parent' ? { extent: 'parent' as const } : {}),
      ...((n as Record<string, unknown>).expandParent === true ? { expandParent: true } : {}),
    })),
    edges: edges.map(e => {
        // Safe casting or validation logic
        // Phase 6.3 v4: Include ALL valid edge types (was missing delegation, failover, default)
        const type = (['data', 'control', 'event', 'delegation', 'failover', 'default'].includes(e.type || '') ? e.type : undefined) as EdgeType | undefined;

        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: type
        } as Connection;
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Explicit container hierarchy map for easy parsing
    ...(Object.keys(hierarchy).length > 0 ? {
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exportFormat: 'single-file' as const,
      },
      hierarchy,
    } : {}),
  };
};

// Generate YAML frontmatter for a single agent
const generateAgentYamlFrontmatter = (agent: Node): string => {
  const config = agent.data.config || {};
  const lines: string[] = ['---'];

  // Required fields
  lines.push(`name: ${agent.data.label || 'unnamed-agent'}`);

  // Description (multiline if present)
  if (config.description) {
    lines.push('description: |');
    config.description.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  // Tools array
  if (config.tools && config.tools.length > 0) {
    lines.push(`tools: [${config.tools.join(', ')}]`);
  }

  // Model
  if (config.model) {
    lines.push(`model: ${config.model}`);
  }

  // Permission Mode
  if (config.permissionMode && config.permissionMode !== 'default') {
    lines.push(`permissionMode: ${config.permissionMode}`);
  }

  // Skills array
  if (config.skills && config.skills.length > 0) {
    lines.push(`skills: [${config.skills.join(', ')}]`);
  }

  // MCPs array
  if (config.mcps && config.mcps.length > 0) {
    lines.push(`mcps: [${config.mcps.join(', ')}]`);
  }

  // Commands array
  if (config.commands && config.commands.length > 0) {
    lines.push(`commands: [${config.commands.join(', ')}]`);
  }

  // Team name
  if (config.teamName) {
    lines.push(`team: ${config.teamName}`);
  }

  // Role
  if (config.role) {
    lines.push(`role: ${config.role}`);
  }

  // Provider
  if (config.provider) {
    lines.push(`provider: ${config.provider}`);
  }

  // Temperature (only if not default)
  if (config.temperature !== undefined && config.temperature !== 0.7) {
    lines.push(`temperature: ${config.temperature}`);
  }

  // Max tokens (only if not default)
  if (config.maxTokens !== undefined && config.maxTokens !== 4096) {
    lines.push(`maxTokens: ${config.maxTokens}`);
  }

  lines.push('---');

  // System prompt after frontmatter
  if (config.systemPrompt) {
    lines.push('');
    lines.push(config.systemPrompt);
  }

  return lines.join('\n');
};

export const generateClaudeConfig = (nodes: Node[], edges: Edge[], name: string = 'Agent Workflow'): string => {
  // Group by type
  const agents = nodes.filter(n => n.data.type === 'AGENT');
  const skills = nodes.filter(n => n.data.type === 'SKILL');
  const tools = nodes.filter(n => n.data.type === 'TOOL');

  // If single agent, generate YAML frontmatter format
  if (agents.length === 1 && skills.length === 0 && tools.length === 0) {
    return generateAgentYamlFrontmatter(agents[0]);
  }

  // Multi-agent workflow: generate comprehensive markdown
  let config = `# ${name}\n\n`;
  config += `Generated by Visual Agent Builder on ${new Date().toLocaleDateString()}\n\n`;

  if (agents.length > 0) {
    config += `## Agents\n\n`;
    agents.forEach(agent => {
      config += `### ${agent.data.label}\n\n`;
      config += '```yaml\n';
      config += generateAgentYamlFrontmatter(agent);
      config += '\n```\n\n';

      // Find connections (Outbound)
      const outgoing = edges.filter(e => e.source === agent.id);
      if (outgoing.length > 0) {
        config += `**Connects To:**\n`;
        outgoing.forEach(edge => {
          const target = nodes.find(n => n.id === edge.target);
          if (target) config += `- ${target.data.label} (${target.data.type})\n`;
        });
        config += '\n';
      }
    });
  }

  if (skills.length > 0) {
    config += `## Skills\n\n`;
    skills.forEach(skill => {
      config += `- **${skill.data.label}**`;
      if (skill.data.config?.description) {
        config += `: ${skill.data.config.description}`;
      }
      config += '\n';
    });
    config += `\n`;
  }

  if (tools.length > 0) {
    config += `## Tools\n\n`;
    tools.forEach(tool => {
      config += `- **${tool.data.label}**`;
      if (tool.data.config?.description) {
        config += `: ${tool.data.config.description}`;
      }
      config += '\n';
    });
  }

  return config;
};

export const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};