import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import {
  scanInventory,
  getInventoryRoot,
  buildSearchIndex,
  searchInventory,
  FlattenedItem,
} from '../services/inventory';
import { initSocketEmitter, TypedSocketServer } from '../socket/emitter';
import { setupSocketHandlers, flushSessions } from '../socket/handlers';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../shared/socket-events';
import { initializeSandbox } from '../mcp/sandbox-mcp';
import { loadPersistedLayout } from '../mcp/canvas';
import { startSkillWatcher, capabilityRegistry } from '../watcher/skill-watcher';
import { createSupervisorAgent } from '../agents/supervisor';
import { getSession } from '../socket/handlers';
import { getPoolStatus } from '../lib/anthropic-client';
import { analyzeWorkflow, analyzeNodeConfig } from '../services/configuration-analyzer';

// Routes
import { systemsRouter } from '../routes/systems';

// Middleware
import { requestLogger } from './middleware/request-logger';
import { errorHandler, notFoundHandler, AppError } from './middleware/error-handler';
import {
  validateQuery,
  validateBody,
  componentContentQuerySchema,
  inventorySearchQuerySchema,
  capabilitiesQuerySchema,
  chatBodySchema,
  configureWorkflowBodySchema,
  configureNodeBodySchema,
} from './middleware/validation';

// =============================================================================
// Server Configuration
// =============================================================================

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);

// Allowed CORS origins (configurable via env)
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

// Initialize Socket.io with locked-down CORS
const io: TypedSocketServer = new SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// Initialize socket emitter and handlers
initSocketEmitter(io);
setupSocketHandlers(io);

// =============================================================================
// Middleware Stack
// =============================================================================

// Security headers
app.use(helmet());

// CORS — locked to known origins
app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting — general API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

// Stricter rate limit for AI-powered endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please try again later' },
});

// =============================================================================
// Search Index Cache
// =============================================================================

let searchIndex: FlattenedItem[] | null = null;
let searchIndexPromise: Promise<FlattenedItem[]> | null = null;

async function getSearchIndex(): Promise<FlattenedItem[]> {
  if (searchIndex) return searchIndex;
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = (async () => {
    const inventory = await scanInventory();
    searchIndex = buildSearchIndex(inventory);
    return searchIndex;
  })();

  return searchIndexPromise;
}

// =============================================================================
// Routes
// =============================================================================

app.get('/', (_req, res) => {
  res.json({ name: 'Visual Agent Builder API', status: 'running' });
});

// --- Inventory ---

app.get('/api/inventory', async (_req, res, next) => {
  try {
    const inventory = await scanInventory();
    res.json(inventory);
  } catch (error) {
    next(error);
  }
});

// --- Component Content (hardened path traversal protection) ---

app.get(
  '/api/component-content',
  validateQuery(componentContentQuerySchema),
  async (req, res, next) => {
    try {
      const filePath = req.query.path as string;
      const inventoryRoot = getInventoryRoot();

      // Reject null bytes
      if (filePath.includes('\0')) {
        throw new AppError(400, 'Invalid path');
      }

      // Resolve and normalize — always resolve relative to inventory root
      const normalizedPath = path.resolve(inventoryRoot, filePath);

      // Ensure the resolved path is within the inventory root
      if (!normalizedPath.startsWith(inventoryRoot + path.sep) && normalizedPath !== inventoryRoot) {
        throw new AppError(403, 'Access denied: path outside inventory root');
      }

      const content = await fs.readFile(normalizedPath, 'utf-8');
      res.json({ content });
    } catch (err) {
      if (err instanceof AppError) {
        return next(err);
      }
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return next(new AppError(404, 'File not found'));
      }
      next(err);
    }
  }
);

// --- Inventory Search ---

