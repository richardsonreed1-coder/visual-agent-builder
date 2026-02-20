import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { generateSystemBundle } from '@/export/bundle-generator';
import type { NodeData } from '@/types/core';
import mockCanvas from '../fixtures/mock-canvas.json';

const nodes = mockCanvas.nodes as unknown as Node<NodeData>[];
const edges = mockCanvas.edges as unknown as Edge[];

describe('generateSystemBundle', () => {
  const bundle = generateSystemBundle(nodes, edges, {
    name: 'Research Pipeline',
    description: 'A 3-agent research and writing pipeline',
    version: '1.0.0',
  });

  it('produces a manifest with correct node and edge counts', () => {
    expect(bundle.manifest.nodeCount).toBe(3);
    expect(bundle.manifest.edgeCount).toBe(2);
  });

  it('populates manifest identity fields', () => {
    expect(bundle.manifest.name).toBe('Research Pipeline');
    expect(bundle.manifest.slug).toBe('research-pipeline');
    expect(bundle.manifest.version).toBe('1.0.0');
    expect(bundle.manifest.description).toBe(
      'A 3-agent research and writing pipeline',
    );
  });

  it('extracts one AgentConfig per agent node', () => {
    const keys = Object.keys(bundle.agentConfigs);
    expect(keys).toHaveLength(3);
  });

  it('each AgentConfig has a model', () => {
    for (const config of Object.values(bundle.agentConfigs)) {
      expect(config.model).toBeTruthy();
      expect(typeof config.model).toBe('string');
    }
  });

  it('each AgentConfig has a system prompt', () => {
    for (const config of Object.values(bundle.agentConfigs)) {
      expect(config.systemPrompt).toBeTruthy();
      expect(config.systemPrompt!.length).toBeGreaterThan(0);
    }
  });

  it('each AgentConfig has a tools array', () => {
    for (const config of Object.values(bundle.agentConfigs)) {
      expect(Array.isArray(config.tools)).toBe(true);
      expect(config.tools.length).toBeGreaterThan(0);
    }
  });

  it('preserves specific agent config values', () => {
    const planner = bundle.agentConfigs['planner'];
    expect(planner).toBeDefined();
    expect(planner.name).toBe('Planner');
    expect(planner.role).toBe('orchestrator');
    expect(planner.provider).toBe('anthropic');
    expect(planner.model).toBe('claude-sonnet-4-5-20250929');
    expect(planner.tools).toEqual(['Read', 'Write', 'Bash']);

    const writer = bundle.agentConfigs['writer'];
    expect(writer).toBeDefined();
    expect(writer.provider).toBe('openai');
    expect(writer.model).toBe('gpt-4o');
  });

  it('generates a PM2 ecosystem with one app per agent', () => {
    expect(bundle.pm2Ecosystem.apps).toHaveLength(3);
  });

  it('sanitizes canvas JSON (strips transient properties)', () => {
    expect(bundle.canvasJson.nodes).toHaveLength(3);
    expect(bundle.canvasJson.edges).toHaveLength(2);
    for (const node of bundle.canvasJson.nodes) {
      expect(node).not.toHaveProperty('selected');
      expect(node).not.toHaveProperty('dragging');
    }
  });

  it('collects env vars for providers used', () => {
    expect(bundle.envExample).toHaveProperty('ANTHROPIC_API_KEY');
    expect(bundle.envExample).toHaveProperty('OPENAI_API_KEY');
  });

  it('sets createdAt as an ISO timestamp', () => {
    expect(bundle.createdAt).toBeTruthy();
    expect(() => new Date(bundle.createdAt)).not.toThrow();
  });
});
