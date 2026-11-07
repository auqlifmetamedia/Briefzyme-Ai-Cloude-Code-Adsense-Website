import React, { useState } from 'react';
import { Mail, CheckCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const NewsletterSidebar: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<'All' | 'Tech' | 'Finance'>('All');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    try {
      const existing = JSON.parse(localStorage.getItem('briefzy_subscribers') || '[]');
      existing.push({
        email: email.trim(),
        topic: selectedTopic,
        date: new Date().toISOString(),
      });
      localStorage.setItem('briefzy_subscribers', JSON.stringify(existing));
    } catch {
      // Storage fallback
    }

    setIsSubscribed(true);
  };

  return (
    <div className="rounded-3xl border border-indigo-500/30 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-md">
            <Mail className="w-4 h-4" />
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
            Daily Intelligence
          </span>
        </div>

        <h4 className="text-xl font-bold font-heading text-white tracking-tight leading-snug mb-2">
          The Executive Dispatch
        </h4>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Join 42,000+ senior founders, analysts, and tech leaders receiving high-yield briefings before the markets open.
        </p>

        {isSubscribed ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-200">Welcome to Briefzy Dispatch!</div>
              <div className="text-[11px] text-emerald-300/80">Check your inbox for your first curated intelligence briefing.</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            {/* Preferred focus pills */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Focus:</span>
              {(['All', 'Tech', 'Finance'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setSelectedTopic(t)}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                    selectedTopic === t
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter work email (e.g. name@firm.com)"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer active:scale-98"
            >
              <span>Get Free Briefings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Zero spam. Unsubscribe anytime.</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>AdSense Compliant</span>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
