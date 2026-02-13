import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import {
  scanInventory,
  INVENTORY_ROOT,
  buildSearchIndex,
  searchInventory,
  FlattenedItem,
} from '../services/inventory';
import { initSocketEmitter, TypedSocketServer } from '../socket/emitter';
import { setupSocketHandlers } from '../socket/handlers';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../shared/socket-events';
import { initializeSandbox } from '../mcp/sandbox-mcp';
import { loadPersistedLayout } from '../mcp/canvas-mcp';
import { startSkillWatcher, capabilityRegistry } from '../watcher/skill-watcher';
import { createSupervisorAgent } from '../agents/supervisor';
import { getSession } from '../socket/handlers';
import { getPoolStatus } from '../lib/anthropic-client';
import { analyzeWorkflow, analyzeNodeConfig } from '../services/configuration-analyzer';

const app = express();
const httpServer = createServer(app);
const PORT = 3001;

// Initialize Socket.io with CORS
const io: TypedSocketServer = new SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

// Initialize socket emitter and handlers
initSocketEmitter(io);
setupSocketHandlers(io);

// Cache for search index
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

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Visual Agent Builder API');
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await scanInventory();
    // Wrap in an object if the frontend expects a specific structure,
    // or return the array directly.
    // The previous frontend expected { category: items[] }.
    // We will return { root: items[] } or just the array and update frontend.
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.get('/api/component-content', async (req, res) => {
  const filePath = req.query.path as string;

  if (!filePath) {
    return res.status(400).json({ error: 'path query parameter is required' });
  }

  // Security: Ensure the requested path is within the inventory root
  const normalizedPath = path.resolve(filePath);
  if (!normalizedPath.startsWith(INVENTORY_ROOT)) {
    return res.status(403).json({ error: 'Access denied: path outside inventory root' });
  }

  try {
    const content = await fs.readFile(normalizedPath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/inventory/search', async (req, res) => {
  try {
    const { q, types, repos, categories, buckets, subcategories, limit, offset } = req.query;

    // Parse comma-separated filter values
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
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Error searching inventory:', error);
    res.status(500).json({ error: 'Failed to search inventory' });
  }
});

// Bucket counts endpoint for landing view
app.get('/api/inventory/bucket-counts', async (req, res) => {
  try {
    const index = await getSearchIndex();

    // Count items per bucket
    const counts: Record<string, number> = {};
    for (const item of index) {
      for (const bucket of item.buckets) {
        counts[bucket] = (counts[bucket] || 0) + 1;
      }
    }

    res.json({ counts });
  } catch (error) {
    console.error('Error fetching bucket counts:', error);
    res.status(500).json({ error: 'Failed to fetch bucket counts' });
  }
});

// API endpoint to get registered capabilities
app.get('/api/capabilities', (req, res) => {
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
});

// Chat endpoint - Alternative to Socket.io for sending messages
// Note: Socket.io (session:message event) is preferred for real-time updates
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({
      error: 'Missing required fields: message and sessionId',
    });
  }

  try {
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: `Session ${sessionId} not found. Start a session via Socket.io first.`,
      });
    }

    // Create supervisor and process message
    const supervisor = createSupervisorAgent(sessionId);
    await supervisor.processMessage(message, session);

    res.json({
      success: true,
      sessionId,
      message: 'Message processed. Check Socket.io for real-time updates.',
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Configuration wizard endpoints
app.post('/api/configure-workflow', async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) {
      return res.status(400).json({ error: 'nodes and edges are required' });
    }
    const analysis = analyzeWorkflow(nodes, edges);
    res.json(analysis);
  } catch (error) {
    console.error('[Configure] Workflow scan error:', error);
    res.status(500).json({ error: 'Failed to analyze workflow' });
  }
});

app.post('/api/configure-node', async (req, res) => {
  try {
    const { node, workflowContext } = req.body;
    if (!node) {
      return res.status(400).json({ error: 'node is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const suggestion = await analyzeNodeConfig(
      node,
      workflowContext || { nodeCount: 1, edgeCount: 0, connectedNodes: [], workflowName: 'Workflow' },
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'result', suggestion })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[Configure] Node analysis error:', error);
    // If headers already sent (streaming started), send error as SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to analyze node configuration' });
    }
  }
});

// Health check endpoint with pool status
app.get('/api/health', (req, res) => {
  const poolStatus = getPoolStatus();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    pools: poolStatus,
  });
});

// Initialize sandbox and start server
async function startServer() {
  try {
    // Initialize sandbox directory structure
    await initializeSandbox();

    // Load persisted canvas layout (if any)
    await loadPersistedLayout();

    // Start skill hot-reload watcher
    await startSkillWatcher();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Socket.io enabled for real-time canvas updates`);
      console.log(`Skill hot-reload watcher active`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
