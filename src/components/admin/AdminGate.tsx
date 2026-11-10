import React, { useEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { adminLogin, getAdminToken, setAdminToken, clearAdminToken } from '../../utils/remote.ts';

interface Props {
  onAuthed: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

// Pintu masuk admin: memeriksa ADMIN_TOKEN di server sebelum dashboard dibuka.
export function AdminGate({ onAuthed, onClose, children }: Props) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'ok'>('checking');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notified = useRef(false);

  const finish = () => {
    setStatus('ok');
    if (!notified.current) { notified.current = true; onAuthed(); }
  };

  useEffect(() => {
    adminLogin(getAdminToken()).then((r) => {
      if (r.ok) finish();
      else { if (r.notConfigured) setError(r.error || ''); else clearAdminToken(); setStatus('locked'); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await adminLogin(input.trim());
    setBusy(false);
    if (r.ok) { setAdminToken(input.trim()); finish(); }
    else setError(r.error || 'Invalid token');
  };

  if (status === 'ok') return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Lock className="w-4 h-4 text-amber-500" /> Admin Access
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {status === 'checking' ? (
          <p className="text-sm text-slate-500">Verifying session…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Admin Security Token (ADMIN_TOKEN)
            </label>
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder="Enter security token"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm py-2"
            >
              {busy ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
