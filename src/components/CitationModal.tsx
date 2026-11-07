import React, { useState } from 'react';
import { articleUrl } from '../utils/routes.ts';
import { Article } from '../types.ts';
import {
  Quote,
  Copy,
  Check,
  X,
  FileText,
  Presentation,
  Bookmark,
  Share2,
} from 'lucide-react';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  isOpen,
  onClose,
  article,
}) => {
  const [format, setFormat] = useState<'apa' | 'harvard' | 'bibtex' | 'slide'>('apa');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const canonicalUrl = articleUrl(article);

  const citations = {
    apa: `${article.author.name}. (${article.publishDate.slice(-4) || currentYear}). ${article.title}. Briefzy. ${canonicalUrl}`,
    harvard: `${article.author.name}, ${article.publishDate.slice(-4) || currentYear}. ${article.title}. Briefzy Available at: <${canonicalUrl}> [Accessed ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}].`,
    bibtex: `@article{briefzy_${article.slug.replace(/[^a-zA-Z0-9]/g, '_')},
  author = {${article.author.name}},
  title = {${article.title}},
  journal = {Briefzy Intelligence Briefs},
  year = {${currentYear}},
  url = {${canonicalUrl}},
  publisher = {Briefzy}
}`,
    slide: `• Key Finding: ${article.title}
• Strategic Summary: ${article.metaDescription}
• Core Thesis: ${article.keyTakeaways?.[0] || 'High-yield enterprise transformation analyzed.'}
• Source: Briefzy (${article.author.name}, ${article.publishDate})
• Permanent Link: ${canonicalUrl}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(citations[format]);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center">
              <Quote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold font-heading text-base">Cite This Executive Brief</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Peer-reviewed E-E-A-T academic and boardroom citation formats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-1.5 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {(
            [
              { id: 'apa', label: 'APA 7th' },
              { id: 'harvard', label: 'Harvard' },
              { id: 'bibtex', label: 'BibTeX' },
              { id: 'slide', label: 'Executive Slide' },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setFormat(fmt.id)}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center text-[11px] ${
                format === fmt.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {/* Citation Preview Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto mb-5 select-all">
          {citations[format]}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-slate-400 font-mono">
            Verified Author: {article.author.name}
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Citation Copied!' : 'Copy Citation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
