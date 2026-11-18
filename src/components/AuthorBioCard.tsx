import React from 'react';
import { Author, Article } from '../types.ts';
import { CheckCircle, ShieldCheck, BookOpen, Sparkles, Award } from 'lucide-react';

interface AuthorBioCardProps {
  author: Author;
  articleCount?: number;
  onFilterByAuthor?: (authorName: string) => void;
  className?: string;
  variant?: 'full' | 'compact';
}

export const AuthorBioCard: React.FC<AuthorBioCardProps> = ({
  author,
  articleCount,
  onFilterByAuthor,
  className = '',
  variant = 'full',
}) => {
  if (variant === 'compact') {
    return (
      <div
        className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Editorial Byline</span>
        </div>
        <div className="flex items-start gap-3">
          {author.avatar ? (
            <img
              src={author.avatar}
              alt={author.name}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0"
            />
          ) : (
            <div aria-label="Briefzy editorial team" className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 grid place-items-center font-bold shrink-0">BE</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {author.name}
              </h4>
              {author.verified && (
                <span title="Verified Author">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </span>
              )}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold truncate mb-1">
              {author.role}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {author.bio}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Author Bio & Editorial Credibility"
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs ${className}`}
    >
      {/* Editorial Credibility Tag Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span className="uppercase tracking-wider text-[11px]">Author Bio &amp; Editorial Credibility</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Editorial sources listed below</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Author Avatar with Ring & Status Badge */}
        <div className="relative shrink-0">
          {author.avatar ? (
            <img
              src={author.avatar}
              alt={author.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-md"
            />
          ) : (
            <div aria-label="Briefzy editorial team" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 grid place-items-center text-2xl font-bold shadow-md">BE</div>
          )}
          {author.verified && (
            <div
              className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs"
              title="Author identity independently verified by editorial board"
            >
              <CheckCircle className="w-3 h-3" />
              <span>Verified</span>
            </div>
          )}
        </div>

        {/* Biodata Information */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h3 className="font-extrabold font-heading text-xl text-slate-900 dark:text-white">
              {author.name}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-500/20">
              {author.role}
            </span>
          </div>

          {/* Concise Bio without exaggerated titles */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {author.bio}
          </p>

          {/* E-E-A-T Commitment Points */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Practical, source-led guidance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span>No unverified expert credentials claimed</span>
            </div>
            {articleCount !== undefined && articleCount > 0 && (
              <div className="font-mono text-slate-400">
                • {articleCount} Guides Published
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
