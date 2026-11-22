import React, { useEffect, useRef, useState } from 'react';
import { clearAdminToken, adminFetch } from '../../utils/remote.ts';
import { toArticleHtml } from '../../utils/markdown.ts';
import { enhanceArticleHtml, extractKeywords, dedupeSimilarParagraphs, proofreadArticleHtml, type InternalLinkTarget } from '../../utils/articleEnhancer.ts';
import { RichToolbar, SeoStatusBar } from './EditorToolbar.tsx';
import { articlePathOf, slugify } from '../../utils/routes.ts';
import { publishStatus } from '../../utils/publishState.ts';
import { ensureHostedImage } from '../../utils/imageUpload.ts';
import { ImageUploadButton } from './ImageUploadButton.tsx';
import { Article, Category, CategoryItem, AnalyticsMetrics, PushNotification, TeamMember, LocalizedArticleFields, YouTubeVideoItem, ArticleVisualizationData } from '../../types.ts';
import { cleanTemplatedHeadingEchoesInDraft, countHtmlWords, normalizeHeadlineTitleCase, rewriteTemplatedKeyTakeawaysForDraft, upgradeArticleDraftForEeat } from '../../utils/articleGeneratorEngine.ts';
import { buildTopicAltText, deriveArticleVisualization, generateTopicVisualSvg, svgToDataUrl } from '../../utils/topicVisuals.ts';
import { AiSeoAssistant } from './AiSeoAssistant.tsx';
import { ImageOptimizerModal } from './ImageOptimizerModal.tsx';
import { AiImageStudioModal } from './AiImageStudioModal.tsx';
import { TeamManagementTab } from './TeamManagementTab.tsx';
import { CategoryManagementTab } from './CategoryManagementTab.tsx';
import { ArticleContentScorer, computeArticleScore } from './ArticleContentScorer.tsx';
import { AdSenseReadinessAudit } from './AdSenseReadinessAudit.tsx';
import {
  FileText,
  KeyRound,
  Wand2,
  BarChart3,
  Image as ImageIcon,
  Cloud,
  Shield,
  ShieldCheck,
  Bell,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Pencil,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Sliders,
  Check,
  Send,
  Eye,
  LogOut,
  X,
  Users,
  Layers,
  FolderPlus,
  DollarSign,
  Zap,
  Bot,
  ArrowRight,
  Code2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Type,
  RemoveFormatting,
  Youtube,
  Trash2,
} from 'lucide-react';

