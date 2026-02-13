import { Node } from 'reactflow';
import { SkillConfig } from '../../../types/core';

/**
 * Generate AgentSkills.io format skill markdown.
 * Rich metadata with triggers, priorities, and auto-activation support.
 */
export function generateAgentSkillsFormat(skill: Node): string {
  const config = skill.data.config as SkillConfig || {};
  const lines: string[] = ['---'];

  // Identity section
  lines.push(`name: ${config.name || skill.data.label}`);
  lines.push(`displayName: ${config.name || skill.data.label}`);
  lines.push(`version: "1.0.0"`);

  if (config.description) {
    lines.push('description: |');
    config.description.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  // Triggers section
  if (config.triggers) {
    lines.push('');
    lines.push('# Triggers');
    lines.push('triggers:');

    if (config.triggers.keywords && config.triggers.keywords.length > 0) {
      lines.push('  keywords:');
      config.triggers.keywords.forEach((keyword: string) => {
        lines.push(`    - ${keyword}`);
      });
    }

    if (config.triggers.filePatterns && config.triggers.filePatterns.length > 0) {
      lines.push('  filePatterns:');
      config.triggers.filePatterns.forEach((pattern: string) => {
        lines.push(`    - "${pattern}"`);
      });
    }

    if (config.triggers.commands && config.triggers.commands.length > 0) {
      lines.push('  commands:');
      config.triggers.commands.forEach((cmd: string) => {
        lines.push(`    - ${cmd}`);
      });
    }

    if (config.triggers.contextPatterns && config.triggers.contextPatterns.length > 0) {
      lines.push('  contextPatterns:');
      config.triggers.contextPatterns.forEach((pattern: string) => {
        lines.push(`    - "${pattern}"`);
      });
    }
  }

  // Behavior section
  lines.push('');
  lines.push('# Behavior');

  if (config.whenToUse) {
    lines.push('whenToUse: |');
    config.whenToUse.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  if (config.whenNotToUse) {
    lines.push('whenNotToUse: |');
    config.whenNotToUse.split('\n').forEach((line: string) => {
      lines.push(`  ${line}`);
    });
  }

  // Configuration section
  lines.push('');
  lines.push('# Configuration');

  if (config.priority !== undefined) {
    lines.push(`priority: ${config.priority}`);
  } else {
    lines.push('priority: 5  # 1-10, higher = more likely to activate');
  }

  if (config.maxTokens !== undefined) {
    lines.push(`maxTokens: ${config.maxTokens}`);
  }

  if (config.autoActivate !== undefined) {
    lines.push(`autoActivate: ${config.autoActivate}`);
  } else {
    lines.push('autoActivate: true');
  }

  if (config.requiresConfirmation !== undefined) {
    lines.push(`requiresConfirmation: ${config.requiresConfirmation}`);
  } else {
    lines.push('requiresConfirmation: false');
  }

  // Dependencies section
  lines.push('');
  lines.push('# Dependencies');

  if (config.tools && config.tools.length > 0) {
    lines.push('tools:');
    config.tools.forEach((tool: string) => {
      lines.push(`  - ${tool}`);
    });
  }

  if (config.mcpServers && config.mcpServers.length > 0) {
    lines.push('mcpServers:');
    config.mcpServers.forEach((server: string) => {
      lines.push(`  - ${server}`);
    });
  }

  if (config.skills && config.skills.length > 0) {
    lines.push('skills:');
    config.skills.forEach((skill: string) => {
      lines.push(`  - ${skill}`);
    });
  }

  // Examples section
  if (config.examples && config.examples.length > 0) {
    lines.push('');
    lines.push('# Examples');
    lines.push('examples:');
    config.examples.forEach((example: { input: string; context?: string; expectedBehavior?: string }) => {
      lines.push(`  - input: "${example.input}"`);
      if (example.context) {
        lines.push(`    context: "${example.context}"`);
      }
      if (example.expectedBehavior) {
        lines.push(`    expectedBehavior: "${example.expectedBehavior}"`);
      }
    });
  }

  // Metadata section
  lines.push('');
  lines.push('# Metadata');
  lines.push('author: "Visual Agent Builder"');
  lines.push(`createdAt: "${new Date().toISOString()}"`);
  lines.push(`updatedAt: "${new Date().toISOString()}"`);

  if (config.tags && config.tags.length > 0) {
    lines.push('tags:');
    config.tags.forEach((tag: string) => {
      lines.push(`  - ${tag}`);
    });
  }

  lines.push('---');

  // Content section (after frontmatter)
  lines.push('');
  lines.push(`# ${config.name || skill.data.label}`);
  lines.push('');

  if (config.description) {
    lines.push(config.description);
    lines.push('');
  }

  // Main content
  if (config.content) {
    lines.push(config.content);
  } else {
    // Generate default structure
    lines.push('## Capabilities');
    lines.push('');
    lines.push('1. **Primary Function** — Describe the main capability');
    lines.push('2. **Secondary Function** — Additional capabilities');
    lines.push('');
    lines.push('## Workflow');
    lines.push('');
    lines.push('1. Analyze the request');
    lines.push('2. Execute the appropriate actions');
    lines.push('3. Validate the results');
    lines.push('4. Return formatted output');
    lines.push('');
    lines.push('## Constraints');
    lines.push('');
    lines.push('- Follow best practices');
    lines.push('- Validate inputs before processing');
    lines.push('- Handle errors gracefully');
  }

  return lines.join('\n');
}
