import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Article, Category, CategoryItem, Language, PushNotification, TeamMember } from './types.ts';
import { initialArticles } from './data/mockArticles.ts';
import { initialTeamMembers } from './data/mockTeam.ts';
import { initialCategories } from './data/mockCategories.ts';
import {
  Clock,
  ArrowRight,
  Flame,
  ChevronRight,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ArticleView } from './components/ArticleView.tsx';
import { AdSenseBanner } from './components/AdSenseBanner.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.tsx';
import { PushNotificationManager } from './components/PushNotificationManager.tsx';
import { AboutUsPage } from './components/pages/AboutUsPage.tsx';
import { ContactUsPage } from './components/pages/ContactUsPage.tsx';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage.tsx';
import { TermsOfServicePage } from './components/pages/TermsOfServicePage.tsx';
import { DmcaPage } from './components/pages/DmcaPage.tsx';
import { SitemapModal } from './components/pages/SitemapModal.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { VisitorAiKeyModal } from './components/VisitorAiKeyModal.tsx';
import { GoogleMapsExplorer } from './components/GoogleMapsExplorer.tsx';
import { PopularArticlesSidebar } from './components/PopularArticlesSidebar.tsx';
import { translations } from './utils/translations.ts';
import { getLocalizedArticle } from './utils/articleTranslator.ts';
import { isLive } from './utils/publishState.ts';
import { AdminGate } from './components/admin/AdminGate.tsx';
import {
  articlePathOf, categoryPathOf, pagePath, resolveRoute, setCategoryRegistry, slugify, uniqueSlug, type PageKey,
} from './utils/routes.ts';
import { metaForArticle, metaForCategory, metaForHome, metaForNotFound, metaForPage } from './utils/seoMeta.ts';
import { applySeo } from './utils/seo.ts';
import { fetchAdminContent, saveAdminContent, type RemoteContent } from './utils/remote.ts';

