import { Node } from 'reactflow';
import { SkillSchema } from '../types';
import { generateAgentSkillsFormat } from './agentskills';
import { generateSimpleFormat } from './simple';

/**
 * Generate skill markdown based on the selected schema format.
 */
export function generateSkillWithSchema(skill: Node, schema: SkillSchema): string {
  switch (schema) {
    case 'agentskills':
      return generateAgentSkillsFormat(skill);
    case 'simple':
      return generateSimpleFormat(skill);
    default:
      return generateSimpleFormat(skill);
  }
}

export { generateAgentSkillsFormat } from './agentskills';
export { generateSimpleFormat } from './simple';
