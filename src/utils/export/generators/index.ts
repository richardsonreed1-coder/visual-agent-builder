import { Node, Edge } from 'reactflow';
import { WorkflowConfig, ExportFramework, ExportResult } from '../types';
import { BaseExportGenerator } from './base';
import { VABNativeGenerator } from './vab-native';
import { LangGraphGenerator } from './langgraph';
import { CrewAIGenerator } from './crewai';
import { AutoGenGenerator } from './autogen';

// Generator class type
type GeneratorConstructor = new (
  nodes: Node[],
  edges: Edge[],
  config: WorkflowConfig
) => BaseExportGenerator;

// Generator registry
const generators: Record<ExportFramework, GeneratorConstructor> = {
  'vab-native': VABNativeGenerator,
  langgraph: LangGraphGenerator,
  crewai: CrewAIGenerator,
  autogen: AutoGenGenerator,
};

/**
 * Generate export for specified framework.
 */
export function generateExport(
  nodes: Node[],
  edges: Edge[],
  config: WorkflowConfig
): ExportResult {
  const GeneratorClass = generators[config.framework];

  if (!GeneratorClass) {
    return {
      success: false,
      files: [],
      errors: [
        {
          code: 'UNKNOWN_FRAMEWORK',
          message: `Unknown framework: ${config.framework}`,
        },
      ],
      warnings: [],
      metadata: {
        framework: config.framework,
        skillSchema: config.skillSchema,
        exportedAt: new Date().toISOString(),
        fileCount: 0,
        totalSize: 0,
        version: config.version,
      },
    };
  }

  const generator = new GeneratorClass(nodes, edges, config);
  return generator.generate();
}

/**
 * Get available frameworks.
 */
export function getAvailableFrameworks(): ExportFramework[] {
  return Object.keys(generators) as ExportFramework[];
}

/**
 * Check if framework is supported.
 */
export function isFrameworkSupported(framework: string): framework is ExportFramework {
  return framework in generators;
}

// Re-export for convenience
export { BaseExportGenerator } from './base';
export { VABNativeGenerator } from './vab-native';
export { LangGraphGenerator } from './langgraph';
export { CrewAIGenerator } from './crewai';
export { AutoGenGenerator } from './autogen';
