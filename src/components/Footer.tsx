import React from 'react';
import { Logo } from './Logo.tsx';
import { Language } from '../types.ts';
import { translations } from '../utils/translations.ts';
import { FileCode } from 'lucide-react';

interface FooterProps {
  lang: Language;
  onOpenPage: (page: 'about' | 'contact' | 'privacy' | 'terms' | 'dmca') => void;
  onOpenSitemap: () => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onOpenPage, onOpenSitemap }) => {
  const t = translations[lang] || translations.en;
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5 space-y-4">
            <Logo size="lg" showDomain={true} />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">Briefzy (briefzy.me) publishes practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work.</p>
            <p className="text-xs text-slate-400">Our editorial standards prioritise accuracy, useful sources, clear corrections, and honest author information.</p>
          </div>
          <div className="md:col-span-3 space-y-3 text-xs">
            <h2 className="font-bold text-sm text-white font-heading uppercase tracking-wider">Topics</h2>
            <ul className="space-y-2 text-slate-400">
              <li>Productivity &amp; AI Tools</li>
              <li>Online Security</li>
              <li>Tech How-To</li>
              <li>Remote Work</li>
            </ul>
          </div>
          <div className="md:col-span-4 space-y-3 text-xs">
            <h2 className="font-bold text-sm text-white font-heading uppercase tracking-wider">Information</h2>
            <nav className="grid grid-cols-2 gap-2 text-slate-400" aria-label="Footer">
              <button onClick={() => onOpenPage('about')} className="text-left hover:text-cyan-400">{t.aboutUs}</button>
              <button onClick={() => onOpenPage('contact')} className="text-left hover:text-cyan-400">{t.contactUs}</button>
              <button onClick={() => onOpenPage('privacy')} className="text-left hover:text-cyan-400">{t.privacyPolicy}</button>
              <button onClick={() => onOpenPage('terms')} className="text-left hover:text-cyan-400">{t.termsOfService}</button>
              <button onClick={() => onOpenPage('dmca')} className="text-left hover:text-cyan-400">{t.dmca}</button>
              <button onClick={onOpenSitemap} className="text-left hover:text-cyan-400 flex items-center gap-1"><FileCode className="w-3.5 h-3.5" /><span>{t.sitemap}</span></button>
            </nav>
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-900">Briefzy has applied to Google AdSense. Advertising will be displayed only if the site is approved and ad code is enabled.</p>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© 2026 Briefzy (briefzy.me). All rights reserved.</div>
          <div className="text-[11px] text-slate-600">Practical guides for everyday tech</div>
        </div>
      </div>
    </footer>
  );
};
