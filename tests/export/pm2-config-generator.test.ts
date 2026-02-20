import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { generatePm2Config } from '@/export/pm2-config-generator';
import { generateSystemBundle } from '@/export/bundle-generator';
import type { SystemBundle } from '@/export/types';
import type { NodeData } from '@/types/core';
import mockCanvas from '../fixtures/mock-canvas.json';

const nodes = mockCanvas.nodes as unknown as Node<NodeData>[];
const edges = mockCanvas.edges as unknown as Edge[];

function createBundle(
  overrides: Partial<SystemBundle['manifest']> = {},
): SystemBundle {
  const bundle = generateSystemBundle(nodes, edges, {
    name: 'Research Pipeline',
    version: '1.0.0',
  });
  bundle.manifest = { ...bundle.manifest, ...overrides };
  return bundle;
}

describe('generatePm2Config', () => {
  const bundle = createBundle();
  const ecosystem = generatePm2Config(bundle);

  it('produces one PM2 app per agent', () => {
    expect(ecosystem.apps).toHaveLength(3);
  });

  it('each app name is prefixed with the system slug', () => {
    for (const app of ecosystem.apps) {
      expect(app.name).toMatch(/^research-pipeline--/);
    }
  });

  it('each app has a script pointing to openclaw-runner', () => {
    for (const app of ecosystem.apps) {
      expect(app.script).toContain('openclaw-runner');
    }
  });

  it('each app has args referencing an agent config path', () => {
    for (const app of ecosystem.apps) {
      expect(app.args).toBeDefined();
      expect(app.args!.length).toBeGreaterThan(0);
      expect(app.args![0]).toMatch(/^agents\/.+\/CLAUDE\.md$/);
    }
  });

  it('each app has a cwd scoped to the system slug', () => {
    for (const app of ecosystem.apps) {
      expect(app.cwd).toBe('./research-pipeline');
    }
  });

  it('each app sets NODE_ENV in env', () => {
    for (const app of ecosystem.apps) {
      expect(app.env).toBeDefined();
      expect(app.env!.NODE_ENV).toBe('production');
    }
  });

  it('each app sets AGENT_NAME and AGENT_ROLE in env', () => {
    for (const app of ecosystem.apps) {
      expect(app.env!.AGENT_NAME).toBeTruthy();
      expect(app.env!.AGENT_ROLE).toBeTruthy();
    }
  });

  it('sets MODEL env var from agent config', () => {
    const plannerApp = ecosystem.apps.find((a) =>
      a.name.includes('planner'),
    );
    expect(plannerApp).toBeDefined();
    expect(plannerApp!.env!.MODEL).toBe('claude-sonnet-4-5-20250929');

    const writerApp = ecosystem.apps.find((a) => a.name.includes('writer'));
    expect(writerApp).toBeDefined();
    expect(writerApp!.env!.MODEL).toBe('gpt-4o');
  });

  it('maps provider to correct API_KEY_ENV_VAR', () => {
    const plannerApp = ecosystem.apps.find((a) =>
      a.name.includes('planner'),
    );
    expect(plannerApp!.env!.API_KEY_ENV_VAR).toBe('ANTHROPIC_API_KEY');

    const writerApp = ecosystem.apps.find((a) => a.name.includes('writer'));
    expect(writerApp!.env!.API_KEY_ENV_VAR).toBe('OPENAI_API_KEY');
  });

  it('sets default resource limits', () => {
    for (const app of ecosystem.apps) {
      expect(app.max_memory_restart).toBe('512M');
      expect(app.autorestart).toBe(true);
      expect(app.max_restarts).toBe(10);
      expect(app.restart_delay).toBe(3000);
    }
  });

  it('omits cron_restart for non-cron trigger patterns', () => {
    for (const app of ecosystem.apps) {
      expect(app.cron_restart).toBeUndefined();
    }
  });

  it('adds cron_restart when trigger pattern is cron', () => {
    const cronBundle = createBundle({ triggerPattern: 'cron' });
    const cronEcosystem = generatePm2Config(cronBundle);
    for (const app of cronEcosystem.apps) {
      expect(app.cron_restart).toBeDefined();
      expect(app.cron_restart).toMatch(/^\d/); // starts with a digit (cron expr)
    }
  });
});
