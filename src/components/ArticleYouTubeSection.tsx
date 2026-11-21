import React, { useEffect, useState } from 'react';
import { Youtube, Play, ExternalLink, Loader2 } from 'lucide-react';
import type { Article, YouTubeVideoItem } from '../types.ts';

interface Props {
  article: Article;
}

export const ArticleYouTubeSection: React.FC<Props> = ({ article }) => {
  const [videos, setVideos] = useState<YouTubeVideoItem[]>(article.youtubeVideos || []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setActiveIdx(0);
    setPlayingId(null);

    if (article.youtubeVideos && article.youtubeVideos.length > 0) {
      setVideos(article.youtubeVideos);
      return;
    }

    setVideos([]);
    setLoading(true);
    const params = new URLSearchParams({
      title: article.title,
      keyword: article.primaryKeyword,
      category: article.category,
      limit: '3',
    });

    fetch(`/api/youtube/search?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.videos)) {
          setVideos(data.videos);
        }
      })
      .catch(() => {
        // Ignore network errors cleanly; section renders fallback link if empty
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [article.id, article.title, article.primaryKeyword, article.category, article.youtubeVideos]);

  const active = videos[activeIdx];
  const fallbackSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${article.primaryKeyword || article.title} tutorial`
  )}`;

  if (!loading && videos.length === 0) {
    return (
      <section
        aria-label="Related Video Walkthrough"
        className="my-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Video Walkthroughs on YouTube
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Watch step-by-step video tutorials matching "{article.primaryKeyword || article.title}".
            </p>
          </div>
        </div>
        <a
          href={fallbackSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0"
        >
          Search YouTube Tutorials <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>
    );
  }

  return (
    <section
      aria-label="Topic Video Walkthrough"
      className="my-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Youtube className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Recommended Video Walkthrough
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Verified YouTube tutorials matched to <span className="font-semibold">{article.primaryKeyword || article.title}</span>
            </p>
          </div>
        </div>
        {active && (
          <a
            href={active.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            Open on YouTube <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {loading && videos.length === 0 ? (
          <div className="aspect-video w-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs font-semibold">Finding topic-matched YouTube walkthroughs...</span>
          </div>
        ) : active ? (
          <>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 dark:border-slate-800 shadow-sm">
              {playingId === active.videoId ? (
                <iframe
                  src={`${active.embedUrl}?rel=0&autoplay=1`}
                  title={active.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayingId(active.videoId)}
                  className="group w-full h-full relative text-left block focus:outline-none"
                  aria-label={`Play YouTube video: ${active.title}`}
                >
                  <img
                    src={active.thumbnailUrl}
                    alt={active.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-rose-600/95 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                      <Play className="w-7 h-7 fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-300 mb-0.5">
                      {active.authorName}
                    </div>
                    <div className="text-sm sm:text-base font-bold leading-snug line-clamp-2">
                      {active.title}
                    </div>
                  </div>
                </button>
              )}
            </div>

            {videos.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {videos.map((v, i) => {
                  const selected = i === activeIdx;
                  return (
                    <button
                      key={v.videoId}
                      type="button"
                      onClick={() => {
                        setActiveIdx(i);
                        setPlayingId(null);
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        className="w-16 h-10 rounded-lg object-cover shrink-0 bg-slate-200 dark:bg-slate-800"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                          {v.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {v.authorName}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
};
