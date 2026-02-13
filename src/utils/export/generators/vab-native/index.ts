import { Node } from 'reactflow';
import { ExportResult } from '../../types';
import { BaseExportGenerator } from '../base';
import {
  generateAgentMarkdown,
  generateMcpJson,
  generateHooksJson,
  generateSettingsJson,
  generateCommandMarkdown,
} from '../../../exportDirectory';
import { generateSkillWithSchema } from '../../skill-schemas';

/**
 * VAB Native (Claude Code) Export Generator.
 * Generates a .claude/ directory structure with markdown agents, skills, and JSON configs.
 */
export class VABNativeGenerator extends BaseExportGenerator {
  generate(): ExportResult {
    // Validate first
    if (!this.validate()) {
      return this.buildResult();
    }

    const options = this.config.frameworkOptions.vabNative!;

    // Generate CLAUDE.md (master document)
    this.addFile('CLAUDE.md', this.generateClaudeMd());

    // Generate README.md
    if (options.generateReadme) {
      this.addFile('README.md', this.generateReadme());
    }

    // Generate .claude/settings.json
    const settingsJson = generateSettingsJson(this.nodes);
    if (settingsJson) {
      this.addFile('.claude/settings.json', settingsJson);
    }

    // Generate .claude/mcp.json
    if (options.includeMcp) {
      const mcpJson = generateMcpJson(this.nodes);
      if (mcpJson) {
        this.addFile('.claude/mcp.json', mcpJson);
      }
    }

    // Generate .claude/hooks/hooks.json
    if (options.includeHooks) {
      const hooksJson = generateHooksJson(this.nodes);
      if (hooksJson) {
        this.addFile('.claude/hooks/hooks.json', hooksJson);
      }
    }

    // Generate agent files with hierarchy
    this.generateAgentFiles();

    // Generate skill files
    this.generateSkillFiles();

    // Generate command files
    if (options.includeCommands) {
      this.generateCommandFiles();
    }

    return this.buildResult();
  }

  private generateAgentFiles(): void {
    const agents = this.getNodesByType('AGENT');
    const pools = this.getNodesByType('AGENT_POOL');
    const departments = this.getNodesByType('DEPARTMENT');

    for (const agent of agents) {
      // Find parent pool and department
      const pool = pools.find((p) => agent.parentId === p.id);
      const department = pool
        ? departments.find((d) => pool.parentId === d.id)
        : undefined;

      const path = this.buildAgentPath(agent, pool, department);
      const content = generateAgentMarkdown(agent, pool, department);

      this.addFile(path, content);
    }
  }

  private generateSkillFiles(): void {
    const skills = this.getNodesByType('SKILL');

    for (const skill of skills) {
      const name = this.slugify(skill.data.config?.name || skill.data.label);
      const content = generateSkillWithSchema(skill, this.config.skillSchema);

      this.addFile(`skills/${name}/SKILL.md`, content);
    }
  }

  private generateCommandFiles(): void {
    const commands = this.getNodesByType('COMMAND');

    for (const command of commands) {
      const name = this.slugify(command.data.config?.name || command.data.label);
      const content = generateCommandMarkdown(command);

      this.addFile(`commands/${name}.md`, content);
    }
  }

  private buildAgentPath(agent: Node, pool?: Node, department?: Node): string {
    let path = 'agents/';

    if (department) {
      const deptName = this.slugify(
        department.data.config?.name || department.data.label
      );
      path += `${deptName}/`;
    }

    if (pool) {
      const poolName = this.slugify(pool.data.config?.name || pool.data.label);
      path += `${poolName}/`;
    }

    const agentName = this.slugify(
      agent.data.config?.name || agent.data.label
    );
    path += `${agentName}.md`;

    return path;
  }

