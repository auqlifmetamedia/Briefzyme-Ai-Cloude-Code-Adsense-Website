import React, { useState, useEffect, useMemo } from 'react';
import { articleUrl } from '../utils/routes.ts';
import { Article, CommentItem } from '../types.ts';
import { AdSenseBanner } from './AdSenseBanner.tsx';
import { ShareBar } from './ShareBar.tsx';
import { InArticleRelated } from './InArticleRelated.tsx';
import { TableOfContents, processArticleHeadings } from './TableOfContents.tsx';
import { AiAudioPlayer } from './AiAudioPlayer.tsx';
import { MultiLensSwitcher, LensMode } from './MultiLensSwitcher.tsx';
import { ArticleCompanion } from './ArticleCompanion.tsx';
import { ArticleLocationExplorer } from './ArticleLocationExplorer.tsx';
import { ArticleActionChecklist } from './ArticleActionChecklist.tsx';
import { ExecutiveCalculatorWidget } from './ExecutiveCalculatorWidget.tsx';
import { CitationModal } from './CitationModal.tsx';
import { RabbitHoleRecommender } from './RabbitHoleRecommender.tsx';
import {
  Clock,
  Eye,
  Calendar,
  CheckCircle,
  Volume2,
  VolumeX,
  Type,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  Send,
  Bookmark,
  Share2,
  Sparkles,
  ArrowLeft,
  MapPin,
  Navigation,
  Quote,
  BookOpen,
  Zap,
} from 'lucide-react';

// Bionic Reading Algorithm: Bolds first 45% of characters in each word for high velocity reading
function applyBionicReading(html: string): string {
  if (!html) return '';
  return html.replace(/>([^<]+)</g, (_full, text) => {
    const transformed = text.replace(/\b([a-zA-Z0-9]{2,})\b/g, (word: string) => {
      const mid = Math.ceil(word.length * 0.45);
      const boldPart = word.slice(0, mid);
      const rest = word.slice(mid);
      return `<strong class="font-extrabold text-slate-950 dark:text-white">${boldPart}</strong>${rest}`;
    });
    return `>${transformed}<`;
  });
}

// Helper to cleanly split HTML content into two halves at paragraph/heading boundaries
function splitContentMidpoint(html: string): { firstHalf: string; secondHalf: string } {
  if (!html) return { firstHalf: '', secondHalf: '' };

  // Match closing tags of major block elements: </p>, </h2>, </h3>, </blockquote>, </ul>, </ol>
  const regex = /<\/(p|h2|h3|blockquote|ul|ol)>/gi;
  const matches: { index: number; end: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    matches.push({
      index: match.index,
      end: match.index + match[0].length,
    });
  }

  // If there are at least 2 block elements, find the split point nearest to the middle of the text
  if (matches.length >= 2) {
    const halfCharLength = Math.floor(html.length / 2);
    let bestSplit = matches[Math.floor(matches.length / 2) - 1].end;
    let minDistance = Math.abs(bestSplit - halfCharLength);

    for (let i = 0; i < matches.length - 1; i++) {
      const candidateEnd = matches[i].end;
      const distance = Math.abs(candidateEnd - halfCharLength);
      if (distance < minDistance) {
        minDistance = distance;
        bestSplit = candidateEnd;
      }
    }

    return {
      firstHalf: html.slice(0, bestSplit),
      secondHalf: html.slice(bestSplit),
    };
  }

  return { firstHalf: html, secondHalf: '' };
}

