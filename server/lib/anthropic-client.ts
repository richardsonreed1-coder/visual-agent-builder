// =============================================================================
// Smart Anthropic Client with Multi-Workspace Failover
// =============================================================================
// Strategy: A → B → B (Primary → Backup + Same Model → Backup + Emergency Model)
//
// This eliminates 429 Rate Limit downtime by:
// 1. First trying the Primary workspace with preferred model
// 2. If rate-limited, switching to Backup workspace (fresh rate limit bucket)
// 3. If still limited, staying on Backup and downgrading to emergency model
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AgentRole = 'BUILDER' | 'ARCHITECT';

interface PoolConfig {
  primary: Anthropic | null;
  backup: Anthropic | null;
  models: {
    preferred: string;
    emergency: string;
  };
}

// -----------------------------------------------------------------------------
// Pool Configuration (Lazy initialization to handle missing env vars gracefully)
// -----------------------------------------------------------------------------

function createPools(): Record<AgentRole, PoolConfig> {
  return {
    BUILDER: {
      primary: process.env.BUILDER_KEY_PRIMARY
        ? new Anthropic({ apiKey: process.env.BUILDER_KEY_PRIMARY })
        : null,
      backup: process.env.BUILDER_KEY_BACKUP
        ? new Anthropic({ apiKey: process.env.BUILDER_KEY_BACKUP })
        : null,
      models: {
        preferred: 'claude-sonnet-4-5-20250929',    // Sonnet 4.5 - high intelligence
        emergency: 'claude-3-7-sonnet-20250219',    // Sonnet 3.7 - speed optimized
      },
    },
    ARCHITECT: {
      primary: process.env.ARCHITECT_KEY_PRIMARY
        ? new Anthropic({ apiKey: process.env.ARCHITECT_KEY_PRIMARY })
        : null,
      backup: process.env.ARCHITECT_KEY_BACKUP
        ? new Anthropic({ apiKey: process.env.ARCHITECT_KEY_BACKUP })
        : null,
      models: {
        preferred: 'claude-opus-4-5-20251101',     // Opus 4.5 - deep reasoning
        emergency: 'claude-sonnet-4-5-20250929',   // Sonnet 4.5 - fallback intelligence
      },
    },
  };
}

// Lazy-loaded pools
let _pools: Record<AgentRole, PoolConfig> | null = null;

function getPools(): Record<AgentRole, PoolConfig> {
  if (!_pools) {
    _pools = createPools();
  }
  return _pools;
}

// -----------------------------------------------------------------------------
// Smart Generate Function
// -----------------------------------------------------------------------------

/**
 * Execute a generation request with automatic Workspace Rotation.
 * Strategy: Primary → Backup(Preferred) → Backup(Emergency)
 *
 * @param role - 'BUILDER' or 'ARCHITECT'
 * @param system - System prompt for the model
 * @param messages - Array of message objects
 * @returns Promise<Anthropic.Message>
 */
export async function smartGenerate(
  role: AgentRole,
  system: string,
  messages: Anthropic.MessageParam[]
): Promise<Anthropic.Message> {
  const pools = getPools();
  const pool = pools[role];

  // Architect needs larger output buffer for JSON plans (16k vs 8k)
  const max_tokens = role === 'ARCHITECT' ? 16384 : 8192;

  // Validate we have at least one client
  if (!pool.primary && !pool.backup) {
    throw new Error(
      `[${role}] No API keys configured. Set ${role}_KEY_PRIMARY or ${role}_KEY_BACKUP in .env`
    );
  }

  // --- ATTEMPT 1: Primary Infrastructure ---
  if (pool.primary) {
    try {
      console.log(`[${role}] Attempting primary workspace with ${pool.models.preferred}...`);
      return await pool.primary.messages.create({
        model: pool.models.preferred,
        system,
        messages,
        max_tokens,
      });
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      // Only catch Rate Limits (429) or Overloaded (529).
      // Logic errors (400) or Auth errors (401) should crash immediately.
      if (error.status !== 429 && error.status !== 529) {
        throw err;
      }
      console.warn(
        `⚠️ [${role}] Primary workspace saturated (${error.status}). Rotating to backup...`
      );
    }
  }

  // --- ATTEMPT 2: Workspace Jump (Same Intelligence) ---
  // Switch to Backup Workspace, but KEEP the Preferred Model.
  if (pool.backup) {
    try {
      console.log(`[${role}] Attempting backup workspace with ${pool.models.preferred}...`);
      return await pool.backup.messages.create({
        model: pool.models.preferred,
        system,
        messages,
        max_tokens,
      });
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status !== 429 && error.status !== 529) {
        throw err;
      }
      console.warn(
        `🚨 [${role}] Preferred model exhausted globally (${error.status}). Downgrading intelligence...`
      );
    }

    // --- ATTEMPT 3: Emergency Fallback ---
    // Stay on Backup Workspace, switch to Emergency Model.
    console.log(`[${role}] Attempting backup workspace with emergency model ${pool.models.emergency}...`);
    return await pool.backup.messages.create({
      model: pool.models.emergency,
      system,
      messages,
      max_tokens,
    });
  }

  // If we only have primary and it failed, re-throw the last error
  throw new Error(`[${role}] All API attempts exhausted. Check your rate limits.`);
}

// -----------------------------------------------------------------------------
// Utility: Check Pool Status
// -----------------------------------------------------------------------------

/**
 * Returns the configuration status for debugging
 */
export function getPoolStatus(): Record<AgentRole, { primary: boolean; backup: boolean; models: { preferred: string; emergency: string } }> {
  const pools = getPools();
  return {
    BUILDER: {
      primary: !!pools.BUILDER.primary,
      backup: !!pools.BUILDER.backup,
      models: pools.BUILDER.models,
    },
    ARCHITECT: {
      primary: !!pools.ARCHITECT.primary,
      backup: !!pools.ARCHITECT.backup,
      models: pools.ARCHITECT.models,
    },
  };
}
