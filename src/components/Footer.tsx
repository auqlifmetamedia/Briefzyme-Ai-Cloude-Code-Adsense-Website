import React, { useState } from 'react';
import { Logo } from './Logo.tsx';
import { Language } from '../types.ts';
import { translations } from '../utils/translations.ts';
import {
  ShieldCheck,
  Send,
  CheckCircle,
  Lock,
  Globe,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface FooterProps {
  lang: Language;
  onOpenPage: (page: 'about' | 'contact' | 'privacy' | 'terms' | 'dmca') => void;
  onOpenSitemap: () => void;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  onOpenPage,
  onOpenSitemap,
  onOpenAdmin,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const t = translations[lang] || translations.en;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 transition-colors">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Logo size="lg" showDomain={true} />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Briefzy (<strong>briefzy.me</strong>) publishes practical, plain-English guides on AI tools, online privacy and security, everyday tech, and remote work.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>E-E-A-T Verified</span>
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>GDPR &amp; CCPA Compliant</span>
              </span>
            </div>
          </div>

          {/* Editorial & Topics */}
          <div className="md:col-span-3 space-y-3 text-xs">
            <h4 className="font-bold text-sm text-white font-heading uppercase tracking-wider">
              Editorial Verticals
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <span className="hover:text-cyan-400 cursor-pointer">Artificial Intelligence &amp; Agents</span>
              </li>
              <li>
                <span className="hover:text-cyan-400 cursor-pointer">Post-Quantum Cryptography</span>
              </li>
              <li>
                <span className="hover:text-cyan-400 cursor-pointer">High-Yield SaaS Economics</span>
              </li>
              <li>
                <span className="hover:text-cyan-400 cursor-pointer">Decentralized Compute Cloud</span>
              </li>
              <li>
                <span className="hover:text-cyan-400 cursor-pointer">Google SGE &amp; Monetization</span>
              </li>
            </ul>
          </div>

          {/* Compliance & AdSense Mandatory Pages */}
          <div className="md:col-span-4 space-y-3 text-xs">
            <h4 className="font-bold text-sm text-white font-heading uppercase tracking-wider">
              Governance &amp; Compliance
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <button
                onClick={() => onOpenPage('about')}
                className="text-left hover:text-cyan-400 cursor-pointer"
              >
                {t.aboutUs}
              </button>
              <button
                onClick={() => onOpenPage('contact')}
                className="text-left hover:text-cyan-400 cursor-pointer"
              >
                {t.contactUs}
              </button>
              <button
                onClick={() => onOpenPage('privacy')}
                className="text-left hover:text-cyan-400 cursor-pointer"
              >
                {t.privacyPolicy}
              </button>
              <button
                onClick={() => onOpenPage('terms')}
                className="text-left hover:text-cyan-400 cursor-pointer"
              >
                {t.termsOfService}
              </button>
              <button
                onClick={() => onOpenPage('dmca')}
                className="text-left hover:text-cyan-400 cursor-pointer"
              >
                {t.dmca}
              </button>
              <button
                onClick={onOpenSitemap}
                className="text-left hover:text-cyan-400 font-semibold text-cyan-400 cursor-pointer flex items-center gap-1"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{t.sitemap}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-900">
              AdSense Transparency: Advertisements on briefzy.me are served by certified Google AdSense ad units adhering to Better Ads Standards.
            </p>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 Briefzy (<strong>briefzy.me</strong>). All rights reserved.
          </div>
          <div className="text-[11px] text-slate-600 font-mono">
            Practical guides for everyday tech
          </div>
        </div>
      </div>
    </footer>
  );
};