interface ArticleViewProps {
  article: Article;
  allArticles: Article[];
  onSelectArticle: (article: Article) => void;
  onBack: () => void;
  onOpenKeyModal?: () => void;
  onOpenMaps?: (query?: string) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({
  article,
  allArticles,
  onSelectArticle,
  onBack,
  onOpenKeyModal,
  onOpenMaps,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans');
  const [isBionic, setIsBionic] = useState(false);
  const [isCitationOpen, setIsCitationOpen] = useState(false);
  const [currentLens, setCurrentLens] = useState<LensMode>('standard');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [comments, setComments] = useState<CommentItem[]>(article.comments || []);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Text size & typography classes
  const fontClass = `${{
    normal: 'text-base md:text-lg leading-relaxed',
    large: 'text-lg md:text-xl leading-relaxed',
    xl: 'text-xl md:text-2xl leading-loose',
  }[fontSize]} ${fontFamily === 'serif' ? 'font-serif tracking-normal' : 'font-sans'}`;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName.trim() || !newCommentText.trim()) return;

    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      author: newCommentName.trim(),
      date: 'Just now',
      content: newCommentText.trim(),
      likes: 1,
    };
    setComments([newComment, ...comments]);
    setNewCommentName('');
    setNewCommentText('');
  };

  const currentUrl = articleUrl(article);

  // Extract headings (H2 & H3) and inject anchor IDs for Table of Contents
  const { processedHtml, tocItems } = useMemo(() => {
    return processArticleHeadings(article.content || '');
  }, [article.content]);

  // Split content cleanly at paragraph/heading boundaries for mid-article related articles insertion
  const { firstHalf, secondHalf } = useMemo(() => {
    return splitContentMidpoint(processedHtml);
  }, [processedHtml]);

  // Apply bionic reading transformations when toggled by reader
  const displayFirstHalf = useMemo(() => {
    return isBionic ? applyBionicReading(firstHalf) : firstHalf;
  }, [firstHalf, isBionic]);

  const displaySecondHalf = useMemo(() => {
    return isBionic ? applyBionicReading(secondHalf) : secondHalf;
  }, [secondHalf, isBionic]);

  // Find related articles in the same category for bottom section
  const bottomRelatedArticles = useMemo(() => {
    const sameCat = allArticles.filter(
      (a) => a.id !== article.id && a.category.toLowerCase() === article.category.toLowerCase()
    );
    if (sameCat.length >= 2) return sameCat.slice(0, 3);
    return allArticles.filter((a) => a.id !== article.id).slice(0, 3);
  }, [allArticles, article]);

  return (
    <div className="relative">
      {/* Floating Left Share Rail for Large Screens (Sticky) */}
      <ShareBar
        title={article.title}
        url={currentUrl}
        summary={article.metaDescription}
        variant="floating"
      />

      {/* Dynamic Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-400 reading-progress-bar"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs text-slate-500 dark:text-slate-400">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to All Stories</span>
          </button>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">https://briefzy.me/</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">{currentUrl.replace('https://briefzy.me/', '').split('/')[0]}</span>
            <span className="text-slate-400">/{article.slug}</span>
          </div>
        </div>

        {/* Top Header Leaderboard Ad (Google AdSense Standard 728x90) */}
        <AdSenseBanner type="header_leaderboard" slotId="pub-98410294-top" />

        {/* Article Meta Header */}
        <header className="my-6">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider">
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {article.readingTime}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-4">
            {article.title}
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-light mb-6">
            {article.metaDescription}
          </p>

          {/* Author Bylines, Utilities, and Inline Share Bar */}
          <div className="py-4 border-y border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/80"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <span>{article.author.name}</span>
                    {article.author.verified && (
                      <span title="Verified author">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {article.author.role} • {article.publishDate}
                  </div>
                </div>
              </div>

              {/* Reading Tools: Bionic Reading, Font Family, Font Sizer, Citation, Bookmark */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Bionic Reading Toggle */}
                <button
                  onClick={() => setIsBionic(!isBionic)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isBionic
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold border-transparent shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                  }`}
                  title="Toggle Bionic Reading: Bolds initial syllables for 2x faster comprehension"
                >
                  <Zap className={`w-3.5 h-3.5 ${isBionic ? 'text-slate-950 fill-current' : 'text-amber-500'}`} />
                  <span className="text-[11px] font-medium hidden sm:inline">Bionic</span>
                </button>

                {/* Typography Toggle: Serif vs Sans */}
                <button
                  onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'serif' : 'sans'))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
                  title="Toggle Editorial Serif or Modern Sans Typography"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                  <span className="uppercase text-[10px] font-mono">{fontFamily}</span>
                </button>

                {/* Font Size Adjuster */}
                <button
                  onClick={() =>
                    setFontSize((prev) => (prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal'))
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
                  title="Adjust Font Size"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span className="uppercase text-[10px] font-mono">{fontSize}</span>
                </button>

                {/* Cite Article Button */}
                <button
                  onClick={() => setIsCitationOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-indigo-400/30 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Cite this Article (APA, Harvard, BibTeX, Executive Deck)"
                >
                  <Quote className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                  <span className="hidden sm:inline">Cite</span>
                </button>

                {/* Bookmark Toggle */}
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-cyan-500'
                  }`}
                  title="Bookmark for Later"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Social Share Bar Top (Twitter/X, LinkedIn, Facebook, WhatsApp, Copy Link) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <ShareBar
                title={article.title}
                url={currentUrl}
                summary={article.metaDescription}
                variant="inline"
              />
            </div>
          </div>
        </header>

        {/* Featured Image with SEO Alt Text Caption */}
        <div className="my-8 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 relative bg-slate-900">
          <img
            src={article.featuredImage}
            alt={article.imageAlt}
            className="w-full h-[320px] sm:h-[420px] md:h-[480px] object-cover"
          />
          <div className="p-3 bg-slate-900/90 text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800">
            <span className="truncate pr-4">Visual: {article.imageAlt}</span>
            <span className="shrink-0 text-cyan-400 font-medium">Briefzy</span>
          </div>
        </div>

        {/* AI Audio Player (2-Minute Podcast Brief & Full Narration) */}
        <AiAudioPlayer
          title={article.title}
          metaDescription={article.metaDescription}
          keyTakeaways={article.keyTakeaways}
          content={article.content}
          primaryKeyword={article.primaryKeyword}
          onOpenKeyModal={onOpenKeyModal || (() => {})}
        />


        {/* Executive Summary / Key Takeaways Box (AdSense High Dwell-Time Booster) */}
        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-transparent border-2 border-indigo-400/30 dark:border-indigo-500/30 shadow-xs mb-8">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-cyan-400 font-bold font-heading text-lg mb-3">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span>Key Takeaways & Executive Summary</span>
            </div>
            <ul className="space-y-2.5">
              {article.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm md:text-base text-slate-800 dark:text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="leading-snug">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Multi-Lens Reading Switcher (Executive 60s, ELI5, Deep Dive, Contrarian) */}
        <MultiLensSwitcher
          currentLens={currentLens}
          onChangeLens={setCurrentLens}
          article={article}
          onOpenKeyModal={onOpenKeyModal || (() => {})}
        />

        {/* Dynamic Table of Contents (TOC) with anchor jump links for long-form readability (shown on standard lens) */}
        {currentLens === 'standard' && tocItems && tocItems.length >= 2 && (
          <TableOfContents items={tocItems} />
        )}

        {/* Article Body Content - First Half (shown on standard lens) */}
        {currentLens === 'standard' && (
          <div
            className={`prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-normal ${fontClass}`}
            dangerouslySetInnerHTML={{ __html: displayFirstHalf }}
          />
        )}


        {/* In-Article Related Articles: 2 or 3 articles with small thumbnails situated in the middle of article text */}
        {currentLens === 'standard' && (
          <InArticleRelated
            currentArticle={article}
            allArticles={allArticles}
            onSelectArticle={onSelectArticle}
          />
        )}

        {/* Article Body Content - Second Half (shown on standard lens) */}
        {currentLens === 'standard' && secondHalf && (
          <div
            className={`prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-normal ${fontClass} mt-6`}
            dangerouslySetInnerHTML={{ __html: displaySecondHalf }}
          />
        )}

        {/* Executive Decision & ROI Calculator Engine */}
        <ExecutiveCalculatorWidget article={article} />

        {/* Actionable Implementation Checklist & Step-by-Step Execution Plan */}
        <ArticleActionChecklist article={article} />

        {/* In-Article Google AdSense Native Unit */}
        <AdSenseBanner type="in_article" slotId="pub-98410294-mid" />

        {/* Secondary keywords & tags */}
        <div className="my-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Related Topics & Tags:
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 font-semibold text-xs border border-indigo-500/20">
              #{article.primaryKeyword}
            </span>
            {article.secondaryKeywords.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>

        {/* FAQ Schema Accordion */}
        {article.faqs && article.faqs.length > 0 && (
          <div className="my-10 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {article.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/60 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between font-bold text-sm md:text-base text-slate-900 dark:text-white cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-cyan-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Location Intelligence & Google Maps Exploration (Positioned directly under FAQ) */}
        <ArticleLocationExplorer article={article} />

        {/* Google AdSense Multiplex Native Recommendation Grid */}
        <AdSenseBanner type="multiplex" slotId="pub-98410294-multi" />

        {/* High-Conversion Social Media Share Card (Twitter/X, LinkedIn, Facebook, WhatsApp, Copy Link) */}
        <ShareBar
          title={article.title}
          url={currentUrl}
          summary={article.metaDescription}
          variant="card"
          className="my-10"
        />

        {/* Author Bio Card */}
        <div className="my-8 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <img
            src={article.author.avatar}
            alt={article.author.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/80 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-lg text-slate-900 dark:text-white">{article.author.name}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                Staff Fellow
              </span>
            </div>
            <div className="text-xs text-indigo-600 dark:text-cyan-400 font-semibold mb-2">{article.author.role}</div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {article.author.bio}
            </p>
          </div>
        </div>

        {/* AI Smart Companion: Interactive Q&A for this article */}
        <ArticleCompanion
          article={article}
          onOpenKeyModal={onOpenKeyModal || (() => {})}
        />

        {/* Comments Section */}
        <div className="my-10 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <span>Reader Discussion ({comments.length})</span>
            </h3>
            <span className="text-xs text-slate-500">Peer-reviewed commentary</span>
          </div>

          {/* New Comment Form */}
          <form onSubmit={handleAddComment} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Your Name (e.g. Alex Vance, CTO)"
                value={newCommentName}
                onChange={(e) => setNewCommentName(e.target.value)}
                required
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Contribute constructive perspective or question..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-white"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Comment</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comm) => (
              <div
                key={comm.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">{comm.author}</span>
                  <span className="text-slate-400">{comm.date}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                  {comm.content}
                </p>
                <div className="flex items-center gap-1 text-slate-400 hover:text-cyan-500 cursor-pointer w-fit">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{comm.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Rabbit Hole Recommender: Chained conceptual reading path */}
        <RabbitHoleRecommender
          currentArticle={article}
          allArticles={allArticles}
          onSelectArticle={onSelectArticle}
        />

        {/* High-CTR Related Intelligence Articles */}
        <div className="my-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-6">
            Recommended High-Yield Briefs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bottomRelatedArticles.map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  onSelectArticle(rel);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden bg-slate-900">
                  <img
                    src={rel.featuredImage}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                      {rel.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors line-clamp-2 mt-1">
                      {rel.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                    <span>{rel.readingTime}</span>
                    <span className="text-cyan-500 font-semibold group-hover:underline">Read Brief →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Citation Export Modal (APA, Harvard, BibTeX, Executive Slides) */}
      <CitationModal
        isOpen={isCitationOpen}
        onClose={() => setIsCitationOpen(false)}
        article={article}
      />
    </div>
  );
};
