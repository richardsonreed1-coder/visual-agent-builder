// =============================================================================
// Socket.io Event Handlers
// Handles incoming events from connected clients
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import { TypedSocket, TypedSocketServer } from './emitter';
import { SessionMessage, CanvasEdgeUpdatePayload } from '../../shared/socket-events';
import { Session } from '../types/session';
import { createSupervisorAgent, SupervisorAgent } from '../agents/supervisor';
import { canvas_sync_from_client, canvasState, persistLayout } from '../mcp/canvas';
import { validateSystem } from '../services/runtime';
import { executeWorkflow, executeFixerAgent, stopExecution } from '../services/orchestrator-bridge';
import { emitExecutionLog } from './emitter';
import { getSessionStore, FileSessionStore } from '../services/session-store';

// File-backed session store — survives server restarts
const sessions: FileSessionStore = getSessionStore();

// Active supervisor agents per session
const supervisors = new Map<string, SupervisorAgent>();

// -----------------------------------------------------------------------------
// Helper: safely extract string/number/object from unknown values
// -----------------------------------------------------------------------------

interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  parentId?: string;
  data?: Record<string, unknown>;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, unknown>;
}

function asReactFlowNode(val: unknown): ReactFlowNode | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  if (typeof obj.id !== 'string') return null;
  return obj as unknown as ReactFlowNode;
}

function asReactFlowEdge(val: unknown): ReactFlowEdge | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  if (typeof obj.id !== 'string') return null;
  return obj as unknown as ReactFlowEdge;
}

// -----------------------------------------------------------------------------
// Session Management
// -----------------------------------------------------------------------------