  private generateClaudeMd(): string {
    const agents = this.getNodesByType('AGENT');
    const skills = this.getNodesByType('SKILL');
    const commands = this.getNodesByType('COMMAND');
    const mcps = this.getNodesByType('MCP_SERVER');

    const lines: string[] = [];

    // Header
    lines.push(`# ${this.config.name}`);
    lines.push('');
    if (this.config.description) {
      lines.push(`> ${this.config.description}`);
      lines.push('');
    }

    // Quick Start
    lines.push('## Quick Start');
    lines.push('');
    lines.push('```bash');
    lines.push(`cd ${this.slugify(this.config.name)}`);
    lines.push('claude --config .');
    lines.push('```');
    lines.push('');

    // Architecture Overview
    if (agents.length > 0) {
      lines.push('## Architecture Overview');
      lines.push('');
      lines.push('```mermaid');
      lines.push('graph TB');
      this.generateMermaidGraph(lines);
      lines.push('```');
      lines.push('');
    }

    // Agents table
    if (agents.length > 0) {
      lines.push('## Agents');
      lines.push('');
      lines.push('| Agent | Role | Model | Tools |');
      lines.push('|-------|------|-------|-------|');
      for (const agent of agents) {
        const config = agent.data.config || {};
        const name = config.name || agent.data.label;
        const role = config.role || 'solo';
        const model = config.model || 'claude-sonnet-4-20250514';
        const tools = (config.tools || []).slice(0, 3).join(', ') || '-';
        lines.push(`| ${name} | ${role} | ${model} | ${tools} |`);
      }
      lines.push('');
    }

    // Skills section
    if (skills.length > 0) {
      lines.push('## Skills');
      lines.push('');
      lines.push('| Skill | Description |');
      lines.push('|-------|-------------|');
      for (const skill of skills) {
        const config = skill.data.config || {};
        const name = config.name || skill.data.label;
        const desc = config.description?.slice(0, 50) || '';
        lines.push(`| [${name}](skills/${this.slugify(name)}/SKILL.md) | ${desc} |`);
      }
      lines.push('');
    }

    // Commands section
    if (commands.length > 0) {
      lines.push('## Available Commands');
      lines.push('');
      lines.push('| Command | Description |');
      lines.push('|---------|-------------|');
      for (const command of commands) {
        const config = command.data.config || {};
        const name = config.name || command.data.label;
        const desc = config.description?.slice(0, 50) || '';
        lines.push(`| \`/${this.slugify(name)}\` | ${desc} |`);
      }
      lines.push('');
    }

    // MCP Servers section
    if (mcps.length > 0) {
      lines.push('## MCP Servers');
      lines.push('');
      lines.push('| Server | Description |');
      lines.push('|--------|-------------|');
      for (const mcp of mcps) {
        const config = mcp.data.config || {};
        const name = config.name || mcp.data.label;
        const desc = config.description?.slice(0, 50) || '';
        lines.push(`| ${name} | ${desc} |`);
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by Visual Agent Builder v${this.config.version} on ${this.formatDate()}*`);

    return lines.join('\n');
  }

  private generateMermaidGraph(lines: string[]): void {
    const agents = this.getNodesByType('AGENT');
    const departments = this.getNodesByType('DEPARTMENT');
    const pools = this.getNodesByType('AGENT_POOL');

    // Generate subgraphs for departments
    for (const dept of departments) {
      const deptName = this.slugify(dept.data.config?.name || dept.data.label);
      const deptLabel = dept.data.config?.name || dept.data.label;
      lines.push(`    subgraph ${deptName}["${deptLabel}"]`);

      // Find pools in this department
      const deptPools = pools.filter((p) => p.parentId === dept.id);
      for (const pool of deptPools) {
        const poolAgents = agents.filter((a) => a.parentId === pool.id);
        for (const agent of poolAgents) {
          const agentId = this.slugify(agent.data.config?.name || agent.data.label);
          const agentLabel = agent.data.config?.name || agent.data.label;
          lines.push(`        ${agentId}[${agentLabel}]`);
        }
      }

      lines.push('    end');
    }

    // Generate standalone agents (not in departments)
    const standaloneAgents = agents.filter((a) => {
      if (!a.parentId) return true;
      const parent = this.nodes.find((n) => n.id === a.parentId);
      if (!parent) return true;
      return parent.data.type !== 'AGENT_POOL' && parent.data.type !== 'DEPARTMENT';
    });

    for (const agent of standaloneAgents) {
      const agentId = this.slugify(agent.data.config?.name || agent.data.label);
      const agentLabel = agent.data.config?.name || agent.data.label;
      lines.push(`    ${agentId}[${agentLabel}]`);
    }

    // Generate edges
    for (const edge of this.edges) {
      const source = this.nodes.find((n) => n.id === edge.source);
      const target = this.nodes.find((n) => n.id === edge.target);
      if (source?.data.type === 'AGENT' && target?.data.type === 'AGENT') {
        const sourceId = this.slugify(source.data.config?.name || source.data.label);
        const targetId = this.slugify(target.data.config?.name || target.data.label);
        const edgeType = edge.data?.edgeType || 'data';
        const arrow = edgeType === 'delegation' ? '==>' : '-->';
        lines.push(`    ${sourceId} ${arrow} ${targetId}`);
      }
    }
  }

  private generateReadme(): string {
    const lines: string[] = [];

    lines.push(`# ${this.config.name}`);
    lines.push('');
    if (this.config.description) {
      lines.push(this.config.description);
      lines.push('');
    }

    lines.push('## Setup');
    lines.push('');
    lines.push('1. Ensure you have Claude Code CLI installed');
    lines.push('2. Set your API key: `export ANTHROPIC_API_KEY=your-key`');
    lines.push('3. Run: `claude --config .`');
    lines.push('');

    lines.push('## Structure');
    lines.push('');
    lines.push('```');
    lines.push('.');
    lines.push('├── CLAUDE.md              # Master orchestration document');
    lines.push('├── README.md              # This file');
    lines.push('├── .claude/');
    lines.push('│   ├── settings.json      # Global settings');
    lines.push('│   ├── mcp.json           # MCP server configs');
    lines.push('│   └── hooks/');
    lines.push('│       └── hooks.json     # Event hooks');
    lines.push('├── agents/                # Agent definitions');
    lines.push('├── skills/                # Skill definitions');
    lines.push('└── commands/              # Command definitions');
    lines.push('```');
    lines.push('');

    lines.push('## Environment Variables');
    lines.push('');
    lines.push('```bash');
    lines.push('# Required');
    lines.push('ANTHROPIC_API_KEY=your-api-key');
    lines.push('');
    lines.push('# Optional (for MCP servers)');
    lines.push('GITHUB_TOKEN=your-github-token');
    lines.push('DATABASE_URL=postgres://...');
    lines.push('```');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push(`*Generated by Visual Agent Builder on ${this.formatDate()}*`);

    return lines.join('\n');
  }
}
