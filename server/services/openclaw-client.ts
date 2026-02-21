// =============================================================================
// OpenClaw Gateway Client
// Connects to the OpenClaw runtime gateway via WebSocket, subscribes to system
// execution events, persists logs to PostgreSQL, and streams output to Redis
// pub/sub for live dashboard consumption.
// =============================================================================

import WebSocket from 'ws';
import Redis from 'ioredis';
import { pool } from '../db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

import { OpenClawConnectionError } from '../../shared/errors';

export class OpenClawError extends OpenClawConnectionError {
  constructor(message: string, reason?: string, cause?: unknown) {
    super(reason ?? 'UNKNOWN', message, cause);
  }
}

/** Discriminated union for messages sent FROM the OpenClaw gateway. */
export type GatewayMessage =
  | ExecutionStartedMessage
  | ExecutionCompletedMessage
  | ExecutionFailedMessage
  | LogOutputMessage
  | PongMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | ErrorMessage;

interface ExecutionStartedMessage {
  type: 'execution:started';
  slug: string;
  executionId: string;
  triggeredBy: string;
  startedAt: string;
  phasesTotal: number;
}

interface ExecutionCompletedMessage {
  type: 'execution:completed';
  slug: string;
  executionId: string;
  phasesCompleted: number;
  phasesTotal: number;
  durationSeconds: number;
  costUsd: number;
  outputUrl?: string;
  outputType?: string;
  qaScores?: Record<string, number>;
  completedAt: string;
}

interface ExecutionFailedMessage {
  type: 'execution:failed';
  slug: string;
  executionId: string;
  error: string;
  phasesCompleted: number;
  phasesTotal: number;
  durationSeconds: number;
  completedAt: string;
}

interface LogOutputMessage {
  type: 'log';
  slug: string;
  executionId: string;
  output: string;
  stream: 'stdout' | 'stderr';
  timestamp: string;
}

interface PongMessage {
  type: 'pong';
}

interface SubscribedMessage {
  type: 'subscribed';
  slug: string;
}

interface UnsubscribedMessage {
  type: 'unsubscribed';
  slug: string;
}

interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

/** Messages sent TO the OpenClaw gateway. */
type ClientMessage =
  | { type: 'subscribe'; slug: string }
  | { type: 'unsubscribe'; slug: string }
  | { type: 'ping' };

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const PING_INTERVAL_MS = 30_000;
const REDIS_CHANNEL_PREFIX = 'openclaw:logs:';

// -----------------------------------------------------------------------------
// Module state
// -----------------------------------------------------------------------------

let ws: WebSocket | null = null;
let gatewayUrl: string | null = null;
let currentBackoffMs = INITIAL_BACKOFF_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let intentionalClose = false;

const subscribedSlugs = new Set<string>();

// Redis publisher — dedicated connection for pub/sub publishing.
// Lazy-initialized on first use to avoid connection when not needed.
let redisPublisher: Redis | null = null;

function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redisPublisher.connect().catch((err) => {
      console.error('[openclaw-client] Redis publisher connection failed:', err);
    });
  }
  return redisPublisher;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Connect to the OpenClaw gateway WebSocket endpoint.
 * Automatically handles reconnection with exponential backoff.
 */
export async function connectToGateway(url: string): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) {
    throw new OpenClawError('Already connected to gateway', 'already_connected');
  }

  gatewayUrl = url;
  intentionalClose = false;
  currentBackoffMs = INITIAL_BACKOFF_MS;

  return new Promise<void>((resolve, reject) => {
    try {
      ws = new WebSocket(url);
    } catch (err) {
      reject(new OpenClawError('Failed to create WebSocket', 'connect', err));
      return;
    }

    ws.once('open', () => {
      console.log(`[openclaw-client] Connected to gateway: ${url}`);
      currentBackoffMs = INITIAL_BACKOFF_MS;
      startPingInterval();
      // Re-subscribe to any previously subscribed systems after reconnect
      for (const slug of subscribedSlugs) {
        sendMessage({ type: 'subscribe', slug });
      }
      resolve();
    });

    ws.once('error', (err) => {
      reject(new OpenClawError('WebSocket connection error', 'connect', err));
    });

    ws.on('message', (data) => {
      handleMessage(data);
    });

    ws.on('close', (code, reason) => {
      console.log(`[openclaw-client] Connection closed: ${code} ${reason.toString()}`);
      stopPingInterval();
      if (!intentionalClose) {
        scheduleReconnect();
      }
    });

    ws.on('error', (err) => {
      // After initial connect, log errors instead of throwing
      console.error('[openclaw-client] WebSocket error:', err.message);
    });
  });
}

