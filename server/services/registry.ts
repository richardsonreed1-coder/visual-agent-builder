// =============================================================================
// Deployment Registry Service
// =============================================================================

import { pool } from '../db';
import {
  SystemBundle,
  DeploymentRecord,
  DeploymentStatus,
} from '../types/registry';
import { encrypt, decrypt } from '../lib/crypto';

// -----------------------------------------------------------------------------
// Row → DeploymentRecord mapper
// -----------------------------------------------------------------------------

interface DeploymentRow {
  id: string;
  system_name: string;
  system_slug: string;
  manifest_json: unknown;
  canvas_json: unknown;
  openclaw_config: unknown;
  trigger_type: string;
  trigger_config: unknown;
  pm2_process_name: string;
  secrets_encrypted: string | null;
  status: string;
  deployed_at: string;
  created_at: string;
  updated_at: string;
}

function decryptSecrets(encrypted: string | null): Record<string, string> | null {
  if (!encrypted) return null;
  if (!process.env.ENCRYPTION_KEY) return null;
  try {
    return JSON.parse(decrypt(encrypted)) as Record<string, string>;
  } catch {
    console.warn('[registry] Failed to decrypt secrets — returning null');
    return null;
  }
}

function encryptSecrets(secrets: Record<string, string>): string | null {
  if (!process.env.ENCRYPTION_KEY) return null;
  if (Object.keys(secrets).length === 0) return null;
  return encrypt(JSON.stringify(secrets));
}

function rowToRecord(row: DeploymentRow): DeploymentRecord {
  return {
    id: row.id,
    systemName: row.system_name,
    systemSlug: row.system_slug,
    manifestJson: row.manifest_json as DeploymentRecord['manifestJson'],
    canvasJson: row.canvas_json,
    openclawConfig: row.openclaw_config,
    triggerType: row.trigger_type as DeploymentRecord['triggerType'],
    triggerConfig: row.trigger_config,
    pm2ProcessName: row.pm2_process_name,
    secretsDecrypted: decryptSecrets(row.secrets_encrypted),
    status: row.status as DeploymentStatus,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// -----------------------------------------------------------------------------
// Registry Functions
// -----------------------------------------------------------------------------

export async function registerSystem(
  bundle: SystemBundle
): Promise<DeploymentRecord> {
  const { manifest, canvasJson } = bundle;
  const pm2ProcessName = `autopilate-${manifest.slug}`;

  const encryptedSecrets = encryptSecrets(bundle.envExample);

  const { rows } = await pool.query<DeploymentRow>(
    `INSERT INTO deployments (
       system_name,
       system_slug,
       manifest_json,
       canvas_json,
       trigger_type,
       trigger_config,
       pm2_process_name,
       secrets_encrypted,
       status,
       deployed_at
     ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7, $8, $9, now())
     RETURNING *`,
    [
      manifest.name,
      manifest.slug,
      JSON.stringify(manifest),
      JSON.stringify(canvasJson),
      manifest.triggerPattern,
      JSON.stringify({}),
      pm2ProcessName,
      encryptedSecrets,
      'deployed',
    ]
  );

  return rowToRecord(rows[0]);
}

export async function getSystem(
  slug: string
): Promise<DeploymentRecord | null> {
  const { rows } = await pool.query<DeploymentRow>(
    `SELECT * FROM deployments WHERE system_slug = $1 AND status != 'archived'`,
    [slug]
  );

  if (rows.length === 0) return null;
  return rowToRecord(rows[0]);
}

export async function listSystems(): Promise<DeploymentRecord[]> {
  const { rows } = await pool.query<DeploymentRow>(
    `SELECT * FROM deployments WHERE status != 'archived' ORDER BY created_at DESC`
  );

  return rows.map(rowToRecord);
}

export async function updateSystemStatus(
  slug: string,
  status: string
): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE deployments SET status = $1, updated_at = now()
     WHERE system_slug = $2 AND status != 'archived'`,
    [status, slug]
  );

  if (rowCount === 0) {
    throw new SystemNotFoundError(slug);
  }
}

export async function archiveSystem(slug: string): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE deployments SET status = 'archived', updated_at = now()
     WHERE system_slug = $1 AND status != 'archived'`,
    [slug]
  );

  if (rowCount === 0) {
    throw new SystemNotFoundError(slug);
  }
}

// Import + re-export typed error from shared
import { SystemNotFoundError } from '../lib/errors';
export { SystemNotFoundError };
