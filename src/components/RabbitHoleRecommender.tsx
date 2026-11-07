import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { Article } from '../types.ts';

interface RabbitHoleRecommenderProps {
  currentArticle: Article;
  allArticles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const RabbitHoleRecommender: React.FC<RabbitHoleRecommenderProps> = ({
  currentArticle,
  allArticles,
  onSelectArticle,
}) => {
  const [readingDepthCount, setReadingDepthCount] = useState(1);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('briefzy_reading_depth');
      const count = stored ? parseInt(stored, 10) + 1 : 1;
      sessionStorage.setItem('briefzy_reading_depth', String(count));
      setReadingDepthCount(count);
    } catch {
      // ignore
    }
  }, [currentArticle.id]);

  // Find 2 logical downstream articles for concept chaining
  const nextArticles = React.useMemo(() => {
    // 1st candidate: same category, different id
    const sameCat = allArticles.filter(
      (a) => a.id !== currentArticle.id && a.category.toLowerCase() === currentArticle.category.toLowerCase()
    );
    // 2nd candidate: any other high scoring article
    const others = allArticles.filter(
      (a) => a.id !== currentArticle.id && !sameCat.find((s) => s.id === a.id)
    );

    const first = sameCat[0] || others[0];
    const second = sameCat[1] || others[1] || others[0];

    return [
      {
        article: first,
        stepTitle: 'Step 2: Second-Order Downstream Market Impact',
        rationale: `Having examined ${currentArticle.primaryKeyword}, this logical next briefing uncovers the ripple effect on corporate cost structures and competitive responses.`,
        depthBadge: 'Domino Vector',
      },
      {
        article: second,
        stepTitle: 'Step 3: Future Horizon & Strategic Synthesis',
        rationale: `Connect your empirical foundation with long-term macroeconomic shifts before they harden into market consensus.`,
        depthBadge: 'Horizon 2027+',
      },
    ].filter((item) => item.article);
  }, [currentArticle, allArticles]);

  const getRankBadge = () => {
    if (readingDepthCount >= 3) {
      return { rank: 'Level 3: Senior Strategist', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
    if (readingDepthCount === 2) {
      return { rank: 'Level 2: Active Research Analyst', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' };
    }
    return { rank: 'Level 1: Topic Explorer', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
  };

  const badgeInfo = getRankBadge();

  return (
    <div className="my-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-cyan-950/20 dark:from-indigo-950/50 dark:via-slate-900/70 dark:to-cyan-950/50 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-indigo-500/20 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Compass className="w-5 h-5 animate-spin duration-1000" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <span>AI "Rabbit Hole" Recommender (Concept Trail)</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Never stop at a single perspective — follow the causal chain linking adjacent technological shifts
            </p>
          </div>
        </div>

        {/* Gamified Depth Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${badgeInfo.color}`}>
          <Award className="w-4 h-4" />
          <span>{badgeInfo.rank} ({readingDepthCount} Briefings Analyzed)</span>
        </div>
      </div>

      {/* Stepped Concept Trail */}
      <div className="mt-6 space-y-6">
        {/* Step 1: Current Article (Done) */}
        <div className="flex items-start gap-3 sm:gap-4 opacity-75">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-xs">
            ✓
          </div>
          <div className="flex-1 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Step 1: Completed Briefing
            </span>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
              {currentArticle.title}
            </h4>
          </div>
        </div>

        {/* Steps 2 & 3: Next recommended articles */}
        {nextArticles.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3 sm:gap-4 group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              {idx + 2}
            </div>

            <div
              onClick={() => {
                onSelectArticle(step.article);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-400 dark:hover:border-cyan-400 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                  {step.stepTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20">
                  {step.depthBadge}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                    {step.article.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                    {step.rationale}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold group-hover:shadow-md transition-all">
                  <span>Explore This Vector</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