/**
 * Disconnect from the OpenClaw gateway and clean up resources.
 */
export async function disconnectFromGateway(): Promise<void> {
  intentionalClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  stopPingInterval();

  if (ws) {
    ws.removeAllListeners();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, 'Client disconnect');
    }
    ws = null;
  }

  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }

  subscribedSlugs.clear();
  gatewayUrl = null;
  console.log('[openclaw-client] Disconnected from gateway');
}

/**
 * Subscribe to execution events for a deployed system.
 * Events will be forwarded to PostgreSQL and Redis pub/sub automatically.
 */
export function subscribeToSystem(slug: string): void {
  subscribedSlugs.add(slug);
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage({ type: 'subscribe', slug });
    console.log(`[openclaw-client] Subscribed to system: ${slug}`);
  }
}

/**
 * Unsubscribe from execution events for a deployed system.
 */
export function unsubscribeFromSystem(slug: string): void {
  subscribedSlugs.delete(slug);
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage({ type: 'unsubscribe', slug });
    console.log(`[openclaw-client] Unsubscribed from system: ${slug}`);
  }
}

// -----------------------------------------------------------------------------
// Internal: Message handling
// -----------------------------------------------------------------------------

function handleMessage(data: WebSocket.Data): void {
  let msg: GatewayMessage;
  try {
    msg = JSON.parse(data.toString()) as GatewayMessage;
  } catch {
    console.error('[openclaw-client] Failed to parse gateway message:', data.toString().slice(0, 200));
    return;
  }

  switch (msg.type) {
    case 'execution:started':
      handleExecutionStarted(msg);
      break;
    case 'execution:completed':
      handleExecutionCompleted(msg);
      break;
    case 'execution:failed':
      handleExecutionFailed(msg);
      break;
    case 'log':
      handleLogOutput(msg);
      break;
    case 'pong':
      // Heartbeat acknowledged — nothing to do
      break;
    case 'subscribed':
      console.log(`[openclaw-client] Gateway confirmed subscription: ${msg.slug}`);
      break;
    case 'unsubscribed':
      console.log(`[openclaw-client] Gateway confirmed unsubscription: ${msg.slug}`);
      break;
    case 'error':
      console.error(`[openclaw-client] Gateway error [${msg.code}]: ${msg.message}`);
      break;
  }
}

