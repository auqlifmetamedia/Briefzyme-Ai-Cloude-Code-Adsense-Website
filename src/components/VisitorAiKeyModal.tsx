import React, { useState, useEffect } from 'react';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Sparkles,
  Lock,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import {
  getVisitorKey,
  setVisitorKey,
  clearVisitorKey,
  testVisitorKey,
} from '../utils/visitorAi.ts';

interface VisitorAiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisitorAiKeyModal: React.FC<VisitorAiKeyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'idle' | 'testing' | 'success' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  useEffect(() => {
    if (isOpen) {
      const existing = getVisitorKey();
      setCurrentKey(existing);
      setApiKeyInput(existing || '');
      setStatusMessage({ type: 'idle', text: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setStatusMessage({
        type: 'error',
        text: 'Please input your Gemini API Key.',
      });
      return;
    }

    setStatusMessage({
      type: 'testing',
      text: 'Verifying your API key with Google AI Studio...',
    });

    const result = await testVisitorKey(cleanKey);
    if (result.valid) {
      setVisitorKey(cleanKey);
      setCurrentKey(cleanKey);
      setStatusMessage({
        type: 'success',
        text: 'API key is valid and safely connected to your browser!',
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.message || 'Invalid API key. Please verify your credentials at Google AI Studio.',
      });
    }
  };

  const handleClear = () => {
    clearVisitorKey();
    setCurrentKey(null);
    setApiKeyInput('');
    setStatusMessage({
      type: 'idle',
      text: 'API key has been removed from your local browser.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-900 dark:text-white">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-indigo-500/20 via-cyan-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-heading">
              Visitor AI Key Vault (BYOK)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect Your Own Google AI Studio Account (100% Free & Private)
            </p>
          </div>
        </div>

        {/* Transparency note */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Guaranteed Privacy:</strong> Your API key is stored <em>only</em> in your local browser storage (<code className="text-indigo-600 dark:text-cyan-400">localStorage</code>) and is never persisted on server databases.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <span>
              <strong>Limitless AI Capabilities:</strong> Enjoy on-demand 2-Minute Podcast synthesis, bespoke Multi-Lens analyses, and deep interactive Q&A powered directly by your free Google AI Studio quota.
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              {currentKey && (
                <span className="text-emerald-500 font-semibold flex items-center gap-1 text-[11px] normal-case">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Key Connected
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 pr-10"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get your free API Key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-400 text-[11px]">Free, no credit card required</span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage.text && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'testing'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-800'
                  : statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'testing' && <Sparkles className="w-4 h-4 animate-spin shrink-0" />}
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3">
            {currentKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Key</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Needed only for advanced bespoke AI tasks
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={statusMessage.type === 'testing'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
