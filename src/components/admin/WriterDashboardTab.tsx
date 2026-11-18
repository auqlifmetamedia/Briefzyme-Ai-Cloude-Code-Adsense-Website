import React, { useMemo, useState } from 'react';
import {
  PenTool,
  Sparkles,
  FileText,
  Eye,
  Share2,
  CheckCircle2,
  Search,
  BarChart3,
  Clock,
  Pencil,
  ExternalLink,
  Users,
  Layers,
  Award,
} from 'lucide-react';
import type { Article, CategoryItem, TeamMember } from '../../types.ts';
import { publishStatus } from '../../utils/publishState.ts';

interface WriterDashboardTabProps {
  teamMembers: TeamMember[];
  articles: Article[];
  categories: CategoryItem[];
  onStartWriting: (writer: TeamMember, targetCategory?: string) => void;
  onEditArticle: (article: Article) => void;
  onViewArticle: (article: Article) => void;
  onManageTeam: () => void;
}

export const WriterDashboardTab: React.FC<WriterDashboardTabProps> = ({
  teamMembers,
  articles,
  categories,
  onStartWriting,
  onEditArticle,
  onViewArticle,
  onManageTeam,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWriterId, setSelectedWriterId] = useState<string>(teamMembers[0]?.id || '');
  const [articleFilter, setArticleFilter] = useState<'all' | 'live' | 'draft' | 'scheduled'>('all');

  const categoryTabs = useMemo(() => {
    const names = categories.map((c) => c.name);
    return ['All', ...names, 'Editorial Desk'];
  }, [categories]);

  // Compute live statistics per author name
  const statsByAuthor = useMemo(() => {
    const map = new Map<
      string,
      {
        articles: Article[];
        liveCount: number;
        draftCount: number;
        scheduledCount: number;
        totalViews: number;
        totalShares: number;
        avgSeo: number;
      }
    >();

    for (const art of articles) {
      const name = (art.author?.name || '').trim();
      if (!name) continue;
      let entry = map.get(name);
      if (!entry) {
        entry = {
          articles: [],
          liveCount: 0,
          draftCount: 0,
          scheduledCount: 0,
          totalViews: 0,
          totalShares: 0,
          avgSeo: 0,
        };
        map.set(name, entry);
      }
      entry.articles.push(art);
      const status = publishStatus(art);
      if (status === 'live') entry.liveCount++;
      else if (status === 'draft') entry.draftCount++;
      else entry.scheduledCount++;
      entry.totalViews += art.views || 0;
      entry.totalShares += art.shares || 0;
    }

    map.forEach((entry) => {
      if (entry.articles.length > 0) {
        const sum = entry.articles.reduce((acc, a) => acc + (a.seoScore || 88), 0);
        entry.avgSeo = Math.round(sum / entry.articles.length);
      }
    });

    return map;
  }, [articles]);

  const filteredWriters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teamMembers.filter((m) => {
      const cat = m.category || 'All';
      const catMatch =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Editorial Desk'
          ? cat === 'All'
          : cat === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q) ||
        (m.bio || '').toLowerCase().includes(q) ||
        (m.specialty || []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [teamMembers, selectedCategory, searchQuery]);

  const activeWriter = useMemo(() => {
    return (
      filteredWriters.find((w) => w.id === selectedWriterId) ||
      filteredWriters[0] ||
      teamMembers[0] ||
      null
    );
  }, [filteredWriters, selectedWriterId, teamMembers]);

  const activeWriterStats = activeWriter ? statsByAuthor.get(activeWriter.name) : undefined;

  const activeWriterArticles = useMemo(() => {
    const list = activeWriterStats?.articles || [];
    if (articleFilter === 'all') return list;
    return list.filter((a) => publishStatus(a) === articleFilter);
  }, [activeWriterStats, articleFilter]);

  const rosterTotals = useMemo(() => {
    let published = 0;
    let draftsAndScheduled = 0;
    let views = 0;
    let seoSum = 0;
    let seoCount = 0;

    filteredWriters.forEach((w) => {
      const st = statsByAuthor.get(w.name);
      if (st) {
        published += st.liveCount;
        draftsAndScheduled += st.draftCount + st.scheduledCount;
        views += st.totalViews;
        if (st.avgSeo > 0) {
          seoSum += st.avgSeo;
          seoCount++;
        }
      }
    });

    return {
      writers: filteredWriters.length,
      published,
      draftsAndScheduled,
      views,
      avgSeo: seoCount ? Math.round(seoSum / seoCount) : 92,
    };
  }, [filteredWriters, statsByAuthor]);

  const preferredCategory = (w: TeamMember) => {
    if (w.category && w.category !== 'All' && categories.some((c) => c.name === w.category)) {
      return w.category;
    }
    return categories[0]?.name || 'Productivity & AI Tools';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <PenTool className="w-6 h-6 text-indigo-500 dark:text-cyan-400" />
            <span>Writer Dashboard &amp; Category Author Desk</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track author output across every Briefzy beat, inspect drafts &amp; SEO scores, and launch new articles directly under any writer&apos;s byline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onManageTeam}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Manage / Add Writers</span>
          </button>
          {activeWriter && (
            <button
              type="button"
              onClick={() => onStartWriting(activeWriter, preferredCategory(activeWriter))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Write as {activeWriter.name.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400">Writers in Beat</div>
          <div className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
            {rosterTotals.writers}
          </div>
          <div className="text-[10px] text-emerald-500 font-semibold">All title-free bios</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400">Live Published</div>
          <div className="text-2xl font-extrabold font-heading text-indigo-600 dark:text-cyan-400 mt-1">
            {rosterTotals.published}
          </div>
          <div className="text-[10px] text-slate-400">Indexed articles</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400">Drafts &amp; Scheduled</div>
          <div className="text-2xl font-extrabold font-heading text-amber-600 dark:text-amber-400 mt-1">
            {rosterTotals.draftsAndScheduled}
          </div>
          <div className="text-[10px] text-slate-400">In pipeline</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400">Total Reads</div>
          <div className="text-2xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
            {rosterTotals.views.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Cumulative views</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400">Average SEO Score</div>
          <div className="text-2xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
            {rosterTotals.avgSeo}/100
          </div>
          <div className="text-[10px] text-slate-400">E-E-A-T &amp; LSI ready</div>
        </div>
      </div>

      {/* Category Filter + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {categoryTabs.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter writers or specialties…"
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Split Workspace: Writer Roster Grid (left 5 cols) + Selected Writer Workspace (right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Writer Cards List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
          {filteredWriters.length === 0 && (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
              No writers match this category or search query.
            </div>
          )}

          {filteredWriters.map((writer) => {
            const st = statsByAuthor.get(writer.name);
            const isSelected = activeWriter?.id === writer.id;
            const liveCount = st?.liveCount ?? 0;
            const totalViews = st?.totalViews ?? 0;

            return (
              <div
                key={writer.id}
                onClick={() => setSelectedWriterId(writer.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
                }`}
              >
                <img
                  src={writer.avatar}
                  alt={writer.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1">
                      <span>{writer.name}</span>
                      {writer.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 shrink-0">
                      {writer.category && writer.category !== 'All' ? writer.category : 'Editorial Desk'}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 truncate">
                    {writer.title || writer.role}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {writer.bio}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{liveCount} live guide{liveCount === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{totalViews.toLocaleString()} views</span>
                    {st && st.avgSeo > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">SEO {st.avgSeo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Writer Workspace */}
        <div className="lg:col-span-7 space-y-5">
          {activeWriter ? (
            <>
              {/* Profile & Actions Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <img
                    src={activeWriter.avatar}
                    alt={activeWriter.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-extrabold font-heading text-slate-900 dark:text-white">
                        {activeWriter.name}
                      </h4>
                      {activeWriter.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Verified Writer
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 text-[10px] font-bold">
                        <Layers className="w-3 h-3" /> {activeWriter.category && activeWriter.category !== 'All' ? activeWriter.category : 'All Categories'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {activeWriter.title} • Access Role: {activeWriter.role}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeWriter.bio}
                    </p>

                    {activeWriter.specialty && activeWriter.specialty.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {activeWriter.specialty.map((sp, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Writer Metric Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-indigo-500" /> Live Guides
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {activeWriterStats?.liveCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Drafts / Sched.
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {(activeWriterStats?.draftCount ?? 0) + (activeWriterStats?.scheduledCount ?? 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-cyan-500" /> Total Reads
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {(activeWriterStats?.totalViews ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-emerald-500" /> Avg SEO Score
                    </div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {activeWriterStats?.avgSeo ? `${activeWriterStats.avgSeo}/100` : 'Ready'}
                    </div>
                  </div>
                </div>

                {/* Quick Launch Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onStartWriting(activeWriter, preferredCategory(activeWriter))}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Write New Article as {activeWriter.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartWriting(activeWriter, preferredCategory(activeWriter))}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Build for {preferredCategory(activeWriter)}</span>
                  </button>
                </div>
              </div>

              {/* Writer's Articles Table */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    <span>Articles by {activeWriter.name} ({activeWriterArticles.length})</span>
                  </h5>

                  <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                    {(['all', 'live', 'draft', 'scheduled'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setArticleFilter(f)}
                        className={`px-2.5 py-1 rounded-lg capitalize cursor-pointer transition-colors ${
                          articleFilter === f
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {activeWriterArticles.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No {articleFilter === 'all' ? '' : articleFilter} articles attributed to {activeWriter.name} yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartWriting(activeWriter, preferredCategory(activeWriter))}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Start first article in {preferredCategory(activeWriter)}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeWriterArticles.map((art) => {
                      const st = publishStatus(art);
                      return (
                        <div key={art.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-md">
                                {art.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  st === 'live'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : st === 'scheduled'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {st}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="text-indigo-600 dark:text-cyan-400 font-semibold">{art.category}</span>
                              <span>•</span>
                              <span>{art.readingTime}</span>
                              <span>•</span>
                              <span>{(art.views || 0).toLocaleString()} views</span>
                              {art.seoScore ? (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <Award className="w-3 h-3" /> SEO {art.seoScore}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onEditArticle(art)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onViewArticle(art)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-cyan-300 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