async function handleExecutionStarted(msg: ExecutionStartedMessage): Promise<void> {
  try {
    const deploymentId = await resolveDeploymentId(msg.slug);
    if (!deploymentId) return;

    await pool.query(
      `INSERT INTO execution_logs (
         id, deployment_id, triggered_by, status,
         phases_total, started_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [msg.executionId, deploymentId, msg.triggeredBy, 'running', msg.phasesTotal, msg.startedAt]
    );

    publishLogEvent(msg.slug, {
      event: 'execution:started',
      executionId: msg.executionId,
      triggeredBy: msg.triggeredBy,
      timestamp: msg.startedAt,
    });
  } catch (err) {
    console.error('[openclaw-client] Failed to persist execution:started:', err);
  }
}

async function handleExecutionCompleted(msg: ExecutionCompletedMessage): Promise<void> {
  try {
    await pool.query(
      `UPDATE execution_logs SET
         status = $1,
         phases_completed = $2,
         phases_total = $3,
         duration_seconds = $4,
         cost_usd = $5,
         output_url = $6,
         output_type = $7,
         qa_scores = $8::jsonb,
         completed_at = $9
       WHERE id = $10`,
      [
        'completed',
        msg.phasesCompleted,
        msg.phasesTotal,
        msg.durationSeconds,
        msg.costUsd,
        msg.outputUrl ?? null,
        msg.outputType ?? null,
        msg.qaScores ? JSON.stringify(msg.qaScores) : null,
        msg.completedAt,
        msg.executionId,
      ]
    );

    publishLogEvent(msg.slug, {
      event: 'execution:completed',
      executionId: msg.executionId,
      durationSeconds: msg.durationSeconds,
      costUsd: msg.costUsd,
      timestamp: msg.completedAt,
    });
  } catch (err) {
    console.error('[openclaw-client] Failed to persist execution:completed:', err);
  }
}

async function handleExecutionFailed(msg: ExecutionFailedMessage): Promise<void> {
  try {
    await pool.query(
      `UPDATE execution_logs SET
         status = $1,
         phases_completed = $2,
         phases_total = $3,
         duration_seconds = $4,
         error_message = $5,
         completed_at = $6
       WHERE id = $7`,
      [
        'failed',
        msg.phasesCompleted,
        msg.phasesTotal,
        msg.durationSeconds,
        msg.error,
        msg.completedAt,
        msg.executionId,
      ]
    );

    publishLogEvent(msg.slug, {
      event: 'execution:failed',
      executionId: msg.executionId,
      error: msg.error,
      timestamp: msg.completedAt,
    });
  } catch (err) {
    console.error('[openclaw-client] Failed to persist execution:failed:', err);
  }
}

function handleLogOutput(msg: LogOutputMessage): void {
  publishLogEvent(msg.slug, {
    event: 'log',
    executionId: msg.executionId,
    output: msg.output,
    stream: msg.stream,
    timestamp: msg.timestamp,
  });
}

// -----------------------------------------------------------------------------
// Internal: Redis pub/sub
// -----------------------------------------------------------------------------

function publishLogEvent(slug: string, payload: Record<string, unknown>): void {
  try {
    const channel = `${REDIS_CHANNEL_PREFIX}${slug}`;
    getRedisPublisher().publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error(`[openclaw-client] Redis publish failed for ${slug}:`, err);
  }
}

// -----------------------------------------------------------------------------
// Internal: PostgreSQL helpers
// -----------------------------------------------------------------------------

/** Resolve a system slug to its deployment UUID. Returns null if not found. */
async function resolveDeploymentId(slug: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM deployments WHERE system_slug = $1 AND status != 'archived' LIMIT 1`,
    [slug]
  );
  if (rows.length === 0) {
    console.warn(`[openclaw-client] No active deployment found for slug: ${slug}`);
    return null;
  }
  return rows[0].id;
}

// -----------------------------------------------------------------------------
// Internal: WebSocket helpers
// -----------------------------------------------------------------------------

function sendMessage(msg: ClientMessage): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[openclaw-client] Cannot send — WebSocket not open');
    return;
  }
  ws.send(JSON.stringify(msg));
}

function startPingInterval(): void {
  stopPingInterval();
  pingTimer = setInterval(() => {
    sendMessage({ type: 'ping' });
  }, PING_INTERVAL_MS);
}

function stopPingInterval(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

// -----------------------------------------------------------------------------
// Internal: Reconnection with exponential backoff
// -----------------------------------------------------------------------------

function scheduleReconnect(): void {
  if (intentionalClose || !gatewayUrl) return;

  const jitter = Math.random() * currentBackoffMs * 0.3;
  const delayMs = Math.min(currentBackoffMs + jitter, MAX_BACKOFF_MS);

  console.log(`[openclaw-client] Reconnecting in ${Math.round(delayMs)}ms...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectToGateway(gatewayUrl!);
    } catch (err) {
      console.error('[openclaw-client] Reconnection attempt failed:', err);
      currentBackoffMs = Math.min(currentBackoffMs * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
      scheduleReconnect();
    }
  }, delayMs);
}
