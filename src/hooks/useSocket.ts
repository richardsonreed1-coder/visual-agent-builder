// =============================================================================
// Socket.io Client Hook
// Manages connection to backend and provides real-time event handling
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SessionState,
  SessionMessage,
  CanvasNodePayload,
  CanvasNodeUpdatePayload,
  CanvasEdgePayload,
  AgentResultPayload,
  ExecutionReportPayload,
} from '../../shared/socket-events';

const SOCKET_URL = 'http://localhost:3001';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface UseSocketOptions {
  onNodeCreated?: (payload: CanvasNodePayload) => void;
  onNodeUpdated?: (payload: CanvasNodeUpdatePayload) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onEdgeCreated?: (payload: CanvasEdgePayload) => void;
  onEdgeDeleted?: (edgeId: string) => void;
  onSessionStateChange?: (state: SessionState, previousState?: SessionState) => void;
  onSessionMessage?: (message: SessionMessage) => void;
  onExecutionStepStart?: (stepName: string, stepOrder: number, totalSteps: number) => void;
  onExecutionStepComplete?: (stepName: string, success: boolean, error?: string) => void;
  onAgentResult?: (payload: AgentResultPayload) => void;
  onExecutionReport?: (payload: ExecutionReportPayload) => void;
  onError?: (code: string, message: string) => void;
}

export interface UseSocketReturn {
  isConnected: boolean;
  sessionId: string | null;
  sessionState: SessionState;
  messages: SessionMessage[];
  socket: TypedSocket | null;
  startSession: () => Promise<string>;
  sendMessage: (content: string) => void;
  cancelSession: () => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  syncCanvas: (nodes: unknown[], edges: unknown[]) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [messages, setMessages] = useState<SessionMessage[]>([]);

  // Store options in ref to avoid re-subscribing on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize socket connection
  useEffect(() => {
    const socket: TypedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      setIsConnected(false);
    });

    // Session events
    socket.on('session:stateChange', (payload) => {
      setSessionState(payload.state);
      optionsRef.current.onSessionStateChange?.(payload.state, payload.previousState);
    });

    socket.on('session:message', (payload) => {
      setMessages((prev) => [...prev, payload.message]);
      optionsRef.current.onSessionMessage?.(payload.message);
    });

    // Canvas events
    socket.on('node:created', (payload) => {
      optionsRef.current.onNodeCreated?.(payload);
    });

    socket.on('node:updated', (payload) => {
      optionsRef.current.onNodeUpdated?.(payload);
    });

    socket.on('node:deleted', (payload) => {
      optionsRef.current.onNodeDeleted?.(payload.nodeId);
    });

    socket.on('edge:created', (payload) => {
      optionsRef.current.onEdgeCreated?.(payload);
    });

    socket.on('edge:deleted', (payload) => {
      optionsRef.current.onEdgeDeleted?.(payload.edgeId);
    });

    // Execution events
    socket.on('execution:stepStart', (payload) => {
      optionsRef.current.onExecutionStepStart?.(
        payload.stepName,
        payload.stepOrder,
        payload.totalSteps
      );
    });

    socket.on('execution:stepComplete', (payload) => {
      optionsRef.current.onExecutionStepComplete?.(
        payload.stepName,
        payload.success,
        payload.error
      );
    });

    socket.on('execution:agentResult', (payload) => {
      optionsRef.current.onAgentResult?.(payload);
    });

    socket.on('execution:report', (payload) => {
      optionsRef.current.onExecutionReport?.(payload);
    });

    // Error events
    socket.on('error', (payload) => {
      console.error('[Socket] Error:', payload);
      optionsRef.current.onError?.(payload.code, payload.message);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Start a new session
  const startSession = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('session:start', (newSessionId) => {
        setSessionId(newSessionId);
        setMessages([]);
        setSessionState('idle');
        resolve(newSessionId);
      });
    });
  }, []);

  // Send a message to the current session
  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current?.connected || !sessionId) {
      console.error('[Socket] Cannot send message: no active session');
      return;
    }

    socketRef.current.emit('session:message', { sessionId, content });
  }, [sessionId]);

  // Cancel the current session
  const cancelSession = useCallback(() => {
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit('session:cancel', { sessionId });
  }, [sessionId]);

  // Pause execution
  const pauseExecution = useCallback(() => {
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit('execution:pause', { sessionId });
  }, [sessionId]);

  // Resume execution
  const resumeExecution = useCallback(() => {
    if (!socketRef.current?.connected || !sessionId) return;
    socketRef.current.emit('execution:resume', { sessionId });
  }, [sessionId]);

  // Sync canvas state to server
  const syncCanvas = useCallback((nodes: unknown[], edges: unknown[]) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('canvas:sync', { nodes, edges });
  }, []);

  return {
    isConnected,
    sessionId,
    sessionState,
    messages,
    socket: socketRef.current,
    startSession,
    sendMessage,
    cancelSession,
    pauseExecution,
    resumeExecution,
    syncCanvas,
  };
}
