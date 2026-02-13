import React, { useState, useRef, useEffect } from 'react';
import { Play, X, FileText } from 'lucide-react';

interface ExecutionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (brief: string) => void;
  agentCount: number;
}

export const ExecutionPromptModal: React.FC<ExecutionPromptModalProps> = ({
  isOpen,
  onClose,
  onExecute,
  agentCount,
}) => {
  const [brief, setBrief] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValid = brief.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onExecute(brief.trim());
      setBrief('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isValid) {
      onExecute(brief.trim());
      setBrief('');
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-violet-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Project Brief
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800
                       transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5">
          <p className="text-sm text-slate-400 mb-3">
            Describe what you want the {agentCount} agent{agentCount !== 1 ? 's' : ''} in this workflow to accomplish.
          </p>

          <textarea
            ref={textareaRef}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Build a landing page for a SaaS product called CloudSync with a hero section, feature grid, pricing table, and testimonials"'
            className="w-full h-32 px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg
                       text-sm text-slate-200 placeholder-slate-500 resize-none
                       focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                       transition-all"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-slate-500">
              {brief.trim().length < 10
                ? `${10 - brief.trim().length} more characters needed`
                : '⌘+Enter to execute'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200
                           bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                           transition-all ${
                             isValid
                               ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                               : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                           }`}
              >
                <Play size={14} />
                Execute
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