app.get(
  '/api/inventory/search',
  validateQuery(inventorySearchQuerySchema),
  async (req, res, next) => {
    try {
      const { q, types, repos, categories, buckets, subcategories, limit, offset } = req.query;

      const parseList = (val: unknown): string[] | undefined => {
        if (!val || typeof val !== 'string') return undefined;
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      };

      const index = await getSearchIndex();

      const result = searchInventory(
        index,
        typeof q === 'string' ? q : undefined,
        {
          types: parseList(types),
          repos: parseList(repos),
          categories: parseList(categories),
          buckets: parseList(buckets),
          subcategories: parseList(subcategories),
        },
        {
          limit: typeof limit === 'number' ? limit : 100,
          offset: typeof offset === 'number' ? offset : 0,
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// --- Bucket Counts ---

app.get('/api/inventory/bucket-counts', async (_req, res, next) => {
  try {
    const index = await getSearchIndex();

    const counts: Record<string, number> = {};
    for (const item of index) {
      for (const bucket of item.buckets) {
        counts[bucket] = (counts[bucket] || 0) + 1;
      }
    }

    res.json({ counts });
  } catch (error) {
    next(error);
  }
});

// --- Capabilities ---

app.get(
  '/api/capabilities',
  validateQuery(capabilitiesQuerySchema),
  (req, res) => {
    const type = req.query.type as string | undefined;
    const capabilities = type
      ? capabilityRegistry.getByType(type as 'skill' | 'hook' | 'command')
      : capabilityRegistry.getAll();

    res.json({
      count: capabilities.length,
      capabilities: capabilities.map((cap) => ({
        name: cap.name,
        type: cap.type,
        triggers: cap.triggers,
        loadedAt: cap.loadedAt,
      })),
    });
  }
);

// --- Chat (AI-rate-limited) ---

app.post(
  '/api/chat',
  aiLimiter,
  validateBody(chatBodySchema),
  async (req, res, next) => {
    try {
      const { message, sessionId } = req.body;

      const session = getSession(sessionId);
      if (!session) {
        throw new AppError(404, 'Session not found. Start a session via Socket.io first.');
      }

      const supervisor = createSupervisorAgent(sessionId);
      await supervisor.processMessage(message, session);

      res.json({
        success: true,
        sessionId,
        message: 'Message processed. Check Socket.io for real-time updates.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- Configure Workflow ---

app.post(
  '/api/configure-workflow',
  validateBody(configureWorkflowBodySchema),
  async (req, res, next) => {
    try {
      const { nodes, edges } = req.body;
      const analysis = analyzeWorkflow(nodes, edges);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
);

// --- Configure Node (SSE streaming, AI-rate-limited) ---

app.post(
  '/api/configure-node',
  aiLimiter,
  validateBody(configureNodeBodySchema),
  async (req, res) => {
    try {
      const { node, workflowContext } = req.body;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const suggestion = await analyzeNodeConfig(
        node,
        workflowContext || {
          nodeCount: 1,
          edgeCount: 0,
          connectedNodes: [],
          workflowName: 'Workflow',
        },
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'result', suggestion })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('[Configure] Node analysis error:', error);
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: 'Analysis failed' })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.status(500).json({ error: 'Failed to analyze node configuration' });
      }
    }
  }
);

// --- Health Check ---

app.get('/api/health', (_req, res) => {
  const poolStatus = getPoolStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pools: poolStatus,
  });
});

// --- Systems (deployment registry) ---

app.use('/api/systems', systemsRouter);

// =============================================================================
// Error Handling (must be after routes)
// =============================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// Graceful Shutdown
// =============================================================================

function gracefulShutdown(signal: string): void {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);

  // Flush session data to disk before exiting
  flushSessions();

  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    io.close(() => {
      console.log('[Server] Socket.io server closed');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Server Startup
// =============================================================================

async function startServer(): Promise<void> {
  try {
    await initializeSandbox();
    await loadPersistedLayout();
    await startSkillWatcher();

    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Socket.io enabled for real-time canvas updates`);
      console.log(`[Server] Skill hot-reload watcher active`);
      console.log(`[Server] CORS origins: ${CORS_ORIGINS.join(', ')}`);
      console.log(`[Server] Inventory root: ${getInventoryRoot()}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();

// Export for testing
export { app, httpServer };
