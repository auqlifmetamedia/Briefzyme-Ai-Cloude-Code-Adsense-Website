import React, { useState, useEffect } from 'react';
import { Shield, Cookie, X, Check, Settings } from 'lucide-react';
import { translations } from '../utils/translations.ts';
import { Language } from '../types.ts';

interface CookieConsentBannerProps {
  lang: Language;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ lang }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    adPersonalization: true,
  });

  const t = translations[lang] || translations.en;

  useEffect(() => {
    const consent = localStorage.getItem('briefzy_cookie_consent');
    if (!consent) {
      // Show banner after brief delay
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      'briefzy_cookie_consent',
      JSON.stringify({ necessary: true, analytics: true, adPersonalization: true, timestamp: Date.now() })
    );
    setIsVisible(false);
  };

  const handleRejectNonEssential = () => {
    localStorage.setItem(
      'briefzy_cookie_consent',
      JSON.stringify({ necessary: true, analytics: false, adPersonalization: false, timestamp: Date.now() })
    );
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      'briefzy_cookie_consent',
      JSON.stringify({ ...preferences, timestamp: Date.now() })
    );
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Privacy & Cookie Choices</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                GDPR & CCPA
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
              {t.cookieNotice}
            </p>
          </div>
        </div>

        {showPreferences ? (
          <div className="space-y-2.5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Strictly Necessary Cookies</div>
                <div className="text-[11px] text-slate-500">Core session security, layout, theme settings.</div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Always Active</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Analytics & Performance</div>
                <div className="text-[11px] text-slate-500">Anonymous visitor trends and Core Web Vitals.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Personalized Content & Advertising</div>
                <div className="text-[11px] text-slate-500">Delivers relevant articles, topics, and partner recommendations.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.adPersonalization}
                onChange={(e) => setPreferences({ ...preferences, adPersonalization: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleSavePreferences}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-xs text-center"
            >
              {t.cookieAccept}
            </button>
            <button
              onClick={handleRejectNonEssential}
              className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              {t.cookieReject}
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
