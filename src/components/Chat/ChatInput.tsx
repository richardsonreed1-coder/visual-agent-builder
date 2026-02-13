// =============================================================================
// Chat Input Component
// Message input field with send button
// =============================================================================

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  isProcessing = false,
  placeholder = 'Type a message...',
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled && !isProcessing) {
      onSend(trimmed);
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !disabled && !isProcessing;

  return (
    <div className="border-t border-slate-200 p-3 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isProcessing}
          rows={1}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     disabled:bg-slate-50 disabled:text-slate-400
                     resize-none max-h-[120px] leading-relaxed"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`p-2.5 rounded-xl transition-all duration-150
            ${
              canSend
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
        >
          {isProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default ChatInput;