export default function App({ remote = null }: { remote?: RemoteContent | null }) {
  // Articles state - ensure complete 15+ article library across all categories with fresh author profiles
  const [articles, setArticles] = useState<Article[]>(() => {
    if (remote?.articles) return remote.articles;
    const saved = localStorage.getItem('briefzy_articles');
    if (saved) {
      try {
        const parsed: Article[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((a) => a.id));
        const missingDefaults = initialArticles.filter((a) => !existingIds.has(a.id));
        const combined = [...parsed, ...missingDefaults];
        // Upgrade any stale author SVG avatars or outdated placeholder bios
        return combined.map((a) => {
          if (!a.author?.avatar || a.author.avatar.startsWith('data:image/svg') || a.author.avatar.includes('120 120')) {
            const fresh = initialArticles.find((init) => init.id === a.id);
            if (fresh) return { ...a, author: fresh.author, views: a.views || fresh.views };
          }
          return a;
        });
      } catch (e) {
        console.error(e);
      }
    }
    return initialArticles;
  });

  // Team members state (Writers, Editors, Supervisors, Managers across all categories)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (remote?.team) {
      const existingIds = new Set(remote.team.map((m) => m.id));
      const missingDefaults = initialTeamMembers.filter((m) => !existingIds.has(m.id));
      return [...remote.team, ...missingDefaults];
    }
    const saved = localStorage.getItem('briefzy_team');
    if (saved) {
      try {
        const parsed: TeamMember[] = JSON.parse(saved);
        if (parsed.length <= 1 || parsed[0]?.avatar?.startsWith('data:image/svg')) {
          return initialTeamMembers;
        }
        const defaultById = new Map(initialTeamMembers.map((m) => [m.id, m]));
        const upgraded = parsed.map((m) => {
          const def = defaultById.get(m.id);
          return def && !m.category ? { ...m, category: def.category } : m;
        });
        const existingIds = new Set(upgraded.map((m) => m.id));
        const missingDefaults = initialTeamMembers.filter((m) => !existingIds.has(m.id));
        return [...upgraded, ...missingDefaults];
      } catch (e) {
        console.error(e);
      }
    }
    return initialTeamMembers;
  });

  // Categories taxonomy state
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    if (remote?.categories) return remote.categories;
    const saved = localStorage.getItem('briefzy_categories');
    if (saved) {
      try {
        const parsed: CategoryItem[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((c) => c.id));
        const missingDefaults = initialCategories.filter((c) => !existingIds.has(c.id));
        return [...parsed, ...missingDefaults];
      } catch (e) {
        console.error(e);
      }
    }
    return initialCategories;
  });

  // Save articles on update
  useEffect(() => {
    localStorage.setItem('briefzy_articles', JSON.stringify(articles));
  }, [articles]);

  // Save team on update
  useEffect(() => {
    localStorage.setItem('briefzy_team', JSON.stringify(teamMembers));
  }, [teamMembers]);

  // Save categories on update
  useEffect(() => {
    localStorage.setItem('briefzy_categories', JSON.stringify(categories));
  }, [categories]);

  // Routing / View state
  setCategoryRegistry(categories);
  const [routeInit] = useState(() => resolveRoute(window.location.pathname, articles, categories));
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(routeInit.article);
  const [currentCategory, setCurrentCategory] = useState<string>(routeInit.category);
  const [activePage, setActivePage] = useState<'home' | PageKey>(routeInit.page);
  const [notFound, setNotFound] = useState<boolean>(routeInit.notFound);

  // URL <-> state
  const go = (path: string, replace = false) => {
    if (window.location.pathname === path) return;
    if (replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
  };
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // Koreksi URL bila kategori artikel berubah (canonical)
  useEffect(() => {
    if (routeInit.canonicalPath) go(routeInit.canonicalPath, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tombol back/forward browser
  useEffect(() => {
    const onPop = () => {
      const r = resolveRoute(window.location.pathname, articlesRef.current, categoriesRef.current);
      setSelectedArticle(r.article);
      setCurrentCategory(r.category);
      setActivePage(r.page);
      setNotFound(r.notFound);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Metadata SEO per halaman (title, description, canonical, JSON-LD)
  useEffect(() => {
    if (selectedArticle) return applySeo(metaForArticle(selectedArticle, categories));
    if (notFound) return applySeo(metaForNotFound());
    if (activePage !== 'home') return applySeo(metaForPage(activePage));
    const cat = categories.find((c) => c.name === currentCategory);
    if (currentCategory !== 'All' && cat) return applySeo(metaForCategory(cat, categories));
    applySeo(metaForHome());
  }, [selectedArticle, activePage, currentCategory, notFound, categories]);

  // Penyimpanan konten ke Cloudflare KV (hanya setelah admin login)
  const [adminReady, setAdminReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; msg?: string }>({ state: 'idle' });
  const lastSaved = useRef<{ articles: unknown; categories: unknown; team: unknown }>({ articles: null, categories: null, team: null });

  const handleAdminAuthed = async () => {
    const full = await fetchAdminContent();
    if (full?.articles) setArticles(full.articles);
    if (full?.categories) setCategories(full.categories);
    if (full?.team) setTeamMembers(full.team);
    lastSaved.current = { articles: full?.articles ?? null, categories: full?.categories ?? null, team: full?.team ?? null };
    setAdminReady(true);
  };

  useEffect(() => {
    if (!adminReady) return;
    const changed: Record<string, unknown> = {};
    if (articles !== lastSaved.current.articles) changed.articles = articles;
    if (categories !== lastSaved.current.categories) changed.categories = categories;
    if (teamMembers !== lastSaved.current.team) changed.team = teamMembers;
    if (!Object.keys(changed).length) return;
    setSaveStatus({ state: 'saving' });
    const timer = setTimeout(async () => {
      const r = await saveAdminContent(changed);
      if (r.ok) {
        if ('articles' in changed) lastSaved.current.articles = changed.articles;
        if ('categories' in changed) lastSaved.current.categories = changed.categories;
        if ('team' in changed) lastSaved.current.team = changed.team;
        setSaveStatus({ state: 'saved' });
      } else {
        setSaveStatus({ state: 'error', msg: r.error });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [adminReady, articles, categories, teamMembers]);

  // Modals & Overlays
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSitemapOpen, setIsSitemapOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVisitorAiKeyModalOpen, setIsVisitorAiKeyModalOpen] = useState(false);
  const [isMapsExplorerOpen, setIsMapsExplorerOpen] = useState(false);
  const [mapsInitialQuery, setMapsInitialQuery] = useState('Silicon Valley, CA');

  const handleOpenMaps = (query?: string) => {
    if (query && typeof query === 'string') {
      setMapsInitialQuery(query);
    }
    setIsMapsExplorerOpen(true);
  };

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('briefzy_lang') as Language) || 'en';
  });

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('briefzy_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('briefzy_dark_mode', String(darkMode));
  }, [darkMode]);

  // Push notifications state
  const [notifications, setNotifications] = useState<PushNotification[]>([
    {
      id: 'notif-1',
      title: 'Traffic Spike: +48% US Readers on AI Article',
      body: 'Concurrent readership reached 1,420 users from New York, London, and San Francisco.',
      timestamp: '5 min ago',
      read: false,
      type: 'traffic',
    },
    {
      id: 'notif-2',
      title: 'AdSense RPM Milestone: $28.40 Today',
      body: 'High auction competition on Tier-1 enterprise cybersecurity queries.',
      timestamp: '22 min ago',
      read: false,
      type: 'revenue',
    },
  ]);

  // Periodic simulated push notification ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const tips = [
        {
          title: 'Googlebot Re-Indexed /sitemap.xml',
          body: 'All canonical URLs refreshed with 0 crawl errors.',
          type: 'system' as const,
        },
        {
          title: 'Tier-1 Traffic Surge Detected',
          body: 'Surge of 340 concurrent visitors from UK & Germany.',
          type: 'traffic' as const,
        },
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: randomTip.title,
          body: randomTip.body,
          timestamp: 'Just now',
          read: false,
          type: randomTip.type,
        },
        ...prev.slice(0, 4),
      ]);
    }, 90000); // every 90s

    return () => clearInterval(timer);
  }, []);

  // Admin access via secure administrator URL (#admin, #administrator, /admin, ?admin=true) and shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const checkAdminUrl = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();

      if (
        hash === '#admin' ||
        hash === '#administrator' ||
        search.includes('admin=true') ||
        search.includes('administrator=true') ||
        path.startsWith('/admin') ||
        path.startsWith('/administrator')
      ) {
        setIsAdminOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hashchange', checkAdminUrl);
    window.addEventListener('popstate', checkAdminUrl);

    // Initial check on page load
    checkAdminUrl();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkAdminUrl);
      window.removeEventListener('popstate', checkAdminUrl);
    };
  }, []);

  const t = translations[lang] || translations.en;

  // Filtered stories for main feed
  // Public feed only loads published live articles (not drafts or future scheduled).
  const liveArticles: Article[] = articles.filter((a: Article) => isLive(a));

  const localizedLiveArticles = useMemo<Article[]>(() => {
    if (lang === 'en') return liveArticles;
    return liveArticles.map((a: Article) => getLocalizedArticle(a, lang));
  }, [liveArticles, lang]);

  const filteredArticles: Article[] = localizedLiveArticles.filter((art: Article) => {
    if (currentCategory === 'All') return true;
    return art.category === currentCategory;
  });

  const heroArticle: Article | undefined = localizedLiveArticles.find((a: Article) => a.featured) || localizedLiveArticles[0];
  const gridArticles: Article[] = filteredArticles.filter((a: Article) => a.id !== heroArticle?.id);

  // Article selection helper
  const handleSelectArticle = (art: Article) => {
    setSelectedArticle(art);
    setNotFound(false);
    setActivePage('home');
    go(articlePathOf(art, categories));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setSelectedArticle(null);
    setCurrentCategory('All');
    setNotFound(false);
    setActivePage('home');
    go('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPage = (page: PageKey) => {
    setSelectedArticle(null);
    setNotFound(false);
    setActivePage(page);
    go(pagePath(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddArticle = (input: Article) => {
    // Slug harus unik & SEO-friendly: dibuat dari slug yang diisi, atau dari judul.
    const newArt: Article = { ...input, slug: uniqueSlug(input.slug || slugify(input.title), articles.map((a) => a.slug)) };
    setArticles([newArt, ...articles]);
    setSelectedArticle(newArt);
    setNotFound(false);
    setActivePage('home');
    go(articlePathOf(newArt, categories));
  };

  const handleDeleteArticle = (id: string) => {
    setArticles(articles.filter((a) => a.id !== id));
    if (selectedArticle?.id === id) {
      setSelectedArticle(null);
      go('/');
    }
  };

  const handleAddCategory = (newCat: CategoryItem) => {
    setCategories((prev) => [...prev, newCat]);
  };

  const handleUpdateCategory = (updated: CategoryItem) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleBroadcastNotification = (
    title: string,
    body: string,
    type: 'breaking' | 'traffic' | 'revenue' | 'system'
  ) => {
    const newNotif: PushNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      timestamp: 'Just now',
      read: false,
      type,
    };
    setNotifications([newNotif, ...notifications]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Main Navbar */}
      <Navbar
        currentCategory={currentCategory}
        categoriesList={categories}
        onSelectCategory={(cat) => {
          setCurrentCategory(cat);
          setSelectedArticle(null);
          setNotFound(false);
          setActivePage('home');
          go(cat === 'All' ? '/' : categoryPathOf(cat, categories));
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={handleNavigateHome}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        currentLang={lang}
        onChangeLang={(newLang) => {
          setLang(newLang);
          localStorage.setItem('briefzy_lang', newLang);
        }}
      />

      {/* Floating Push Notification Center */}
      <PushNotificationManager
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onDismiss={(id) => setNotifications(notifications.filter((n) => n.id !== id))}
        onSelectLink={() => {
          setIsNotificationsOpen(false);
          if (heroArticle) handleSelectArticle(heroArticle);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Render Single Article View */}
        {selectedArticle ? (
          <ArticleView
            article={selectedArticle}
            allArticles={liveArticles}
            onSelectArticle={handleSelectArticle}
            onBack={() => {
              setSelectedArticle(null);
              go(currentCategory === 'All' ? '/' : categoryPathOf(currentCategory, categories));
            }}
            onOpenKeyModal={() => setIsVisitorAiKeyModalOpen(true)}
            onOpenMaps={handleOpenMaps}
            lang={lang}
          />
        ) : notFound ? (
          <main className="max-w-2xl mx-auto px-4 py-24 text-center">
            <h1 className="text-4xl font-extrabold font-heading mb-3">404</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">The page you are looking for could not be found.</p>
            <button onClick={handleNavigateHome} className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer">
              Back to Home
            </button>
          </main>
        ) : activePage === 'about' ? (
          <AboutUsPage teamMembers={teamMembers} />
        ) : activePage === 'contact' ? (
          <ContactUsPage />
        ) : activePage === 'privacy' ? (
          <PrivacyPolicyPage />
        ) : activePage === 'terms' ? (
          <TermsOfServicePage />
        ) : activePage === 'dmca' ? (
          <DmcaPage />
        ) : (
          /* HOME MAGAZINE FEED */
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
            {/* Header Leaderboard Ad (728x90 desktop / 320x50 mobile) */}
            <AdSenseBanner type="header_leaderboard" slotId="pub-98410294-leader" />

            {/* HERO FEATURED STORY (First Tier 1 Highlight) */}
            {heroArticle && currentCategory === 'All' && (
              <section className="my-6">
                <div
                  onClick={() => handleSelectArticle(heroArticle)}
                  className="group relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xl cursor-pointer grid grid-cols-1 lg:grid-cols-12 min-h-[420px]"
                >
                  <div className="lg:col-span-7 relative h-64 lg:h-auto overflow-hidden">
                    <img
                      src={heroArticle.featuredImage}
                      alt={heroArticle.imageAlt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent lg:hidden" />
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-md">
                        Editor's Lead Story
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold font-mono">
                        {heroArticle.category}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-slate-900 text-white z-10">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">
                        <span>{heroArticle.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {heroArticle.readingTime}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading tracking-tight leading-tight group-hover:text-amber-400 transition-colors mb-3">
                        {heroArticle.title}
                      </h2>

                      <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-4">
                        {heroArticle.metaDescription}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={heroArticle.author.avatar}
                          alt={heroArticle.author.name}
                          className="w-8 h-8 rounded-full object-cover border border-amber-400"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-white">{heroArticle.author.name}</div>
                          <div className="text-slate-400">{heroArticle.publishDate}</div>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Read Full Brief</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Two-Column Feed: Main Stories + Sticky AdSense Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8">
              {/* Left Column: Stories Stream (8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <h3 className="font-extrabold font-heading text-xl text-slate-900 dark:text-white">
                      {currentCategory === 'All' ? t.latestStories : `${currentCategory} Intelligence`}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing {gridArticles.length} Verified Briefs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {gridArticles.map((art, index) => (
                    <React.Fragment key={art.id}>
                      <div
                        onClick={() => handleSelectArticle(art)}
                        className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[16/10] overflow-hidden bg-slate-900 relative">
                            <img
                              src={art.featuredImage}
                              alt={art.imageAlt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                              {art.category}
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5 font-medium">
                              <span>{art.readingTime}</span>
                              <span>•</span>
                              <span>{art.publishDate}</span>
                            </div>

                            <h4 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-snug line-clamp-2 mb-2">
                              {art.title}
                            </h4>

                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {art.metaDescription}
                            </p>
                          </div>
                        </div>

                        <div className="p-5 pt-0 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80 mt-2">
                          <span className="text-[11px] text-slate-400">{art.readingTime}</span>
                          <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Read</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {/* Inject In-Feed Native Sponsored Card after article 2 */}
                      {index === 1 && (
                        <div className="sm:col-span-2">
                          <AdSenseBanner type="in_feed" slotId="pub-98410294-feed" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Right Column: Sticky Sidebar (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Sticky AdSense Medium Rectangle (300x250) */}
                <AdSenseBanner type="sidebar_rectangle" slotId="pub-98410294-side" />

                {/* Popular Content Sidebar */}
                <PopularArticlesSidebar
                  articles={liveArticles}
                  onSelectArticle={handleSelectArticle}
                  title="Popular Stories"
                  subtitle="Most Read Intelligence"
                />

                {/* Popular Focus Topics Tag Cloud */}
                <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="font-bold font-heading text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Popular Topics</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'AI Prompting',
                      'Cybersecurity',
                      'Password Managers',
                      'Anti-Phishing',
                      'Remote Work',
                      'Team Collaboration',
                      'Wi-Fi & Networks',
                      'Account Privacy',
                      'Workflow Automation',
                      'Troubleshooting',
                    ].map((tag) => (
                      <span
                        key={tag}
                        onClick={() => {
                          setIsSearchOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Secondary Half-Page / Sticky Ad */}
                <AdSenseBanner type="sticky_sidebar" slotId="pub-98410294-halfpage" />
              </div>
            </div>

            {/* Bottom Anchor Ad (collapsible floating sticky banner) */}
            <AdSenseBanner type="anchor_bottom" slotId="pub-98410294-anchor" />
          </main>
        )}
      </div>

      {/* Footer */}
      <Footer
        lang={lang}
        onOpenPage={handleOpenPage}
        onOpenSitemap={() => setIsSitemapOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Global Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        articles={localizedLiveArticles}
        onSelectArticle={handleSelectArticle}
      />

      <SitemapModal
        isOpen={isSitemapOpen}
        onClose={() => setIsSitemapOpen(false)}
        articles={localizedLiveArticles}
        categories={categories}
        onSelectArticle={handleSelectArticle}
      />

      {isAdminOpen && (
        <AdminGate
          onAuthed={handleAdminAuthed}
          onClose={() => {
            setIsAdminOpen(false);
            if (/^\/admin/i.test(window.location.pathname)) go('/');
          }}
        >
        <AdminDashboard
          articles={articles}
          teamMembers={teamMembers}
          categories={categories}
          onAddArticle={handleAddArticle}
          onUpdateArticle={(updated) =>
            setArticles(
              articles.map((a) =>
                a.id === updated.id
                  ? {
                      ...updated,
                      slug: uniqueSlug(updated.slug || slugify(updated.title), articles.filter((x) => x.id !== updated.id).map((x) => x.slug)),
                    }
                  : a
              )
            )
          }
          onDeleteArticle={handleDeleteArticle}
          onSelectArticle={handleSelectArticle}
          onClose={() => {
            setIsAdminOpen(false);
            if (/^\/admin/i.test(window.location.pathname)) go('/');
          }}
          onBroadcastNotification={handleBroadcastNotification}
          onAddTeamMember={(newMember) => setTeamMembers([newMember, ...teamMembers])}
          onUpdateTeamMember={(updated) =>
            setTeamMembers(teamMembers.map((m) => (m.id === updated.id ? updated : m)))
          }
          onDeleteTeamMember={(id) => setTeamMembers(teamMembers.filter((m) => m.id !== id))}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
        </AdminGate>
      )}

      {adminReady && saveStatus.state !== 'idle' && (
        <div
          className={`fixed bottom-4 left-4 z-[210] rounded-lg px-3 py-2 text-xs font-semibold shadow-lg ${
            saveStatus.state === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {saveStatus.state === 'saving' && 'Saving to server…'}
          {saveStatus.state === 'saved' && 'Saved to server ✓'}
          {saveStatus.state === 'error' && `Failed to save: ${saveStatus.msg || 'error'}`}
        </div>
      )}

      {/* Cookie Consent Banner (GDPR / CCPA / Google AdSense compliant) */}
      <CookieConsentBanner lang={lang} />

      {/* Visitor AI Key BYOK Modal */}
      <VisitorAiKeyModal
        isOpen={isVisitorAiKeyModalOpen}
        onClose={() => setIsVisitorAiKeyModalOpen(false)}
      />

      {/* Google Maps Place Search & Directions Navigation Modal */}
      <GoogleMapsExplorer
        isOpen={isMapsExplorerOpen}
        onClose={() => setIsMapsExplorerOpen(false)}
        initialQuery={mapsInitialQuery}
      />
    </div>
  );
}
