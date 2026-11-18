import React, { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { Language } from '../types.ts';

interface CookieConsentBannerProps { lang: Language }

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('briefzy_notice_dismissed')) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);
  const dismiss = () => {
    try { localStorage.setItem('briefzy_notice_dismissed', '1'); } catch { /* storage may be unavailable */ }
    setVisible(false);
  };
  if (!visible) return null;
  return (
    <aside className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50" aria-label="Website notice">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Website privacy notice</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">Briefzy uses browser storage for basic site preferences. Advertising is not currently enabled. Read our Privacy Policy for details.</p>
            <div className="flex items-center gap-3 mt-3">
              <a href="/privacy-policy" className="text-xs font-semibold text-amber-600 hover:underline">Privacy Policy</a>
              <button onClick={dismiss} className="ml-auto px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
