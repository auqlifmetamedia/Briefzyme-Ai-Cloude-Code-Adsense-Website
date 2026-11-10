import React, { useState, useMemo } from 'react';
import { Article } from '../types.ts';
import { isLive } from '../utils/publishState.ts';
import { Flame, TrendingUp, Eye, Clock, Sparkles } from 'lucide-react';

interface PopularArticlesSidebarProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  currentArticleId?: string;
  limit?: number;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const PopularArticlesSidebar: React.FC<PopularArticlesSidebarProps> = ({
  articles,
  onSelectArticle,
  currentArticleId,
  limit = 5,
  className = '',
  title = 'Popular Stories',
  subtitle = 'Most Read Intelligence',
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'trending'>('all');

  // Filter only live articles, excluding current article if in article view
  const popularList = useMemo(() => {
    const live = articles.filter((a) => isLive(a) && (!currentArticleId || a.id !== currentArticleId));

    if (filterMode === 'trending') {
      // Sort by recent high views ratio or featured
      return [...live]
        .sort((a, b) => {
          const scoreA = (a.views || 1000) * (a.featured ? 1.3 : 1);
          const scoreB = (b.views || 1000) * (b.featured ? 1.3 : 1);
          return scoreB - scoreA;
        })
        .slice(0, limit);
    }

    // All time: sorted strictly by total view count
    return [...live]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, limit);
  }, [articles, currentArticleId, limit, filterMode]);

  return (
    <aside
      aria-label="Popular Stories"
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-xs">
            <Flame className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <h3 className="font-extrabold font-heading text-sm text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Filter Toggle Pill */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setFilterMode('trending')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              filterMode === 'trending'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Trending
          </button>
        </div>
      </div>

      {/* Popular List Items */}
      <div className="space-y-4">
        {popularList.map((art, idx) => {
          const rank = idx + 1;
          const isTopThree = rank <= 3;

          return (
            <div
              key={art.id}
              onClick={() => {
                onSelectArticle(art);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex items-start gap-3.5 p-2 -mx-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer relative"
            >
              {/* Rank Badge */}
              <div
                className={`w-7 h-7 rounded-xl font-heading font-black text-xs flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 shadow-xs ${
                  rank === 1
                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 ring-2 ring-amber-400/30'
                    : rank === 2
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                    : rank === 3
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {rank === 1 ? '1' : `0${rank}`}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 truncate">
                    {art.category}
                  </span>
                  {art.featured && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-sm bg-amber-400/10 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                      <Sparkles className="w-2.5 h-2.5" />
                      Featured
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-2 mb-1.5">
                  {art.title}
                </h4>

                {/* Meta: Author Avatar & Views */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  {art.author && (
                    <div className="flex items-center gap-1 shrink-0">
                      <img
                        src={art.author.avatar}
                        alt={art.author.name}
                        className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                      />
                      <span className="truncate max-w-[80px]">{art.author.name.split(' ')[0]}</span>
                    </div>
                  )}

                  <span>•</span>

                  <span className="flex items-center gap-0.5 shrink-0">
                    <Eye className="w-3 h-3 text-slate-400" />
                    {(art.views || 0).toLocaleString()}
                  </span>

                  <span>•</span>

                  <span className="flex items-center gap-0.5 shrink-0">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {art.readingTime}
                  </span>
                </div>
              </div>

              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800">
                <img
                  src={art.featuredImage}
                  alt={art.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
