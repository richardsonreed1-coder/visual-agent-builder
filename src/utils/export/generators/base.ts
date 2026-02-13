import { Node, Edge } from 'reactflow';
import {
  WorkflowConfig,
  ExportResult,
  ExportFile,
  ExportError,
  ExportWarning,
  ExportMetadata,
} from '../types';

/**
 * Base class for all export generators.
 * Provides common utilities and defines the interface for framework-specific generators.
 */
export abstract class BaseExportGenerator {
  protected nodes: Node[];
  protected edges: Edge[];
  protected config: WorkflowConfig;
  protected errors: ExportError[] = [];
  protected warnings: ExportWarning[] = [];
  protected files: ExportFile[] = [];

  constructor(nodes: Node[], edges: Edge[], config: WorkflowConfig) {
    this.nodes = nodes;
    this.edges = edges;
    this.config = config;
  }

  /**
   * Main export method - must be implemented by subclasses.
   */
  abstract generate(): ExportResult;

  /**
   * Pre-export validation - can be overridden by subclasses.
   */
  protected validate(): boolean {
    // Check for required nodes
    const agents = this.getNodesByType('AGENT');
    if (agents.length === 0) {
      this.errors.push({
        code: 'NO_AGENTS',
        message: 'Workflow must contain at least one agent',
      });
      return false;
    }

    // Validate agent configurations
    for (const agent of agents) {
      if (!agent.data.config?.name && !agent.data.label) {
        this.errors.push({
          code: 'MISSING_NAME',
          message: `Agent ${agent.id} is missing a name`,
          nodeId: agent.id,
        });
      }
    }

    return this.errors.length === 0;
  }

  /**
   * Get nodes by type.
   */
  protected getNodesByType(type: string): Node[] {
    return this.nodes.filter((n) => n.data.type === type);
  }

  /**
   * Get connected nodes.
   */
  protected getConnectedNodes(
    nodeId: string,
    direction: 'in' | 'out' | 'both' = 'both'
  ): Node[] {
    const connected: string[] = [];

    if (direction === 'in' || direction === 'both') {
      this.edges
        .filter((e) => e.target === nodeId)
        .forEach((e) => connected.push(e.source));
    }
    if (direction === 'out' || direction === 'both') {
      this.edges
        .filter((e) => e.source === nodeId)
        .forEach((e) => connected.push(e.target));
    }

    return this.nodes.filter((n) => connected.includes(n.id));
  }

  /**
   * Get parent node if exists.
   */
  protected getParentNode(nodeId: string): Node | undefined {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node?.parentId) {
      return this.nodes.find((n) => n.id === node.parentId);
    }
    return undefined;
  }

  /**
   * Get child nodes.
   */
  protected getChildNodes(parentId: string): Node[] {
    return this.nodes.filter((n) => n.parentId === parentId);
  }

  /**
   * Slugify string for filenames.
   */
  protected slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Add file to export.
   */
  protected addFile(path: string, content: string): void {
    this.files.push({ path, content });
  }

  /**
   * Add error.
   */
  protected addError(code: string, message: string, nodeId?: string): void {
    this.errors.push({ code, message, nodeId });
  }

  /**
   * Add warning.
   */
  protected addWarning(code: string, message: string, suggestion?: string): void {
    this.warnings.push({ code, message, suggestion });
  }

  /**
   * Build result object.
   */
  protected buildResult(): ExportResult {
    const metadata: ExportMetadata = {
      framework: this.config.framework,
      skillSchema: this.config.skillSchema,
      exportedAt: new Date().toISOString(),
      fileCount: this.files.length,
      totalSize: this.files.reduce((sum, f) => sum + f.content.length, 0),
      version: this.config.version,
    };

    return {
      success: this.errors.length === 0,
      files: this.files,
      errors: this.errors,
      warnings: this.warnings,
      metadata,
    };
  }

  /**
   * Get agent name from node.
   */
  protected getAgentName(node: Node): string {
    return node.data.config?.name || node.data.label || `agent-${node.id.slice(0, 8)}`;
  }

  /**
   * Get node description.
   */
  protected getDescription(node: Node): string {
    return node.data.config?.description || node.data.config?.systemPrompt?.slice(0, 100) || '';
  }

  /**
   * Format date for export.
   */
  protected formatDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Indent text by specified number of spaces.
   */
  protected indent(text: string, spaces: number): string {
    const prefix = ' '.repeat(spaces);
    return text
      .split('\n')
      .map((line) => prefix + line)
      .join('\n');
  }
}
