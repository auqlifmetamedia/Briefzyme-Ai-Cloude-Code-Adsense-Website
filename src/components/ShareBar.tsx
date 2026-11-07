import React, { useState } from 'react';
import { Share2, Link as LinkIcon, Check, MessageSquare, Send, Sparkles } from 'lucide-react';

interface ShareBarProps {
  title: string;
  url: string;
  summary?: string;
  className?: string;
  variant?: 'inline' | 'floating' | 'card';
}

export const ShareBar: React.FC<ShareBarProps> = ({
  title,
  url,
  summary = '',
  className = '',
  variant = 'inline',
}) => {
  const [copied, setCopied] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`${title} — via Briefzy.me`);
  const encodedSummary = encodeURIComponent(summary ? `${summary} ` : '');

  // Social sharing links with dedicated URLs
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summary || title,
          url,
        });
        setHasShared(true);
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  // ----------------------------------------------------
  // VARIANT: FLOATING VERTICAL SHARE RAIL (Desktop Sticky)
  // ----------------------------------------------------
  if (variant === 'floating') {
    return (
      <aside
        aria-label="Social media sharing rail"
        className={`hidden xl:flex flex-col items-center gap-2.5 fixed left-6 top-1/2 -translate-y-1/2 z-30 p-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 animate-in fade-in slide-in-from-left-4 duration-300 ${className}`}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-1 flex items-center justify-center">
          <Share2 className="w-3.5 h-3.5 text-indigo-500" />
        </div>

        {/* Twitter / X */}
        <a
          href={twitterShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Share to X (Twitter)"
          className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-black text-white flex items-center justify-center transition-all hover:scale-110 shadow-xs cursor-pointer group"
          aria-label="Share on X"
        >
          <svg className="w-4 h-4 fill-current group-hover:drop-shadow" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* LinkedIn */}
        <a
          href={linkedInShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Share to LinkedIn"
          className="w-9 h-9 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white flex items-center justify-center transition-all hover:scale-110 shadow-xs cursor-pointer"
          aria-label="Share on LinkedIn"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
          </svg>
        </a>

        {/* Facebook */}
        <a
          href={facebookShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Share to Facebook"
          className="w-9 h-9 rounded-xl bg-[#1877F2] hover:bg-[#0c59b8] text-white flex items-center justify-center transition-all hover:scale-110 shadow-xs cursor-pointer"
          aria-label="Share on Facebook"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>

        {/* WhatsApp */}
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Share to WhatsApp"
          className="w-9 h-9 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white flex items-center justify-center transition-all hover:scale-110 shadow-xs cursor-pointer"
          aria-label="Share on WhatsApp"
        >
          <MessageSquare className="w-4 h-4" />
        </a>

        <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          title={copied ? 'Link Copied!' : 'Copy Article Link'}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:border-indigo-400'
          }`}
          aria-label="Copy link"
        >
          {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
        </button>

        {copied && (
          <div className="absolute left-14 top-auto px-2 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded shadow-md whitespace-nowrap animate-in fade-in">
            Copied!
          </div>
        )}
      </aside>
    );
  }

  // ----------------------------------------------------
  // VARIANT: FULL ENGAGEMENT CARD (Bottom Call-to-Action)
  // ----------------------------------------------------
  if (variant === 'card') {
    return (
      <div
        className={`p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 text-white shadow-xl ${className}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Broadcast This Insight</span>
            </div>
            <h4 className="text-xl md:text-2xl font-bold font-heading text-white">
              Enjoyed this strategic analysis?
            </h4>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Help your peers and executive network stay informed by sharing this research paper across your social networks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Twitter / X */}
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white font-semibold text-xs flex items-center gap-2 border border-slate-800 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedInShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
              </svg>
              <span>LinkedIn</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#0c59b8] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </a>

            {/* Copy Link button */}
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <LinkIcon className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VARIANT: INLINE (Standard bar with branded pill buttons)
  // ----------------------------------------------------
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
        <Share2 className="w-3.5 h-3.5 text-indigo-500" />
        <span>Share:</span>
      </span>

      {/* Twitter / X */}
      <a
        href={twitterShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on X (Twitter)"
        className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-black text-white flex items-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105 shadow-xs cursor-pointer group"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="hidden sm:inline">X</span>
      </a>

      {/* LinkedIn */}
      <a
        href={linkedInShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on LinkedIn"
        className="h-8 px-3 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white flex items-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105 shadow-xs cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
        </svg>
        <span className="hidden sm:inline">LinkedIn</span>
      </a>

      {/* Facebook */}
      <a
        href={facebookShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Facebook"
        className="h-8 px-3 rounded-xl bg-[#1877F2] hover:bg-[#0c59b8] text-white flex items-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105 shadow-xs cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span className="hidden sm:inline">Facebook</span>
      </a>

      {/* WhatsApp */}
      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share via WhatsApp"
        className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white flex items-center justify-center gap-1.5 text-xs font-semibold transition-transform hover:scale-105 shadow-xs cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        title="Copy canonical link"
        className={`h-8 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          copied
            ? 'bg-emerald-500 text-white border-emerald-500'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-cyan-400'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <LinkIcon className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>

      {/* Native Web Share button (for mobile devices) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          title="Share via device menu"
          className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">More</span>
        </button>
      )}
    </div>
  );
};
