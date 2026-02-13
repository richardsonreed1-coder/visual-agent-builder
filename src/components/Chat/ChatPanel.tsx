// =============================================================================
// Chat Panel Component
// Floating collapsible panel for AI agent interaction
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  StopCircle,
  Sparkles,
} from 'lucide-react';
import { useHeadlessSession } from '../../hooks/useHeadlessSession';
import { SessionStatus } from './SessionStatus';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const {
    isConnected,
    sessionId,
    sessionState,
    messages,
    startSession,
    sendMessage,
    cancelSession,
    pauseExecution,
    resumeExecution,
  } = useHeadlessSession();

  // Auto-start session when connected
  useEffect(() => {
    if (isConnected && !sessionId) {
      startSession();
    }
  }, [isConnected, sessionId, startSession]);

  // Track unread messages when panel is collapsed
  useEffect(() => {
    if (!isExpanded && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.length - lastMessageCountRef.current;
      setUnreadCount((prev) => prev + newMessages);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isExpanded]);

  // Clear unread count when expanding
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  const isProcessing =
    sessionState === 'routing' ||
    sessionState === 'planning' ||
    sessionState === 'executing';

  const canPause = sessionState === 'executing';
  const canResume = sessionState === 'paused';

  // Collapsed state - floating button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-16 right-4 z-50
                   w-14 h-14 rounded-full
                   bg-gradient-to-br from-indigo-500 to-purple-600
                   text-white shadow-lg
                   hover:shadow-xl hover:scale-105
                   transition-all duration-200
                   flex items-center justify-center
                   group"
      >
        <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5
                          bg-red-500 rounded-full
                          text-xs font-bold text-white
                          flex items-center justify-center
                          animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {isProcessing && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4
                          bg-emerald-500 rounded-full
                          animate-ping" />
        )}
      </button>
    );
  }

  // Minimized state - compact header only
  if (isMinimized) {
    return (
      <div className="fixed bottom-16 right-4 z-50 w-80">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600
                          flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-white" />
              <span className="text-white font-medium text-sm">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Maximize2 size={16} className="text-white" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state - full panel
  return (
    <div className="fixed bottom-16 right-4 z-50 w-96">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200
                      flex flex-col h-[500px] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600
                        flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-white" />
            <span className="text-white font-medium">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Execution controls */}
            {canPause && (
              <button
                onClick={pauseExecution}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Pause execution"
              >
                <Pause size={16} className="text-white" />
              </button>
            )}
            {canResume && (
              <button
                onClick={resumeExecution}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Resume execution"
              >
                <Play size={16} className="text-white" />
              </button>
            )}
            {isProcessing && (
              <button
                onClick={cancelSession}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Cancel"
              >
                <StopCircle size={16} className="text-white" />
              </button>
            )}
            {/* Window controls */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 size={16} className="text-white" />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <SessionStatus state={sessionState} isConnected={isConnected} />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100
                              flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-indigo-500" />
              </div>
              <h3 className="font-medium text-slate-700 mb-2">
                Welcome to AI Assistant
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tell me what you want to build. For example:
              </p>
              <div className="mt-4 space-y-2 text-left">
                <button
                  onClick={() => handleSend('Create a supervisor agent with two worker agents')}
                  className="w-full px-3 py-2 text-sm text-left text-indigo-600
                             bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  "Create a supervisor with two workers"
                </button>
                <button
                  onClick={() => handleSend("What's on the canvas?")}
                  className="w-full px-3 py-2 text-sm text-left text-indigo-600
                             bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  "What's on the canvas?"
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <ChatInput
          onSend={handleSend}
          disabled={!isConnected}
          isProcessing={isProcessing}
          placeholder={
            !isConnected
              ? 'Connecting...'
              : isProcessing
              ? 'Processing...'
              : 'Describe what you want to build...'
          }
        />
      </div>
    </div>
  );
};

export default ChatPanel;
