// =============================================================================
// Socket.io Event Handlers
// Handles incoming events from connected clients
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import { TypedSocket, TypedSocketServer } from './emitter';
import { SessionMessage } from '../../shared/socket-events';
import { Session } from '../types/session';
import { createSupervisorAgent, SupervisorAgent } from '../agents/supervisor';
import { canvas_sync_from_client, canvasState, persistLayout } from '../mcp/canvas-mcp';
import { validateSystem } from '../services/runtime';
import { executeWorkflow, executeFixerAgent, stopExecution } from '../services/orchestrator-bridge';
import { emitExecutionLog } from './emitter';

// In-memory session store (will be replaced with proper store later)
const sessions = new Map<string, Session>();

// Active supervisor agents per session
const supervisors = new Map<string, SupervisorAgent>();

/**
 * Create a new session
 */
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

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/**
 * Update session state
 */
export function updateSessionState(
  sessionId: string,
  state: Session['state']
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.state = state;
    session.updatedAt = Date.now();
  }
}

/**
 * Add message to session
 */
export function addSessionMessage(
  sessionId: string,
  message: SessionMessage
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.messages.push(message);
    session.updatedAt = Date.now();
  }
}

/**
 * Set up socket event handlers
 */
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

      // Add user message to session
      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      addSessionMessage(sessionId, userMessage);

      // Emit message back to confirm receipt
      socket.emit('session:message', { sessionId, message: userMessage });

      // Get or create supervisor agent for this session
      let supervisor = supervisors.get(sessionId);
      if (!supervisor) {
        supervisor = createSupervisorAgent(sessionId);
        supervisors.set(sessionId, supervisor);
      }

      // Route to Supervisor agent
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
        session.state = 'idle';
        session.updatedAt = Date.now();
        socket.emit('session:stateChange', {
          sessionId,
          state: 'idle',
          previousState: session.state,
        });
        console.log(`[Socket] Session cancelled: ${sessionId}`);
      }
    });

    // Handle execution pause
    socket.on('execution:pause', (payload) => {
      const { sessionId } = payload;
      const session = sessions.get(sessionId);

      if (session && session.state === 'executing') {
        session.state = 'paused';
        session.updatedAt = Date.now();

        // Pause the supervisor agent
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
        session.state = 'executing';
        session.updatedAt = Date.now();

        // Resume the supervisor agent
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
      if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          session.canvasSnapshot = {
            nodes: payload.nodes,
            edges: payload.edges,
          };
          session.updatedAt = Date.now();

          // Sync to MCP canvas state
          const nodes = (payload.nodes as any[]).map((n: any) => ({
            id: n.id,
            type: n.data?.nodeType?.toLowerCase() || 'agent',
            label: n.data?.label || n.id,
            position: n.position,
            parentId: n.parentId,
            data: n.data,
          }));

          const edges = (payload.edges as any[]).map((e: any) => ({
            id: e.id,
            sourceId: e.source,
            targetId: e.target,
            edgeType: e.type || e.data?.edgeType,
            data: e.data,
          }));

          canvas_sync_from_client(nodes, edges);
          console.log(`[Socket] Canvas synced for session: ${sessionId}`);
        }
      }
    });

    // Phase 6 → Phase 7: Handle system start (real orchestrator execution)
    socket.on('system:start' as any, async (payload: any) => {
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
      const nodeInfos = (nodes as any[]).map((n: any) => ({
        id: n.id,
        type: n.data?.type || n.type || 'UNKNOWN',
        label: n.data?.label || n.id,
      }));

      const edgeInfos = (edges as any[]).map((e: any) => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        edgeType: e.type || e.data?.edgeType || e.data?.type,
      }));

      // Step 1: Pre-flight validation (kept from runtime.ts)
      emitExecutionLog(sessionId, '[PRE-FLIGHT] Validating workflow graph...');
      const validation = validateSystem(nodeInfos, edgeInfos);

      if (validation.errors.length > 0) {
        validation.errors.forEach((err) =>
          emitExecutionLog(sessionId, `ERROR: ${err}`, 'stderr')
        );
        emitExecutionLog(sessionId, '');
        emitExecutionLog(
          sessionId,
          'Validation failed. Fix errors before running.',
          'stderr'
        );
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

      // Step 2: Execute via real orchestrator engine
      try {
        await executeWorkflow(sessionId, nodes as any[], edges as any[], brief);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        emitExecutionLog(sessionId, `Runtime error: ${errorMessage}`, 'stderr');
        socket.emit('error', {
          code: 'RUNTIME_ERROR',
          message: `Runtime error: ${errorMessage}`,
        });
      }
    });

    // Phase 6 → Phase 7: Handle system stop (cancels real execution)
    socket.on('system:stop' as any, (payload: any) => {
      const { sessionId } = payload;
      console.log(`[Socket] System stop requested for session: ${sessionId}`);
      stopExecution(sessionId);
    });

    // Handle fixer:start — standalone Claude call for configuration fixes
    socket.on('fixer:start' as any, async (payload: any) => {
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
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        emitExecutionLog(sessionId, `Fixer error: ${errorMessage}`, 'stderr');
        socket.emit('error', {
          code: 'FIXER_ERROR',
          message: `Fixer error: ${errorMessage}`,
        });
      }
    });

    // Handle fixer:stop — cancel fixer execution
    socket.on('fixer:stop' as any, (payload: any) => {
      const { sessionId } = payload;
      console.log(`[Socket] Fixer stop requested for session: ${sessionId}`);
      stopExecution(sessionId);
    });

    // Phase 6.3: Handle edge type update from Properties Panel
    socket.on('canvas:update_edge' as any, async (payload: { edgeId: string; changes: { data?: Record<string, unknown> } }) => {
      const { edgeId, changes } = payload;

      // 1. Update In-Memory State
      const edge = canvasState.edges.get(edgeId);
      if (edge) {
        if (changes.data) {
          edge.data = { ...edge.data, ...changes.data };
        }
        canvasState.edges.set(edgeId, edge);

        // 2. Persist to Disk (layout.json)
        await persistLayout();
        console.log(`[Socket] Updated edge ${edgeId} type to: ${changes.data?.type}`);
      } else {
        console.warn(`[Socket] Edge not found for update: ${edgeId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
      // Note: We don't delete the session on disconnect to allow reconnection
    });
  });
}