function createSession(): Session {
  const sessionId = uuidv4();
  const session: Session = {
    id: sessionId,
    state: 'idle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    variables: {},
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function updateSessionState(
  sessionId: string,
  state: Session['state']
): void {
  sessions.updateState(sessionId, state);
}

export function addSessionMessage(
  sessionId: string,
  message: SessionMessage
): void {
  sessions.addMessage(sessionId, message);
}

/** Flush session data to disk (call during graceful shutdown) */
export function flushSessions(): void {
  sessions.flush();
}

// -----------------------------------------------------------------------------
// Socket Handler Setup
// -----------------------------------------------------------------------------

export function setupSocketHandlers(io: TypedSocketServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Handle session start
    socket.on('session:start', (callback) => {
      const session = createSession();
      socket.data.sessionId = session.id;
      console.log(`[Socket] Session started: ${session.id}`);
      callback(session.id);
    });

    // Handle incoming messages
    socket.on('session:message', async (payload) => {
      const { sessionId, content } = payload;
      const session = sessions.get(sessionId);

      if (!session) {
        socket.emit('error', {
          code: 'SESSION_NOT_FOUND',
          message: `Session ${sessionId} not found`,
        });
        return;
      }

      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      addSessionMessage(sessionId, userMessage);
      socket.emit('session:message', { sessionId, message: userMessage });

      let supervisor = supervisors.get(sessionId);
      if (!supervisor) {
        supervisor = createSupervisorAgent(sessionId);
        supervisors.set(sessionId, supervisor);
      }

      try {
        await supervisor.processMessage(content, session);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        socket.emit('error', {
          code: 'SUPERVISOR_ERROR',
          message: `Supervisor error: ${errorMessage}`,
        });
      }
    });

    // Handle session cancellation
    socket.on('session:cancel', (payload) => {
      const { sessionId } = payload;
      const session = sessions.get(sessionId);

      if (session) {
        const previousState = session.state;
        sessions.updateState(sessionId, 'idle');
        socket.emit('session:stateChange', {
          sessionId,
          state: 'idle',
          previousState,
        });
        console.log(`[Socket] Session cancelled: ${sessionId}`);
      }
    });

    // Handle execution pause
    socket.on('execution:pause', (payload) => {
      const { sessionId } = payload;
      const session = sessions.get(sessionId);

      if (session && session.state === 'executing') {
        sessions.updateState(sessionId, 'paused');

        const supervisor = supervisors.get(sessionId);
        supervisor?.pause();

        socket.emit('session:stateChange', {
          sessionId,
          state: 'paused',
          previousState: 'executing',
        });
        console.log(`[Socket] Execution paused: ${sessionId}`);
      }
    });

    // Handle execution resume
    socket.on('execution:resume', (payload) => {
      const { sessionId } = payload;
      const session = sessions.get(sessionId);

      if (session && session.state === 'paused') {
        sessions.updateState(sessionId, 'executing');

        const supervisor = supervisors.get(sessionId);
        supervisor?.resume();

        socket.emit('session:stateChange', {
          sessionId,
          state: 'executing',
          previousState: 'paused',
        });
        console.log(`[Socket] Execution resumed: ${sessionId}`);
      }
    });

    // Handle canvas sync from client
    socket.on('canvas:sync', (payload) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId) return;

      const session = sessions.get(sessionId);
      if (!session) return;

      session.canvasSnapshot = {
        nodes: payload.nodes,
        edges: payload.edges,
      };
      session.updatedAt = Date.now();
      // Re-set to trigger persistence
      sessions.set(sessionId, session);

      // Map React Flow format to canvas MCP format
      const nodes = (payload.nodes as unknown[])
        .map(asReactFlowNode)
        .filter((n): n is ReactFlowNode => n !== null)
        .map((n) => ({
          id: n.id,
          type: (n.data?.nodeType as string)?.toLowerCase() || 'agent',
          label: (n.data?.label as string) || n.id,
          position: n.position,
          parentId: n.parentId,
          data: n.data || {},
        }));

      const edges = (payload.edges as unknown[])
        .map(asReactFlowEdge)
        .filter((e): e is ReactFlowEdge => e !== null)
        .map((e) => ({
          id: e.id,
          sourceId: e.source,
          targetId: e.target,
          edgeType: e.type || (e.data?.edgeType as string | undefined),
          data: e.data,
        }));

      canvas_sync_from_client(nodes, edges);
      console.log(`[Socket] Canvas synced for session: ${sessionId}`);
    });

    // Handle system start (real orchestrator execution)
    socket.on('system:start', async (payload) => {
      const { sessionId, nodes, edges, brief } = payload;

      if (!sessionId) {
        socket.emit('error', {
          code: 'INVALID_SESSION',
          message: 'Session ID required to start system',
        });
        return;
      }

      console.log(`[Socket] System start requested for session: ${sessionId}`);

      // Map node data for validation
      const nodeInfos = (nodes as unknown[])
        .map(asReactFlowNode)
        .filter((n): n is ReactFlowNode => n !== null)
        .map((n) => ({
          id: n.id,
          type: (n.data?.type as string) || n.type || 'UNKNOWN',
          label: (n.data?.label as string) || n.id,
        }));

      const edgeInfos = (edges as unknown[])
        .map(asReactFlowEdge)
        .filter((e): e is ReactFlowEdge => e !== null)
        .map((e) => ({
          id: e.id,
          sourceId: e.source,
          targetId: e.target,
          edgeType: e.type || (e.data?.edgeType as string | undefined) || (e.data?.type as string | undefined),
        }));

      // Pre-flight validation
      emitExecutionLog(sessionId, '[PRE-FLIGHT] Validating workflow graph...');
      const validation = validateSystem(nodeInfos, edgeInfos);

      if (validation.errors.length > 0) {
        validation.errors.forEach((err) =>
          emitExecutionLog(sessionId, `ERROR: ${err}`, 'stderr')
        );
        emitExecutionLog(sessionId, '');
        emitExecutionLog(sessionId, 'Validation failed. Fix errors before running.', 'stderr');
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach((warn) =>
          emitExecutionLog(sessionId, `WARN: ${warn}`)
        );
      }
      emitExecutionLog(
        sessionId,
        `Validation passed: ${nodeInfos.length} nodes, ${edgeInfos.length} edges`
      );
      emitExecutionLog(sessionId, '');

      // Execute via real orchestrator engine
      try {
        await executeWorkflow(sessionId, nodes as Parameters<typeof executeWorkflow>[1], edges as Parameters<typeof executeWorkflow>[2], brief);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        emitExecutionLog(sessionId, `Runtime error: ${errorMessage}`, 'stderr');
        socket.emit('error', {
          code: 'RUNTIME_ERROR',
          message: `Runtime error: ${errorMessage}`,
        });
      }
    });

    // Handle system stop
    socket.on('system:stop', (payload) => {
      const { sessionId } = payload;
      console.log(`[Socket] System stop requested for session: ${sessionId}`);
      stopExecution(sessionId);
    });

    // Handle fixer:start — standalone Claude call for configuration fixes
    socket.on('fixer:start', async (payload) => {
      const { sessionId, prompt } = payload;

      if (!sessionId) {
        socket.emit('error', {
          code: 'INVALID_SESSION',
          message: 'Session ID required to start fixer',
        });
        return;
      }

      if (!prompt) {
        socket.emit('error', {
          code: 'MISSING_PROMPT',
          message: 'Fixer prompt is required',
        });
        return;
      }

      console.log(`[Socket] Fixer start requested for session: ${sessionId}`);

      try {
        await executeFixerAgent(sessionId, prompt);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        emitExecutionLog(sessionId, `Fixer error: ${errorMessage}`, 'stderr');
        socket.emit('error', {
          code: 'FIXER_ERROR',
          message: `Fixer error: ${errorMessage}`,
        });
      }
    });

    // Handle fixer:stop
    socket.on('fixer:stop', (payload) => {
      const { sessionId } = payload;
      console.log(`[Socket] Fixer stop requested for session: ${sessionId}`);
      stopExecution(sessionId);
    });

    // Handle edge type update from Properties Panel
    socket.on('canvas:update_edge', async (payload: CanvasEdgeUpdatePayload) => {
      const { edgeId, changes } = payload;

      const edge = canvasState.edges.get(edgeId);
      if (edge) {
        if (changes.data) {
          edge.data = { ...edge.data, ...changes.data };
        }
        canvasState.edges.set(edgeId, edge);

        await persistLayout();
        console.log(`[Socket] Updated edge ${edgeId} type to: ${changes.data?.type}`);
      } else {
        console.warn(`[Socket] Edge not found for update: ${edgeId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
