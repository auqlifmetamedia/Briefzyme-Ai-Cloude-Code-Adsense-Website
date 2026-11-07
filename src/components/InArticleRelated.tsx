import React, { useMemo } from 'react';
import { Article } from '../types.ts';
import { BookOpen, Sparkles, Clock, ArrowRight } from 'lucide-react';

interface InArticleRelatedProps {
  currentArticle: Article;
  allArticles: Article[];
  onSelectArticle: (article: Article) => void;
  maxItems?: number;
}

export const InArticleRelated: React.FC<InArticleRelatedProps> = ({
  currentArticle,
  allArticles,
  onSelectArticle,
  maxItems = 3,
}) => {
  // Score and select 2 or 3 most relevant articles based on category and topic
  const relatedList = useMemo(() => {
    const candidates = allArticles.filter((a) => a.id !== currentArticle.id);
    if (candidates.length === 0) return [];

    const currentTags = currentArticle.tags || [];
    const currentKeywords = currentArticle.secondaryKeywords || [];
    const currentCategoryLower = (currentArticle.category || '').toLowerCase();

    const scored = candidates.map((candidate) => {
      let score = 0;
      const candCatLower = (candidate.category || '').toLowerCase();

      // 1. Same category match (strongest signal)
      if (candCatLower === currentCategoryLower) {
        score += 20;
      }

      // 2. Shared tags
      if (candidate.tags && candidate.tags.length > 0) {
        candidate.tags.forEach((tag) => {
          if (currentTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
            score += 5;
          }
        });
      }

      // 3. Shared keywords
      if (candidate.secondaryKeywords && candidate.secondaryKeywords.length > 0) {
        candidate.secondaryKeywords.forEach((kw) => {
          if (currentKeywords.some((k) => k.toLowerCase() === kw.toLowerCase())) {
            score += 4;
          }
        });
      }

      // 4. Keyword presence in title
      if (currentArticle.primaryKeyword) {
        const pkWords = currentArticle.primaryKeyword.toLowerCase().split(/\s+/);
        pkWords.forEach((word) => {
          if (word.length > 3 && candidate.title.toLowerCase().includes(word)) {
            score += 2;
          }
        });
      }

      // Factor in views slightly for quality ranking
      score += Math.min(5, (candidate.views || 0) / 5000);

      return { article: candidate, score };
    });

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);

    // Pick top items (prefer 3, minimum 2 if available)
    const countToTake = Math.min(maxItems, Math.max(2, scored.length));
    return scored.slice(0, countToTake).map((s) => s.article);
  }, [currentArticle, allArticles, maxItems]);

  if (relatedList.length === 0) return null;

  return (
    <aside
      aria-label="Related Articles"
      className="not-prose my-10 p-4 sm:p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/20 to-cyan-50/25 dark:from-slate-900/90 dark:via-indigo-950/25 dark:to-cyan-950/20 border border-indigo-100/90 dark:border-slate-800 shadow-xs backdrop-blur-xs transition-all"
    >
      {/* Header bar with editorial label and category focus */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 mb-4 border-b border-indigo-100/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider font-heading text-slate-900 dark:text-white">
              Read Also • Related Articles
            </h3>
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-cyan-300 font-medium">
              Topic Picks
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
          <span>Focus: <strong className="text-indigo-600 dark:text-cyan-400">{currentArticle.category}</strong></span>
        </div>
      </div>

      {/* Grid of 2 or 3 related articles with small thumbnails */}
      <div
        className={`grid gap-3 sm:gap-3.5 ${
          relatedList.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {relatedList.map((art) => (
          <button
            key={art.id}
            onClick={() => {
              onSelectArticle(art);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group flex items-start gap-3 p-3 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-cyan-500/60 hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer text-left w-full focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
          >
            {/* Small Thumbnail */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-900 relative shadow-2xs">
              <img
                src={art.featuredImage}
                alt={art.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400 mb-1">
                  <span className="truncate max-w-[90px]">{art.category}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {art.readingTime}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold font-heading text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {art.title}
                </h4>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors mt-2">
                <span>Read Brief</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
