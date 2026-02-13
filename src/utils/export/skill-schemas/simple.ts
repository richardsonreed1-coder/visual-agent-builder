import { Node } from 'reactflow';
import { SkillConfig } from '../../../types/core';

/**
 * Generate simple format skill markdown.
 * Plain markdown with minimal metadata, suitable for prototyping.
 */
export function generateSimpleFormat(skill: Node): string {
  const config = skill.data.config as SkillConfig || {};
  const lines: string[] = [];

  // Title
  lines.push(`# ${config.name || skill.data.label}`);
  lines.push('');

  // Description
  if (config.description) {
    lines.push(config.description);
    lines.push('');
  }

  // When to Use section
  lines.push('## When to Use');
  lines.push('');
  if (config.whenToUse) {
    lines.push(config.whenToUse);
  } else if (config.triggers?.keywords && config.triggers.keywords.length > 0) {
    lines.push('Use this skill when working with:');
    config.triggers.keywords.forEach((keyword: string) => {
      lines.push(`- ${keyword}`);
    });
  } else {
    lines.push('Use this skill when the context is appropriate.');
  }
  lines.push('');

  // File Patterns section (if any)
  if (config.triggers?.filePatterns && config.triggers.filePatterns.length > 0) {
    lines.push('Triggered by files matching:');
    config.triggers.filePatterns.forEach((pattern: string) => {
      lines.push(`- \`${pattern}\``);
    });
    lines.push('');
  }

  // Instructions section
  lines.push('## Instructions');
  lines.push('');
  if (config.content) {
    lines.push(config.content);
  } else {
    lines.push('1. Analyze the request and context');
    lines.push('2. Apply the appropriate techniques');
    lines.push('3. Validate the results');
    lines.push('4. Provide clear output');
  }
  lines.push('');

  // Tools section (if any)
  if (config.tools && config.tools.length > 0) {
    lines.push('## Available Tools');
    lines.push('');
    config.tools.forEach((tool: string) => {
      lines.push(`- ${tool}`);
    });
    lines.push('');
  }

  // Output section
  lines.push('## Output');
  lines.push('');
  lines.push('Provide:');
  lines.push('- Clear and actionable results');
  lines.push('- Relevant context and explanations');
  lines.push('- Next steps when applicable');

  return lines.join('\n');
}