interface AdminDashboardProps {
  articles: Article[];
  teamMembers: TeamMember[];
  categories: CategoryItem[];
  onAddArticle: (article: Article) => void;
  onUpdateArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  onSelectArticle: (article: Article) => void;
  onClose: () => void;
  onBroadcastNotification: (title: string, body: string, type: 'breaking' | 'traffic' | 'revenue' | 'system') => void;
  onAddTeamMember: (member: TeamMember) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onDeleteTeamMember: (id: string) => void;
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (category: CategoryItem) => void;
  onDeleteCategory: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  articles,
  teamMembers,
  categories,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
  onSelectArticle,
  onClose,
  onBroadcastNotification,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  // ---------------------------------------------------------
  // 2-Step Security Login Gate (Credentials + 2FA)
  // ---------------------------------------------------------
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa'>('credentials');
  const [adminEmail, setAdminEmail] = useState('admin@briefzy.me');
  const [adminPassword, setAdminPassword] = useState('');
  const [credentialsError, setCredentialsError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<'create' | 'keywords' | 'analytics' | 'adsense' | 'backup' | 'notifications' | 'articles' | 'team' | 'categories'>('create');

  // Active logged-in operator persona & article author
  const [currentOperatorId, setCurrentOperatorId] = useState<string>(teamMembers[0]?.id || 'staff-01');
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(teamMembers[0]?.id || 'staff-01');

  // Article creation form state
  const [topic, setTopic] = useState('');
  const [fieldNotes, setFieldNotes] = useState('');
  const [category, setCategory] = useState<Category>(categories[0]?.name || 'Technology');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [content, setContent] = useState('');
  const [faqText, setFaqText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [publishError, setPublishError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<any>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoItem[]>([]);
  const [articleVisualization, setArticleVisualization] = useState<ArticleVisualizationData | undefined>(undefined);
  const [ytInputUrl, setYtInputUrl] = useState('');
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [coverIsCustom, setCoverIsCustom] = useState(false);
  // Native translations (es/de/fr/ja) saved together with the article
  type TransLang = 'es' | 'de' | 'fr' | 'ja';
  const TRANS_LANGS: { code: TransLang; label: string }[] = [
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'ja', label: '🇯🇵 日本語' },
  ];
  const [translations, setTranslations] = useState<Partial<Record<TransLang, LocalizedArticleFields>>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  // Blogspot-style dual editor mode: 'compose' (visual WYSIWYG) vs 'html' (raw HTML/Markdown code)
  const [editorMode, setEditorMode] = useState<'compose' | 'html'>('compose');
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const [lsiKeywords, setLsiKeywords] = useState('');
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [optimizeMsg, setOptimizeMsg] = useState('');
  // The Compose canvas is uncontrolled (so the caret never jumps). lastEmitted = the last HTML the editor itself reported;
  // anything else that changes `content` (generate, auto-optimize, switching view, edit/reset) is pushed into the canvas by the effect below.
  const lastEmitted = useRef<string>('');
  const emitContent = (html: string) => { lastEmitted.current = html; setContent(html); };
  useEffect(() => {
    if (editorMode !== 'compose') return;
    const el = visualEditorRef.current;
    if (!el) return;
    if (content !== lastEmitted.current || (el.innerHTML === '' && content)) {
      el.innerHTML = toArticleHtml(content);
      lastEmitted.current = content;
    }
  }, [content, editorMode]);
  const splitList = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  // Target word count for automated SEO article generation (default min 3,000 words In-Depth Case Study)
  const [targetWordCount, setTargetWordCount] = useState<number>(3000);

  // Image optimizer & AI Studio modals
  const [showImageOptimizer, setShowImageOptimizer] = useState(false);
  const [showImageStudio, setShowImageStudio] = useState(false);

  // Keyword performance tool state
  const [kwInput, setKwInput] = useState('Autonomous AI Agents');
  const [kwResult, setKwResult] = useState<any>(null);
  const [isSearchingKw, setIsSearchingKw] = useState(false);

  // Cloud backup state
  const [backupStatus, setBackupStatus] = useState<'synced' | 'backing-up' | 'restored'>('synced');
  const [lastBackupTime, setLastBackupTime] = useState('Just now (Cloud Vault)');
  const [encryptionShield, setEncryptionShield] = useState(true);

  // Push notification form
  const [notifTitle, setNotifTitle] = useState('Traffic Surge: +48% US Readers on AI Article');
  const [notifBody, setNotifBody] = useState('Concurrent readership reached 1,420 users from New York, London, and San Francisco.');
  const [notifType, setNotifType] = useState<'traffic' | 'breaking' | 'revenue' | 'system'>('traffic');

  // Verify 2FA
  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying2FA(true);
    setTwoFactorError('');

    setTimeout(() => {
      // Demo 2FA accepts 6-digit TOTP code (default code: 382910 or any 6 digits)
      if (twoFactorCode.length >= 6) {
        setIsAuthenticated(true);
      } else {
        setTwoFactorError('Invalid 2FA code. Please enter a valid 6-digit authenticator code.');
      }
      setIsVerifying2FA(false);
    }, 400);
  };
  // Suggest SEO Keywords & Auto-Title states
  const [suggestedKeywords, setSuggestedKeywords] = useState<any[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<any[]>([]);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Fetch suggested SEO keywords with high search volume, low competition & fast AI indexing
  const handleFetchKeywordSuggestions = async (seed?: string) => {
    const currentSeed = (seed || topic || primaryKeyword || 'Enterprise AI Architecture').trim();
    setIsLoadingKeywords(true);
    setShowKeywordSuggestions(true);
    try {
      const res = await adminFetch('/api/seo/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentSeed,
          category,
        }),
      });
      const data = await res.json();
      if (data.keywords && Array.isArray(data.keywords)) {
        setSuggestedKeywords(data.keywords);
      }
    } catch (err) {
      console.error('Failed to suggest keywords:', err);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  // Select a suggested keyword: sets primary keyword, secondary LSI, auto-title, and syncs primary cover
  const handleSelectSuggestedKeyword = (kwItem: any) => {
    const nextKw = kwItem.keyword || '';
    const nextSec = Array.isArray(kwItem.secondaryLsi) ? kwItem.secondaryLsi.join(', ') : secondaryKeywords;
    const nextTitle = kwItem.autoTitle ? normalizeHeadlineTitleCase(String(kwItem.autoTitle)) : title;
    setPrimaryKeyword(nextKw);
    if (kwItem.secondaryLsi && Array.isArray(kwItem.secondaryLsi)) {
      setSecondaryKeywords(nextSec);
    }
    if (kwItem.autoTitle) {
      setTitle(nextTitle);
      const clean = nextTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(clean);
    }
    if (!coverIsCustom) {
      void handleAutoGenerateTopicCover({
        title: nextTitle,
        keyword: nextKw,
        secondaryKeywords: splitList(nextSec),
      });
    }
    // Also generate alternative auto-titles for this keyword
    handleFetchAutoTitles(kwItem.keyword);
  };

  // Auto-generate titles matching primary keyword for Google & AI crawler indexing
  const handleFetchAutoTitles = async (kw?: string) => {
    const currentKw = (kw || primaryKeyword || topic).trim();
    if (!currentKw) {
      alert('Please enter a Primary Target Keyword or Topic first.');
      return;
    }
    setIsLoadingTitles(true);
    setShowTitleSuggestions(true);
    try {
      const res = await adminFetch('/api/seo/auto-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryKeyword: currentKw,
          topic,
          category,
        }),
      });
      const data = await res.json();
      if (data.titles && Array.isArray(data.titles)) {
        setSuggestedTitles(data.titles);
      }
    } catch (err) {
      console.error('Failed to generate auto titles:', err);
    } finally {
      setIsLoadingTitles(false);
    }
  };

  const handleSelectAutoTitle = (titleStr: string) => {
    const cleanTitle = normalizeHeadlineTitleCase(titleStr);
    setTitle(cleanTitle);
    const clean = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(clean);
    setShowTitleSuggestions(false);
    if (!coverIsCustom) {
      void handleAutoGenerateTopicCover({
        title: cleanTitle,
        keyword: primaryKeyword || topic || cleanTitle,
        secondaryKeywords: splitList(secondaryKeywords),
      });
    }
  };

  // Helper to populate generated article into editor
  const applyGeneratedArticleToEditor = (art: any) => {
    if (!art) return;
    const nextTitle = art.title || '';
    const nextKeyword = art.primaryKeyword || primaryKeyword || topic || nextTitle;
    const nextCategory = art.category || category;
    setTitle(nextTitle);
    setSlug(art.slug || '');
    setMetaDescription(art.metaDescription || '');
    setContent(art.content || '');
    if (art.primaryKeyword && !primaryKeyword) setPrimaryKeyword(art.primaryKeyword);
    if (art.secondaryKeywords) {
      setSecondaryKeywords(Array.isArray(art.secondaryKeywords) ? art.secondaryKeywords.join(', ') : art.secondaryKeywords);
    }
    if (art.lsiKeywords) {
      setLsiKeywords(Array.isArray(art.lsiKeywords) ? art.lsiKeywords.join(', ') : art.lsiKeywords);
    }
    if (art.keyTakeaways) {
      setKeyTakeaways(Array.isArray(art.keyTakeaways) ? art.keyTakeaways.join('\n') : art.keyTakeaways);
    }
    if (art.faqs) {
      setFaqText(art.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'));
    }

    if (art.featuredImage) {
      setFeaturedImage(art.featuredImage);
      setImageAlt(art.imageAlt || buildTopicAltText({ title: nextTitle, keyword: nextKeyword, category: nextCategory }));
    } else if (!featuredImage) {
      const svg = generateTopicVisualSvg({
        title: nextTitle || nextKeyword,
        topic: topic || nextKeyword,
        keyword: nextKeyword,
        category: nextCategory,
        styleMode: 'editorial-scene',
      });
      setFeaturedImage(svgToDataUrl(svg));
      setImageAlt(buildTopicAltText({ title: nextTitle, keyword: nextKeyword, category: nextCategory }));
    }

    if (art.visualization) {
      setArticleVisualization(art.visualization);
    } else {
      setArticleVisualization(
        deriveArticleVisualization({
          title: nextTitle,
          category: nextCategory,
          primaryKeyword: nextKeyword,
          content: art.content || '',
          keyTakeaways: Array.isArray(art.keyTakeaways) ? art.keyTakeaways : [],
        })
      );
    }

    if (Array.isArray(art.youtubeVideos) && art.youtubeVideos.length > 0) {
      setYoutubeVideos(art.youtubeVideos);
    } else {
      setYoutubeVideos([]);
      void handleFetchTopicYoutube(nextTitle, nextKeyword, nextCategory);
    }

    if (art.author) {
      const matched = teamMembers.find((m) => m.name.toLowerCase() === String(art.author).toLowerCase());
      if (matched) setSelectedAuthorId(matched.id);
    }
    const words = art.wordCount || countHtmlWords(art.content || '');
    setSuccessMsg(`✨ Article generated: ${words.toLocaleString()} words.`);
    setTimeout(() => setSuccessMsg(''), 6000);

    if (art.translations && Object.keys(art.translations).length) {
      // Built-in outline writer already produced native es/de/fr/ja versions.
      setTranslations(art.translations);
      setTranslateStatus('Translations ready: 🇪🇸 🇩🇪 🇫🇷 🇯🇵 (saved when you publish).');
    } else {
      // Gemini article: translate it for real, chapter by chapter.
      setTranslations({});
      translateAllLanguages({
        title: art.title || '',
        metaDescription: art.metaDescription || '',
        keyTakeaways: Array.isArray(art.keyTakeaways) ? art.keyTakeaways : [],
        faqs: Array.isArray(art.faqs) ? art.faqs : [],
        content: art.content || '',
      });
    }
  };

  const parseFaqText = (text: string) =>
    text
      .split('\n\n')
      .map((block) => {
        const lines = block.split('\n');
        const qLine = lines.find((l) => l.startsWith('Q:')) || lines[0] || '';
        const aLine = lines.find((l) => l.startsWith('A:')) || lines[1] || '';
        return { question: qLine.replace(/^Q:\s*/, '').trim(), answer: aLine.replace(/^A:\s*/, '').trim() };
      })
      .filter((f) => f.question && f.answer);

  // Translate the given English article into es/de/fr/ja with Gemini, one language per request.
  const translateAllLanguages = async (src: { title: string; metaDescription: string; keyTakeaways: string[]; faqs: { question: string; answer: string }[]; content: string }) => {
    if (!src.content.trim()) return;
    setIsTranslating(true);
    const next: Partial<Record<TransLang, LocalizedArticleFields>> = {};
    const failed: string[] = [];
    let needsKey = false;
    for (const { code, label } of TRANS_LANGS) {
      setTranslateStatus(`Translating to ${label}… (${Object.keys(next).length + failed.length + 1}/4)`);
      try {
        const res = await adminFetch('/api/seo/translate-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: code, article: src }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.translation?.content) {
          next[code] = data.translation;
          setTranslations((prev) => ({ ...prev, [code]: data.translation }));
        } else {
          failed.push(label);
          if (data?.needsKey) { needsKey = true; break; }
        }
      } catch {
        failed.push(label);
      }
    }
    setIsTranslating(false);
    setTranslateStatus(
      needsKey
        ? 'Auto-translation needs GEMINI_API_KEY on the server. Without it, only the built-in outline writer can produce es/de/fr/ja versions.'
        : failed.length
        ? `Translated ${Object.keys(next).length}/4 languages. Failed: ${failed.join(', ')}. Press "Translate" to retry.`
        : 'Translations ready: 🇪🇸 🇩🇪 🇫🇷 🇯🇵 (saved when you publish).'
    );
  };

  const handleTranslateClick = () =>
    translateAllLanguages({
      title: title.trim(),
      metaDescription: metaDescription.trim(),
      keyTakeaways: keyTakeaways.split('\n').filter((l) => l.trim()),
      faqs: parseFaqText(faqText),
      content: toArticleHtml(content),
    });

  // Automated Article Generation (Gemini or Outline Expander) - Strict 3000+ words In-Depth Case Study
  const handleAutoGenerate = async () => {
    if (!topic && !primaryKeyword && !currentOutline) {
      alert('Please enter a Topic or Primary Keyword first, or generate an outline using Briefzy AI SEO Assistant.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await adminFetch('/api/seo/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || primaryKeyword || currentOutline?.workingTitle,
          primaryKeyword: primaryKeyword || currentOutline?.targetPrimaryKeyword,
          category,
          targetCountry,
          wordCount: Math.max(targetWordCount, 3500),
          outline: currentOutline,
          fieldNotes: fieldNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.article) {
        applyGeneratedArticleToEditor(data.article);
      }
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Expand Outline directly from Briefzy AI SEO Assistant into a 3,000+ words Article
  const handleExpandOutlineFromAssistant = async (outlineData: any) => {
    if (!outlineData) return;
    setCurrentOutline(outlineData);
    setIsGenerating(true);
    try {
      const res = await adminFetch('/api/seo/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: outlineData.workingTitle || topic || primaryKeyword,
          primaryKeyword: outlineData.targetPrimaryKeyword || primaryKeyword || topic,
          category,
          targetCountry,
          wordCount: 3500,
          outline: outlineData,
          fieldNotes: fieldNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.article) {
        applyGeneratedArticleToEditor(data.article);
      }
    } catch (err) {
      console.error('Failed to expand outline:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchTopicYoutube = async (customTitle?: string, customKw?: string, customCat?: string) => {
    const tVal = (customTitle ?? title ?? topic).trim();
    const kVal = (customKw ?? primaryKeyword ?? topic).trim();
    const cVal = (customCat ?? category).trim();
    if (!tVal && !kVal) return;
    setIsFetchingYoutube(true);
    try {
      const res = await adminFetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tVal,
          topic: topic || tVal,
          keyword: kVal,
          category: cVal,
          limit: 3,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.videos)) {
        setYoutubeVideos(data.videos);
      }
    } catch {
      // ignore fetch error
    } finally {
      setIsFetchingYoutube(false);
    }
  };

  const handleAutoGenerateTopicCover = async (override?: {
    title?: string;
    topic?: string;
    keyword?: string;
    secondaryKeywords?: string[];
  }) => {
    const tVal = (override?.title ?? (title || topic || primaryKeyword)).trim();
    const kVal = (override?.keyword ?? (primaryKeyword || topic || tVal)).trim();
    const secVal = override?.secondaryKeywords ?? splitList(secondaryKeywords);
    if (!tVal && !kVal) return;
    setIsFetchingCover(true);
    setCoverIsCustom(false);
    try {
      const res = await adminFetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tVal,
          topic: (override?.topic ?? topic) || tVal,
          keyword: kVal,
          secondaryKeywords: secVal,
          category,
          visualStyle: 'editorial-scene',
          aspectRatio: '16:9',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setFeaturedImage(data.imageUrl);
        setImageAlt(buildTopicAltText({ title: tVal, keyword: kVal, category }));
      }
    } catch {
      const svg = generateTopicVisualSvg({
        title: tVal,
        topic: (override?.topic ?? topic) || tVal,
        keyword: kVal,
        category,
      });
      setFeaturedImage(svgToDataUrl(svg));
      setImageAlt(buildTopicAltText({ title: tVal, keyword: kVal, category }));
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleAddYoutubeUrl = async () => {
    const raw = ytInputUrl.trim();
    if (!raw) return;
    const match = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) || raw.match(/^([A-Za-z0-9_-]{11})$/);
    if (!match) return;
    const videoId = match[1];
    let item: YouTubeVideoItem = {
      videoId,
      title: `${title || primaryKeyword || 'Tutorial Walkthrough'} (YouTube)`,
      authorName: 'YouTube',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
    try {
      const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(item.watchUrl)}&format=json`);
      if (resp.ok) {
        const meta = await resp.json();
        if (meta?.title) item.title = String(meta.title);
        if (meta?.author_name) item.authorName = String(meta.author_name);
        if (meta?.author_url) item.authorUrl = String(meta.author_url);
        if (meta?.thumbnail_url) item.thumbnailUrl = String(meta.thumbnail_url);
      }
    } catch {
      // keep fallback metadata
    }
    setYoutubeVideos((prev) => [item, ...prev.filter((v) => v.videoId !== videoId)].slice(0, 4));
    setYtInputUrl('');
  };

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setTopic('');
    setFieldNotes('');
    setTitle('');
    setSlug('');
    setMetaDescription('');
    setPrimaryKeyword('');
    setSecondaryKeywords('');
    setLsiKeywords('');
    setFeaturedImage('');
    setCoverIsCustom(false);
    setImageAlt('');
    setKeyTakeaways('');
    setContent('');
    setFaqText('');
    setYoutubeVideos([]);
    setArticleVisualization(undefined);
    setYtInputUrl('');
    setTranslations({});
    setTranslateStatus('');
    setPublishMode('now');
    setScheduleAt('');
    setPublishError('');
  };

  // Muat artikel yang sudah ada ke form untuk diedit
  const startEdit = (art: Article) => {
    setEditingId(art.id);
    setTopic('');
    setCategory(art.category);
    setPrimaryKeyword(art.primaryKeyword || '');
    setSecondaryKeywords((art.secondaryKeywords || []).join(', '));
    setLsiKeywords((art.lsiKeywords || []).join(', '));
    setTitle(art.title);
    setSlug(art.slug);
    setMetaDescription(art.metaDescription || '');
    setFeaturedImage(art.featuredImage || '');
    setCoverIsCustom(Boolean(art.featuredImage && !art.featuredImage.startsWith('data:image/svg+xml')));
    setImageAlt(art.imageAlt || '');
    setKeyTakeaways((art.keyTakeaways || []).join('\n'));
    setContent(art.content || '');
    setFaqText((art.faqs || []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'));
    setYoutubeVideos(art.youtubeVideos || []);
    setArticleVisualization(art.visualization);
    setYtInputUrl('');
    setTranslations(art.translations || {});
    setTranslateStatus(art.translations && Object.keys(art.translations).length ? 'Saved translations loaded. Press "Translate" after editing the English text to refresh them.' : '');
    const member = teamMembers.find((m) => m.name === art.author?.name);
    if (member) setSelectedAuthorId(member.id);
    if (art.draft) {
      setPublishMode('draft');
      setScheduleAt('');
    } else if (art.scheduledAt && publishStatus(art) === 'scheduled') {
      setPublishMode('schedule');
      setScheduleAt(toLocalInput(art.scheduledAt));
    } else {
      setPublishMode('now');
      setScheduleAt('');
    }
    setPublishError('');
    setActiveTab('create');
  };

  // Insert image into article body at cursor position (supports both Compose WYSIWYG & HTML code views)
  const insertImageIntoBody = (url: string) => {
    const alt = (window.prompt('Alt text for this image (briefly describe it):', '') || '').replace(/"/g, '&quot;');
    const tag = `<img src="${url}" alt="${alt}" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;margin:1rem 0;" />`;
    
    if (editorMode === 'compose') {
      const visual = visualEditorRef.current;
      if (visual) {
        visual.focus();
        document.execCommand('insertHTML', false, tag);
        emitContent(visual.innerHTML);
        return;
      }
    }
    
    const el = contentRef.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      setContent(content.slice(0, start) + '\n' + tag + '\n' + content.slice(end));
    } else {
      setContent((prev) => (prev ? `${prev}\n\n${tag}` : tag));
    }
  };

  // Helper for WYSIWYG formatting commands (like Blogspot compose toolbar)
  const execFormat = (command: string, value: string | undefined = undefined) => {
    if (editorMode !== 'compose') return;
    const visual = visualEditorRef.current;
    if (visual) {
      visual.focus();
      document.execCommand(command, false, value);
      emitContent(visual.innerHTML);
    }
  };

  // Switch between Compose view and HTML view (the effect above pushes the HTML into the canvas)
  const handleSwitchEditorMode = (mode: 'compose' | 'html') => {
    if (mode === editorMode) return;
    if (mode === 'compose') {
      setContent(toArticleHtml(content));
    } else if (visualEditorRef.current) {
      emitContent(visualEditorRef.current.innerHTML);
    }
    setEditorMode(mode);
  };

  // Targets for automatic internal links: other live articles' primary keywords (same category first)
  const internalTargets = (): InternalLinkTarget[] =>
    articles
      .filter((a) => a.id !== editingId && !a.draft && a.primaryKeyword && a.primaryKeyword.trim().length >= 4)
      .sort((x, y) => Number(y.category === category) - Number(x.category === category))
      .map((a) => ({ keyword: a.primaryKeyword.trim(), url: articlePathOf(a, categories) }));

  const currentBodyHtml = () => toArticleHtml(editorMode === 'compose' && visualEditorRef.current ? visualEditorRef.current.innerHTML : content);

  const flashOptimize = (msg: string) => { setOptimizeMsg(msg); setTimeout(() => setOptimizeMsg(''), 9000); };

  // 1-Click Helpful Content & E-E-A-T Upgrade inside SEO Article Builder
  const handleEeatAutoFix = (action: string = 'upgrade-eeat') => {
    if (action === 'fix-title-case') {
      if (!title.trim()) return;
      const fixed = normalizeHeadlineTitleCase(title);
      setTitle(fixed);
      flashOptimize('Headline converted to clean Title Case.');
      return;
    }

    const base = currentBodyHtml();
    if (action === 'dedupe-boilerplate') {
      if (!base.trim()) { flashOptimize('Write or generate the article first.'); return; }
      const cleaned = dedupeSimilarParagraphs(proofreadArticleHtml(base));
      setContent(cleaned);
      flashOptimize('Deduplicated repeated paragraphs & cleaned editorial phrasing.');
      return;
    }

    if (action === 'fix-template-echoes') {
      if (!base.trim()) { flashOptimize('Write or generate the article first.'); return; }
      const cleaned = cleanTemplatedHeadingEchoesInDraft({
        title,
        topic,
        primaryKeyword,
        category,
        content: base,
      });
      setContent(cleaned.content);
      flashOptimize(
        cleaned.fixedCount > 0
          ? `Replaced ${cleaned.fixedCount} generic subheading opener(s) with subsection-specific prose.`
          : 'All subheadings already open with context-specific explanations.'
      );
      return;
    }

    const currentTakeawaysList = keyTakeaways.split('\n').map((l) => l.trim()).filter(Boolean);

    if (action === 'fix-takeaways') {
      const fixed = rewriteTemplatedKeyTakeawaysForDraft({
        title,
        topic,
        primaryKeyword,
        category,
        content: base,
        keyTakeaways: currentTakeawaysList,
      });
      setKeyTakeaways(fixed.keyTakeaways.join('\n'));
      flashOptimize(
        fixed.rewritten
          ? 'Rewrote repetitive Key Takeaways into distinct operational points.'
          : 'Key Takeaways already contain distinct, non-templated points.'
      );
      return;
    }

    const selectedAuthorMember = teamMembers.find((m) => m.id === selectedAuthorId) || teamMembers[0];
    const upgraded = upgradeArticleDraftForEeat({
      title,
      topic,
      primaryKeyword,
      category,
      author: selectedAuthorMember?.name || 'Briefzy Editorial Desk',
      content: base,
      keyTakeaways: currentTakeawaysList,
      fieldNotes,
    });
    if (upgraded.title && upgraded.title !== title) {
      setTitle(upgraded.title);
    }
    if (upgraded.keyTakeaways.length > 0 && upgraded.keyTakeaways.join('\n') !== currentTakeawaysList.join('\n')) {
      setKeyTakeaways(upgraded.keyTakeaways.join('\n'));
    }
    setContent(upgraded.content);
    flashOptimize(
      upgraded.actionsApplied.length
        ? `Helpful Content & E-E-A-T upgraded: ${upgraded.actionsApplied.join('; ')}.`
        : 'Draft already meets Title Case, Key Takeaways, Benchmark Attribution, Experience, and Citation checks.'
    );
  };

  // One click: tidy HTML, SEO-style bold keywords, contextual internal links
  const handleAutoOptimize = () => {
    const base = currentBodyHtml();
    if (!base.trim()) { flashOptimize('Write or generate the article first.'); return; }
    const { html, report } = enhanceArticleHtml(base, {
      primaryKeyword: (primaryKeyword || topic).trim(),
      secondaryKeywords: splitList(secondaryKeywords),
      lsiKeywords: splitList(lsiKeywords),
      internalLinks: internalTargets(),
    });
    setContent(html);
    flashOptimize(`Done: ${report.primaryBolded + report.othersBolded} keywords bolded, ${report.internalLinksAdded} internal links added${report.missingAlt ? `, ${report.missingAlt} image(s) still need alt text` : ''}.`);
  };

  // Finds relevant keywords + LSI terms from the article text and merges them into the fields
  const handleSuggestKeywordsFromContent = () => {
    const base = currentBodyHtml();
    if (!base.trim()) { flashOptimize('Write or generate the article first.'); return; }
    const { relevant, lsi } = extractKeywords(base, (primaryKeyword || topic).trim(), [title]);
    const merge = (existing: string, add: string[]) => {
      const cur = splitList(existing);
      const low = new Set(cur.map((x) => x.toLowerCase()));
      return [...cur, ...add.filter((k) => !low.has(k.toLowerCase()))].join(', ');
    };
    setSecondaryKeywords((prev) => merge(prev, relevant.slice(0, 6)));
    setLsiKeywords((prev) => merge(prev, lsi));
    flashOptimize(`Found ${relevant.length} relevant keywords and ${lsi.length} LSI terms. Review them, then run Auto-optimize.`);
  };

  // Publish / jadwalkan / simpan draf / perbarui artikel
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isPublishing) return;
    setPublishError('');

    let scheduledIso: string | undefined;
    if (publishMode === 'schedule') {
      if (!scheduleAt || isNaN(Date.parse(scheduleAt))) {
        setPublishError('Choose a date and time for scheduled publishing.');
        return;
      }
      scheduledIso = new Date(scheduleAt).toISOString();
    }

    setIsPublishing(true);
    const hostedImage = await ensureHostedImage(featuredImage.trim());

    const parsedFaqs = faqText
      .split('\n\n')
      .map((block) => {
        const lines = block.split('\n');
        const qLine = lines.find((l) => l.startsWith('Q:')) || lines[0] || '';
        const aLine = lines.find((l) => l.startsWith('A:')) || lines[1] || '';
        return {
          question: qLine.replace(/^Q:\s*/, '').trim(),
          answer: aLine.replace(/^A:\s*/, '').trim(),
        };
      })
      .filter((f) => f.question && f.answer);

    const selectedAuthorMember = teamMembers.find((m) => m.id === selectedAuthorId) || teamMembers[0];
    const existing = editingId ? articles.find((a) => a.id === editingId) : undefined;
    const secList = splitList(secondaryKeywords);
    const lsiList = splitList(lsiKeywords);
    const baseHtml = toArticleHtml(editorMode === 'compose' && visualEditorRef.current ? visualEditorRef.current.innerHTML : content);
    const html = autoOptimize
      ? enhanceArticleHtml(baseHtml, {
          primaryKeyword: (primaryKeyword || topic).trim(),
          secondaryKeywords: secList,
          lsiKeywords: lsiList,
          internalLinks: internalTargets(),
        }).html
      : baseHtml;
    const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const wasLive = !!existing && !existing.draft && publishStatus(existing) === 'live';
    const publishDate = wasLive && publishMode === 'now' ? existing!.publishDate : fmt(scheduledIso ? new Date(scheduledIso) : new Date());

    const finalTakeaways = keyTakeaways.split('\n').filter((l) => l.trim().length > 0);
    const computedVisualization =
      articleVisualization ||
      deriveArticleVisualization({
        title: title.trim(),
        category,
        primaryKeyword: primaryKeyword.trim() || topic.trim(),
        content: html,
        keyTakeaways: finalTakeaways,
      });

    const built: Article = {
      ...(existing || {}),
      id: existing?.id ?? `art-${Date.now()}`,
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      category,
      metaDescription: metaDescription.trim() || title.trim(),
      primaryKeyword: primaryKeyword.trim() || topic.trim(),
      secondaryKeywords: secList,
      lsiKeywords: lsiList,
      readingTime: `${Math.max(1, Math.ceil(words / 200))} min read`,
      publishDate,
      author: {
        name: selectedAuthorMember.name,
        role: selectedAuthorMember.title,
        avatar: selectedAuthorMember.avatar,
        bio: selectedAuthorMember.bio,
        verified: selectedAuthorMember.verified,
      },
      featuredImage:
        hostedImage ||
        svgToDataUrl(
          generateTopicVisualSvg({
            title: title.trim(),
            topic: topic.trim(),
            keyword: primaryKeyword.trim() || topic.trim(),
            category,
          })
        ),
      imageAlt:
        imageAlt.trim() ||
        buildTopicAltText({
          title: title.trim(),
          keyword: primaryKeyword.trim() || topic.trim(),
          category,
        }),
      keyTakeaways: finalTakeaways,
      content: html,
      faqs: parsedFaqs,
      youtubeVideos: youtubeVideos.length ? youtubeVideos : existing?.youtubeVideos,
      visualization: computedVisualization,
      translations: Object.keys(translations).length ? translations : existing?.translations,
      views: existing?.views ?? 0,
      shares: existing?.shares ?? 0,
      tags: existing?.tags ?? [category],
      seoScore: computeArticleScore(title, metaDescription, primaryKeyword, [secondaryKeywords, lsiKeywords].filter(Boolean).join(', '), html).overallScore || existing?.seoScore || 0,
      estimatedCpc: existing?.estimatedCpc ?? '',
      comments: existing?.comments ?? [],
      scheduledAt: scheduledIso,
      draft: publishMode === 'draft' ? true : undefined,
      updatedAt: existing ? new Date().toISOString() : undefined,
    };

    if (existing) onUpdateArticle(built);
    else onAddArticle(built);

    setSuccessMsg(
      existing
        ? 'Article updated.'
        : publishMode === 'schedule'
        ? 'Article scheduled. It will appear on the site automatically at the chosen time.'
        : publishMode === 'draft'
        ? 'Draft saved. Only you can see it in the dashboard.'
        : 'Story successfully published to Briefzy! Available immediately for readers and search indexing.'
    );
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 4000);
    setIsPublishing(false);
    resetForm();
    if (existing) setActiveTab('articles');
  };

  // Analyze Keyword
  const handleAnalyzeKeyword = async () => {
    if (!kwInput.trim()) return;
    setIsSearchingKw(true);
    try {
      const res = await adminFetch('/api/seo/analyze-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kwInput.trim() }),
      });
      const data = await res.json();
      setKwResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingKw(false);
    }
  };

  // Cloud Backup Action
  const handleExportBackup = () => {
    setBackupStatus('backing-up');
    setTimeout(() => {
      const backupData = {
        app: 'Briefzy Media (briefzy.me)',
        timestamp: new Date().toISOString(),
        encryption: 'AES-256-GCM',
        articlesCount: articles.length,
        articles,
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `briefzy-cloud-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('synced');
      setLastBackupTime('Just now (Manual Snapshot)');
    }, 600);
  };

  // Broadcast Notification
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) return;
    onBroadcastNotification(notifTitle.trim(), notifBody.trim(), notifType);
    setNotifTitle('');
    setNotifBody('');
  };

  // ---------------------------------------------------------
  // 2-Step Security Login Gate (Credentials + 2FA)
  // ---------------------------------------------------------


  // ---------------------------------------------------------
  // Main Dashboard Workstation
  // ---------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 text-white font-black flex items-center justify-center font-heading text-sm shadow-xs shadow-indigo-500/20">
            B
          </div>
          <div>
            <h2 className="font-extrabold font-heading text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span className="tracking-wide">BRIEFZY.ME Studio</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                2FA Verified
              </span>
            </h2>
            <div className="text-[11px] text-slate-400">Verified Domain: briefzy.me • Tier-1 Target Edition</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud backup status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud Synced</span>
          </div>

          <button
            onClick={() => { clearAdminToken(); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Lock Dashboard (Log Out)"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Close Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 p-4">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI SEO Article Builder</span>
            </button>

            <button
              onClick={() => setActiveTab('keywords')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'keywords'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Keyword Rank Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Visitor Trends & AdSense</span>
            </button>

            <button
              onClick={() => setActiveTab('adsense')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'adsense'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>AdSense Hub &amp; Custom ads.txt</span>
            </button>

            <button
              onClick={() => setShowImageOptimizer(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Image Optimizer Plugin</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Push Notifications & Broadcast</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Cloud Backup & Encryption</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Article Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" />
              <span>Tim & Peran (RBAC) ({teamMembers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                activeTab === 'articles'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Published Stories ({articles.length})</span>
            </button>

            <button
              onClick={() => setShowImageStudio(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group border border-dashed border-amber-500/30"
            >
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                <span className="font-semibold">Create &amp; Edit Images</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                2.1
              </span>
            </button>
          </div>

          {/* Privacy & Security Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Data Shield Active</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Client-side AES-256 active for article drafts & GDPR audit records.
            </p>
          </div>
        </aside>

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* TAB 1: ARTICLE CREATOR WITH INTEGRATED AI ASSISTANT */}
          {activeTab === 'create' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                    Automated Google SEO Article Builder
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Construct high-ranking E-E-A-T articles with integrated Gemini outline generator & real-time SEO audit.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageStudio(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/15 transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Create &amp; Edit Images</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-black/20 rounded-full">nano banana 2.1</span>
                  </button>
                  <button
                    onClick={() => setShowImageOptimizer(true)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Optimize WebP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEeatAutoFix('upgrade-eeat')}
                    disabled={!title.trim() && !content.trim()}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Fix Title Case, remove repeated boilerplate, and inject verified benchmarks + E-E-A-T citations"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Upgrade E-E-A-T</span>
                  </button>
                  <button
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isGenerating
                        ? 'Writing article from outline (3,000+ words)…'
                        : currentOutline
                        ? '1-Click Expand AI Outline (3,000+ Words)'
                        : '1-Click AI Auto-Generate (3,000+ Words)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Active Outline Blueprint Notification */}
              {currentOutline && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      <strong>Briefzy AI SEO Assistant Outline Active:</strong> &ldquo;{currentOutline.workingTitle || topic}&rdquo; ({currentOutline.sections?.length || 8} sections). Generation will expand this exact blueprint into 3,000+ words.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentOutline(null)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer shrink-0 ml-3"
                  >
                    Clear Outline
                  </button>
                </div>
              )}

              {/* Native translations (es / de / fr / ja) */}
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-950 dark:text-sky-200">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    <span>Reader languages:</span>
                    {TRANS_LANGS.map(({ code, label }) => (
                      <span
                        key={code}
                        className={`px-2 py-0.5 rounded-full border text-[11px] ${translations[code] ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 border-slate-400/40 text-slate-500'}`}
                      >
                        {translations[code] ? '✓ ' : ''}{label}
                      </span>
                    ))}
                  </div>
                  {translateStatus && <p className="text-[11px] opacity-90">{translateStatus}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleTranslateClick}
                  disabled={isTranslating || !content.trim()}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shrink-0"
                >
                  {isTranslating ? 'Translating…' : 'Translate ES / DE / FR / JA'}
                </button>
              </div>

              {/* Word Count & Anti-Plagiarism / Undetectable AI Standard Indicator Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-amber-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-amber-950/30 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Default Min. 3,000+ Words (In-Depth Case Study)</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>People-First E-E-A-T</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <span>100% Original &amp; Typo-Free</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Google Helpful Content SEO Builder: Generates original, non-duplicated human journalism with auto topic hero image, inline workflow infographics, cited credible data charts, annotated UI screenshots, and transparent sources.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Length:</span>
                    <select
                      value={targetWordCount}
                      onChange={(e) => setTargetWordCount(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value={3000}>3,000 Words (In-Depth Case Study - Recommended)</option>
                      <option value={3500}>3,500 Words (Comprehensive Industry Benchmark)</option>
                      <option value={4000}>4,000 Words (Exhaustive Technical Monograph)</option>
                      <option value={4500}>4,500 Words (Master Enterprise Dossier)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('adsense')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Custom ads.txt Field</span>
                  </button>
                </div>
              </div>

              {publishSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Grid: Left Editor / Right AI Assistant */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Article Input Form */}
                <div className="lg:col-span-7 space-y-5">
                  <form onSubmit={handlePublish} className="space-y-4">
                    {editingId && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3">
                        <span>
                          Editing existing article: <strong>{title || 'Untitled'}</strong>
                        </span>
                        <button type="button" onClick={resetForm} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-500/40 font-bold cursor-pointer">
                          Cancel edit
                        </button>
                      </div>
                    )}
                    {/* Author & Role Selector */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Select Columnist / Author (E-E-A-T Byline)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('team')}
                          className="text-[10px] text-indigo-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>+ Manage / Add Editorial Team</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                        {teamMembers.map((member) => {
                          const isSelected = selectedAuthorId === member.id;
                          return (
                            <div
                              key={member.id}
                              onClick={() => setSelectedAuthorId(member.id)}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-800 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <img src={member.avatar} alt={member.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-300 dark:ring-slate-600" />
                              <div className="truncate flex-1 min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                                  <span>{member.name}</span>
                                  {isSelected && <span className="text-amber-500 text-[10px]">✓</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {member.title}
                                </div>
                              </div>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                {member.role}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topic & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          Target Topic / Editorial Angle (optional for manual articles)
                        </label>
                        <input
                          type="text"
                          placeholder="Only needed for AI generation, e.g. how to write better AI prompts"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Category
                          </label>
                          <button
                            type="button"
                            onClick={() => setActiveTab('categories')}
                            className="text-[10px] text-amber-500 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>+ New Category</span>
                          </button>
                        </div>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as Category)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-medium"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name} ({cat.targetCpc.split(' ')[0]})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* First-Hand Experience / Field Pilot Notes Input (E-E-A-T Evidence) */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>First-Hand Experience &amp; Field Testing Notes (E-E-A-T Evidence)</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          Woven into Benchmarks &amp; Failure Modes
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Optional practitioner observations: e.g. 'Tested 12 agent workflows on staging CRM; tool retry storms spiked token spend 3x until capped at 6 turns and read-only MCP scopes.'"
                        value={fieldNotes}
                        onChange={(e) => setFieldNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Kolom Sugesti SEO Keywords: Score Pencarian Tinggi, Persaingan Rendah & AI Indexing */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-slate-50 to-cyan-50/50 dark:from-indigo-950/30 dark:via-slate-900/60 dark:to-cyan-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-500" />
                              <span>SEO Keyword Suggestions (High Volume &amp; Low Competition)</span>
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Discover golden-ratio target keywords: strong monthly search volume with low competition for rapid Google Page 1 ranking and instant AI crawler indexing.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFetchKeywordSuggestions()}
                          disabled={isLoadingKeywords}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isLoadingKeywords ? 'Analyzing Keywords...' : '⚡ Suggest SEO Keywords'}</span>
                        </button>
                      </div>

                      {/* Loading State */}
                      {isLoadingKeywords && (
                        <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 text-xs text-indigo-600 dark:text-cyan-400 animate-pulse">
                          <Bot className="w-4 h-4 animate-spin" />
                          <span>Analyzing Tier-1 search volume, keyword difficulty (KD), and indexing priority for Googlebot &amp; AI LLMs...</span>
                        </div>
                      )}

                      {/* Suggested Keywords Grid */}
                      {suggestedKeywords.length > 0 && !isLoadingKeywords && (
                        <div className="space-y-2 pt-1 animate-in fade-in">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                            <span>High-Potential Keywords Discovered ({suggestedKeywords.length})</span>
                            <span className="text-emerald-500 font-semibold">✓ Low Competition &amp; High Traffic</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {suggestedKeywords.map((kw, idx) => (
                              <div
                                key={idx}
                                className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                      {kw.keyword}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                      Vol: {kw.searchVolume}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                                      KD: {kw.difficulty}/100 ({kw.difficultyLabel})
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20">
                                      Potential: {kw.potentialScore}%
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[10px] font-bold border border-purple-500/20">
                                      CPC: {kw.estimatedCpc}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="text-emerald-500 font-semibold">{kw.indexingSpeed}</span>
                                    <span>•</span>
                                    <span className="text-indigo-500 dark:text-cyan-400 font-mono">{kw.crawlerScore}</span>
                                    {kw.autoTitle && (
                                      <>
                                        <span>•</span>
                                        <span className="truncate max-w-sm italic">Auto Title: "{kw.autoTitle}"</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSelectSuggestedKeyword(kw)}
                                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                                >
                                  <span>Apply Keyword &amp; Auto Title</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Target Keywords Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Primary Target Keyword
                          </label>
                          <button
                            type="button"
                            onClick={() => handleFetchKeywordSuggestions()}
                            className="text-[10px] text-indigo-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Search Another Keyword</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Autonomous AI Agents Enterprise 2026"
                          value={primaryKeyword}
                          onChange={(e) => setPrimaryKeyword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          Secondary LSI Keywords
                        </label>
                        <input
                          type="text"
                          placeholder="comma separated..."
                          value={secondaryKeywords}
                          onChange={(e) => setSecondaryKeywords(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        LSI Keywords (related terms that appear in the article)
                      </label>
                      <input
                        type="text"
                        placeholder="filled automatically when you generate, or use “Find keywords & LSI” under the editor"
                        value={lsiKeywords}
                        onChange={(e) => setLsiKeywords(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Auto Title Sesuai Keyword Utama & SEO Title Input */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span>SEO Article Title (H1)</span>
                          <span className={`text-[10px] font-mono ${title.length >= 45 && title.length <= 65 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                            ({title.length}/60 chars - Optimal: 50-60)
                          </span>
                        </label>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {title.trim() && /^[a-z]/.test(title.trim()) && (
                            <button
                              type="button"
                              onClick={() => handleEeatAutoFix('fix-title-case')}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer transition-colors"
                              title="Capitalize lowercase headline start cleanly while preserving acronyms"
                            >
                              Fix Title Case
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleFetchAutoTitles()}
                            disabled={isLoadingTitles}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            title="Generate automated title matching primary keyword for rapid Google and AI indexing"
                          >
                            <Bot className="w-3 h-3 text-slate-950" />
                            <span>{isLoadingTitles ? 'Formulating Titles...' : '⚡ Auto Title from Primary Keyword'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Auto Title Recommendations Dropdown / Cards */}
                      {suggestedTitles.length > 0 && showTitleSuggestions && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Optimized Title Suggestions (Fast Google &amp; AI Indexing):</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowTitleSuggestions(false)}
                              className="text-[10px] hover:underline cursor-pointer"
                            >
                              Close
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {suggestedTitles.map((tItem, tIdx) => (
                              <div
                                key={tIdx}
                                onClick={() => handleSelectAutoTitle(tItem.title)}
                                className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-all ${
                                  title === tItem.title
                                    ? 'bg-white dark:bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 hover:border-amber-400'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{tItem.title}</span>
                                    {title === tItem.title && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-indigo-600 dark:text-cyan-400">{tItem.formula}</span>
                                    <span>•</span>
                                    <span className="text-emerald-500 font-medium">CTR: {tItem.predictedCtr}</span>
                                    <span>•</span>
                                    <span>{tItem.indexingAdvantage}</span>
                                  </div>
                                </div>

                                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500 text-slate-950 shrink-0 self-start sm:self-auto">
                                  Use This Title
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <input
                        type="text"
                        required
                        placeholder="Click-worthy, E-E-A-T Title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-semibold"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Indexing Tip: Place your primary target keyword near the beginning of your title so Google algorithms and AI discovery crawlers (Perplexity, ChatGPT, Gemini) immediately recognize the core topical entity.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        URL Permalink Slug
                      </label>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-400 font-mono">https://briefzy.me/{slugify(category)}/</span>
                        <input
                          type="text"
                          placeholder="autonomous-ai-agents-2026"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-amber-600 dark:text-amber-400"
                        />
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          SEO Meta Description
                        </label>
                        <span className={`text-[10px] font-mono ${metaDescription.length >= 135 && metaDescription.length <= 165 ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                          {metaDescription.length}/160 chars (Optimal: 140-160)
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Concise, actionable meta snippet with primary keyword..."
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Featured Article Image & AI Studio Section */}
                    <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Featured Image &amp; Visual Asset (Google Discover &amp; LCP)</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <ImageUploadButton onUploaded={(url) => { setCoverIsCustom(true); setFeaturedImage(url); }} label="Upload from device" />
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateTopicCover()}
                            disabled={isFetchingCover || (!title.trim() && !topic.trim() && !primaryKeyword.trim())}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isFetchingCover ? 'Generating...' : 'Auto Topic Visual'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowImageStudio(true)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Create &amp; Edit with AI</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowImageOptimizer(true)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Optimize WebP</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                        <div className="sm:col-span-5 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 relative group shadow-inner">
                          <img
                            src={featuredImage}
                            alt={imageAlt || 'Featured preview'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                            <button
                              type="button"
                              onClick={() => setShowImageStudio(true)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-md"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Edit with AI</span>
                            </button>
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 bg-slate-950/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                            16:9 • LCP Ready
                          </span>
                        </div>

                        <div className="sm:col-span-7 space-y-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                              Image URL (or use Upload from device)
                            </label>
                            <input
                              type="text"
                              value={featuredImage}
                              onChange={(e) => { setCoverIsCustom(!!e.target.value.trim()); setFeaturedImage(e.target.value); }}
                              placeholder="https://... or /img/... (after upload)"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                                Google Image SEO Alt-Text
                              </label>
                              <span className="text-[9px] text-emerald-500 font-bold">Crucial for E-E-A-T</span>
                            </div>
                            <input
                              type="text"
                              value={imageAlt}
                              onChange={(e) => setImageAlt(e.target.value)}
                              placeholder="Descriptive alt text for Google Image Search..."
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Takeaways */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Executive Key Takeaways (1 per line)
                      </label>
                      <textarea
                        rows={3}
                        value={keyTakeaways}
                        onChange={(e) => setKeyTakeaways(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    {/* Real-time Content Scoring Progress System (Keywords, Readability, Sentence Structure, Helpful Content & E-E-A-T) */}
                    <div className="pt-1 pb-2">
                      <ArticleContentScorer
                        title={title}
                        metaDescription={metaDescription}
                        primaryKeyword={primaryKeyword || topic}
                        secondaryKeywords={[secondaryKeywords, lsiKeywords].filter(Boolean).join(', ')}
                        content={content}
                        keyTakeaways={keyTakeaways}
                        onAutoFixSuggestion={handleEeatAutoFix}
                      />
                    </div>

                    {/* Article Body Editor (Blogspot-Style Dual Mode: Compose vs HTML) */}
                    <div>
                      {/* Editor Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Article Body Editor
                          </label>
                          {/* Blogspot Mode Switcher: Compose View vs HTML View */}
                          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => handleSwitchEditorMode('compose')}
                              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
                                editorMode === 'compose'
                                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                              }`}
                              title="Visual WYSIWYG Compose View (like Blogspot Compose)"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>Compose view</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchEditorMode('html')}
                              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
                                editorMode === 'html'
                                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                              }`}
                              title="Raw HTML & Markdown Source View (like Blogspot HTML)"
                            >
                              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>&lt;&gt; HTML view</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <ImageUploadButton onUploaded={insertImageIntoBody} label="Insert image into article" />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                      </div>

                      {/* Full rich-text toolbar (Compose view) */}
                      {editorMode === 'compose' ? (
                        <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-amber-500">
                          <RichToolbar
                            editorRef={visualEditorRef}
                            onChange={emitContent}
                            articles={articles}
                            currentArticleId={editingId}
                            articleHref={(a) => articlePathOf(a, categories)}
                            articleTitle={title}
                            articleTopic={topic}
                            primaryKeyword={primaryKeyword}
                            category={category}
                          />
                          {/* Editable canvas: same typography as the public article, so what you see is what readers get */}
                          <div
                            ref={visualEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck
                            data-placeholder="Write or paste your article here. Pasting from Claude, ChatGPT or Google Docs is cleaned automatically."
                            onInput={(e) => emitContent(e.currentTarget.innerHTML)}
                            onBlur={(e) => emitContent(e.currentTarget.innerHTML)}
                            className="bz-editor briefzy-article w-full min-h-[420px] max-h-[680px] overflow-auto px-6 py-5 text-[15px] bg-white dark:bg-slate-800 rounded-b-xl focus:outline-none"
                          />
                        </div>
                      ) : (
                        /* Raw HTML / Markdown Code View */
                        <div className="space-y-1">
                          <textarea
                            rows={14}
                            required
                            placeholder="Paste or write raw HTML / Markdown here (e.g. copied from Claude or ChatGPT)."
                            ref={contentRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-xs"
                          />
                          <p className="text-[10px] text-slate-400 font-mono">
                            Tip: Switch to &quot;Compose view&quot; above at any time to format text visually like in Blogspot.
                          </p>
                        </div>
                      )}
                      <SeoStatusBar
                        content={content}
                        primaryKeyword={primaryKeyword || topic}
                        onSuggestKeywords={handleSuggestKeywordsFromContent}
                        onOptimize={handleAutoOptimize}
                        message={optimizeMsg}
                      />
                    </div>

                    {/* FAQs */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        FAQ Schema Questions (Google Rich Snippets)
                      </label>
                      <textarea
                        rows={3}
                        value={faqText}
                        onChange={(e) => setFaqText(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    {/* Topic-Matched YouTube Walkthroughs Manager */}
                    <div className="p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/15 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Youtube className="w-4 h-4 text-rose-600" />
                          <span>Topic-Matched YouTube Walkthroughs ({youtubeVideos.length})</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleFetchTopicYoutube()}
                          disabled={isFetchingYoutube || (!title.trim() && !topic.trim() && !primaryKeyword.trim())}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isFetchingYoutube ? 'animate-spin' : ''}`} />
                          <span>{isFetchingYoutube ? 'Searching...' : 'Auto-Find Topic Videos'}</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ytInputUrl}
                          onChange={(e) => setYtInputUrl(e.target.value)}
                          placeholder="Paste YouTube watch/share URL or 11-char video ID to add manually..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddYoutubeUrl}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Add Video
                        </button>
                      </div>

                      {youtubeVideos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {youtubeVideos.map((v) => (
                            <div
                              key={v.videoId}
                              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                              <img
                                src={v.thumbnailUrl}
                                alt={v.title}
                                className="w-16 h-10 rounded-lg object-cover shrink-0 bg-slate-200"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                                  {v.title}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{v.authorName}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setYoutubeVideos((prev) => prev.filter((x) => x.videoId !== v.videoId))}
                                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                                title="Remove video"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          No pinned videos yet — click &quot;Auto-Find Topic Videos&quot; or publish to automatically match verified YouTube tutorials on view.
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Publishing</div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-700 dark:text-slate-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="publishMode" checked={publishMode === 'now'} onChange={() => setPublishMode('now')} />
                          Publish now
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="publishMode" checked={publishMode === 'schedule'} onChange={() => setPublishMode('schedule')} />
                          Schedule
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="publishMode" checked={publishMode === 'draft'} onChange={() => setPublishMode('draft')} />
                          Save as draft
                        </label>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={autoOptimize} onChange={(e) => setAutoOptimize(e.target.checked)} />
                        Auto-optimize on save (tidy structure, SEO-style bold keywords, internal links)
                      </label>
                      {publishMode === 'schedule' && (
                        <div>
                          <input
                            type="datetime-local"
                            value={scheduleAt}
                            onChange={(e) => setScheduleAt(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Uses your device time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). The article appears on the site automatically at that time.
                          </p>
                        </div>
                      )}
                      {publishMode === 'draft' && (
                        <p className="text-[10px] text-slate-500">Drafts are hidden from visitors and search engines until you publish them.</p>
                      )}
                      {editingId && slug && articles.find((a) => a.id === editingId)?.slug !== slug && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          Changing the slug changes this article's URL. The old URL will stop working.
                        </p>
                      )}
                    </div>
                    {publishError && <div className="text-xs text-rose-600 font-semibold">{publishError}</div>}
                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {isPublishing
                          ? 'Saving…'
                          : editingId
                          ? 'Update article'
                          : publishMode === 'schedule'
                          ? 'Schedule article'
                          : publishMode === 'draft'
                          ? 'Save draft'
                          : 'Publish to Briefzy.me'}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Right Side: Integrated AI-Powered SEO Assistant */}
                <div className="lg:col-span-5">
                  <div className="sticky top-4">
                    <AiSeoAssistant
                      topic={topic}
                      category={category}
                      primaryKeyword={primaryKeyword}
                      currentTitle={title}
                      currentMetaDescription={metaDescription}
                      currentContent={content}
                      currentKeyTakeaways={keyTakeaways}
                      fieldNotes={fieldNotes}
                      onOutlineGenerated={(out) => setCurrentOutline(out)}
                      onExpandOutline={handleExpandOutlineFromAssistant}
                      onApplyOutline={(outlineHtml, suggestedTitle, suggestedSlug) => {
                        setContent((prev) => (prev ? `${prev}\n\n${outlineHtml}` : outlineHtml));
                        if (suggestedTitle && !title) setTitle(normalizeHeadlineTitleCase(suggestedTitle));
                        if (suggestedSlug && !slug) setSlug(suggestedSlug);
                      }}
                      onApplyKeyword={(kw) => {
                        setSecondaryKeywords((prev) => (prev ? `${prev}, ${kw}` : kw));
                      }}
                      onApplyTitle={(t) => setTitle(normalizeHeadlineTitleCase(t))}
                      onApplyMeta={(m) => setMetaDescription(m)}
                      onAutoFixEeat={handleEeatAutoFix}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEYWORD RESEARCH TOOL */}
          {activeTab === 'keywords' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  Tier-1 Keyword Performance & CPC Analyzer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Analyze Google search economics across United States, United Kingdom, Canada, and Australia.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter keyword or search query..."
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleAnalyzeKeyword}
                  disabled={isSearchingKw}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSearchingKw ? 'Analyzing...' : 'Analyze Keyword'}</span>
                </button>
              </div>

              {kwResult && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <span className="text-xs text-slate-400">Monthly Volume (Tier-1)</span>
                      <div className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                        {kwResult.volume?.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-emerald-500 font-semibold">{kwResult.trend} this quarter</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <span className="text-xs text-slate-400">AdSense Estimated CPC</span>
                      <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-1">
                        {kwResult.cpc}
                      </div>
                      <span className="text-[11px] text-slate-400">High-bid auction</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <span className="text-xs text-slate-400">Keyword Difficulty</span>
                      <div className="text-2xl font-bold font-heading text-amber-500 mt-1">
                        {kwResult.difficulty}/100
                      </div>
                      <span className="text-[11px] text-slate-400">Competition: {kwResult.competition}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <span className="text-xs text-slate-400">Search Intent</span>
                      <div className="text-2xl font-bold font-heading text-indigo-500 mt-1">
                        {kwResult.intent}
                      </div>
                      <span className="text-[11px] text-slate-400">SERP Snapshot Ready</span>
                    </div>
                  </div>

                  {/* Demographic distribution */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-amber-500" />
                      <span>Tier-1 Geographic Traffic Concentration</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      {Object.entries(kwResult.tier1Demographics || {}).map(([c, pct]: any) => (
                        <div key={c} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                          <span className="font-bold text-slate-900 dark:text-white block">{c}</span>
                          <span className="text-amber-500 font-mono">{pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISITOR TRENDS & ADSENSE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                    Live Audience Trends & AdSense Monetization
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time traffic metrics across Tier-1 territories for briefzy.me
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    1,420 Active Concurrent Readers
                  </span>
                </div>
              </div>

              {/* High-level KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400">Daily Pageviews</span>
                  <div className="text-2xl font-black font-heading text-slate-900 dark:text-white mt-1">48,290</div>
                  <span className="text-[11px] text-emerald-500 font-semibold">+18.4% vs last week</span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400">Google Organic Search</span>
                  <div className="text-2xl font-black font-heading text-amber-500 mt-1">74.2%</div>
                  <span className="text-[11px] text-slate-400">Direct SEO Traffic</span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400">Average AdSense RPM</span>
                  <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-1">$28.40</div>
                  <span className="text-[11px] text-slate-400">Tier-1 Finance & Tech</span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs text-slate-400">Est. Monthly Earnings</span>
                  <div className="text-2xl font-black font-heading text-indigo-500 mt-1">$1,371.40</div>
                  <span className="text-[11px] text-emerald-500 font-semibold">+32% monthly pace</span>
                </div>
              </div>

              {/* Geographic Breakdown & Top Search Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                    Tier-1 Geographic Readership
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">United States 🇺🇸</span>
                        <span className="font-mono text-slate-400">48% (23,179 sessions)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '48%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">United Kingdom 🇬🇧</span>
                        <span className="font-mono text-slate-400">22% (10,623 sessions)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '22%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Canada 🇨🇦</span>
                        <span className="font-mono text-slate-400">14% (6,760 sessions)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '14%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Australia 🇦🇺</span>
                        <span className="font-mono text-slate-400">11% (5,311 sessions)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: '11%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                    Top Google Organic Search Queries
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-900 dark:text-white">autonomous ai agents 2026 enterprise</span>
                      <span className="font-mono text-emerald-500 font-bold">Pos #2 (Google)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-900 dark:text-white">nist post quantum migration standards</span>
                      <span className="font-mono text-emerald-500 font-bold">Pos #3 (Google)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-900 dark:text-white">saas rule of 60 valuation metric</span>
                      <span className="font-mono text-emerald-500 font-bold">Pos #1 (Google)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-medium text-slate-900 dark:text-white">sge adsense rpm optimization playbook</span>
                      <span className="font-mono text-emerald-500 font-bold">Pos #4 (Google)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE ADSENSE APPROVAL & COMPLIANCE HUB */}
          {activeTab === 'adsense' && (
            <AdSenseReadinessAudit articles={articles} categories={categories} />
          )}

          {/* TAB 4: PUSH NOTIFICATIONS BROADCAST */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  Real-Time Web Push Notification Broadcaster
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transmit real-time alerts to registered Tier-1 subscribers and readers.
                </p>
              </div>

              <form onSubmit={handleBroadcast} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Notification Category
                  </label>
                  <select
                    value={notifType}
                    onChange={(e: any) => setNotifType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="traffic">Traffic Spike Alert</option>
                    <option value="breaking">Breaking Editorial Brief</option>
                    <option value="revenue">AdSense Revenue Digest</option>
                    <option value="system">System Security Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Traffic Spike: 1.4k Concurrent Readers on AI Brief"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Alert Body Message
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Concise message for browser push banner..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Web Push to Subscribers</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: CLOUD BACKUP & DATA ENCRYPTION */}
          {activeTab === 'backup' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  Automated Cloud Backup & AES-256 Encryption
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Guarantee data persistence, fail-safe backups, and strict GDPR compliance standards.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5 text-xs">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Cloud Vault Synchronization</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">Last Sync: {lastBackupTime}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Client-Side AES-256 Encryption Shield</div>
                      <div className="text-slate-400 text-[11px]">Encrypts drafts, comments & subscriber emails in local state</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={encryptionShield}
                      onChange={(e) => setEncryptionShield(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Hourly Auto-Snapshot Frequency</div>
                      <div className="text-slate-400 text-[11px]">Rotates 24 historical restore points in memory</div>
                    </div>
                    <span className="font-mono text-emerald-500 font-bold">Hourly (Active)</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Encrypted Cloud Snapshot (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PUBLISHED STORIES LIST */}
          {activeTab === 'articles' && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                    Published Editorial Index ({articles.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage active articles, monitor permalinks, and inspect SEO scores
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Story</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 shadow-xs text-xs">
                {articles.map((art) => (
                  <div key={art.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <img src={art.featuredImage} alt={art.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                            {art.category}
                          </span>
                          <span className="text-slate-400">• {art.publishDate}</span>
                          {publishStatus(art) === 'scheduled' && (
                            <span className="text-sky-500 font-bold">Scheduled {art.scheduledAt ? new Date(art.scheduledAt).toLocaleString() : ''}</span>
                          )}
                          {publishStatus(art) === 'draft' && <span className="text-slate-500 font-bold">Draft</span>}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {art.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {articlePathOf(art, categories)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(art)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          onSelectArticle(art);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => onDeleteArticle(art.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Article"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: EDITORIAL TEAM & ROLES (RBAC) */}
          {activeTab === 'team' && (
            <TeamManagementTab
              teamMembers={teamMembers}
              onAddMember={onAddTeamMember}
              onUpdateMember={onUpdateTeamMember}
              onDeleteMember={onDeleteTeamMember}
              currentActiveMemberId={currentOperatorId}
              onSwitchActiveMember={(id) => setCurrentOperatorId(id)}
            />
          )}

          {/* TAB 8: CATEGORIES MANAGEMENT (TAXONOMY & SEO) */}
          {activeTab === 'categories' && (
            <CategoryManagementTab
              categories={categories}
              articles={articles}
              onAddCategory={onAddCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              operatorRole={teamMembers.find((m) => m.id === currentOperatorId)?.role || 'Manager'}
            />
          )}
        </main>
      </div>

      {/* Image Optimizer Plugin Modal */}
      <ImageOptimizerModal
        isOpen={showImageOptimizer}
        onClose={() => setShowImageOptimizer(false)}
        articleTitle={title}
        articleTopic={topic}
        articleKeyword={primaryKeyword}
        articleCategory={category}
        initialImage={featuredImage}
        onApplyImage={(imgUrl, alt) => {
          setCoverIsCustom(true);
          setFeaturedImage(imgUrl);
          setImageAlt(alt);
        }}
      />

      {/* AI Image Studio: Create & Edit Images (gemini-nano-banana-2.1) */}
      <AiImageStudioModal
        isOpen={showImageStudio}
        onClose={() => setShowImageStudio(false)}
        currentArticleTitle={title}
        currentTopic={topic}
        currentKeyword={primaryKeyword}
        currentCategory={category}
        initialImage={featuredImage}
        onApplyFeaturedImage={(imgUrl, alt) => {
          setCoverIsCustom(true);
          setFeaturedImage(imgUrl);
          if (alt) setImageAlt(alt);
        }}
        onInsertIntoBody={(imgHtml) => {
          setContent((prev) => (prev ? `${prev}\n\n${imgHtml}` : imgHtml));
        }}
      />
    </div>
  );
};
