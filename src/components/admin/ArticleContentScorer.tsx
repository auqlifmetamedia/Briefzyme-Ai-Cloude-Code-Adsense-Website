import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  KeyRound,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  Check,
  X,
  Layers,
} from 'lucide-react';

export interface ContentScoreResult {
  overallScore: number;
  grade: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  gradeColor: string;
  badgeBg: string;
  wordCount: number;
  readingTimeMinutes: number;
  subscores: {
    keywords: {
      score: number;
      density: number;
      inTitle: boolean;
      inMeta: boolean;
      inFirstParagraph: boolean;
      totalMatches: number;
      secondaryMatchesCount: number;
      totalSecondaryKeywords: number;
    };
    readability: {
      score: number;
      fleschScore: number;
      readingLevel: string;
      avgSyllablesPerWord: number;
      complexWordRatio: number;
      longParagraphCount: number;
    };
    structure: {
      score: number;
      avgWordsPerSentence: number;
      sentenceCount: number;
      subheadingCount: number;
      transitionWordsCount: number;
      varietyScore: number;
      longSentenceCount: number;
    };
  };
  tips: Array<{
    type: 'success' | 'warning' | 'info';
    category: 'keywords' | 'readability' | 'structure';
    text: string;
  }>;
}

interface ArticleContentScorerProps {
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords?: string;
  content: string;
  onAutoFixSuggestion?: (action: string) => void;
}

// Common transitional phrases for structure evaluation
const TRANSITION_WORDS = [
  'however', 'therefore', 'furthermore', 'moreover', 'consequently',
  'in addition', 'as a result', 'for example', 'for instance', 'specifically',
  'meanwhile', 'in contrast', 'similarly', 'nevertheless', 'additionally',
  'on the other hand', 'in particular', 'overall', 'ultimately', 'notably'
];

// Helper to count syllables in an English word
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean || clean.length <= 2) return 1;
  const normalized = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
  const matches = normalized.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches ? matches.length : 1);
}

export function computeArticleScore(
  title: string,
  metaDescription: string,
  primaryKeyword: string,
  secondaryKeywords: string = '',
  content: string = ''
): ContentScoreResult {
  // Strip HTML tags for clean text analysis
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const lowerContent = textContent.toLowerCase();
  const lowerTitle = title.toLowerCase().trim();
  const lowerMeta = metaDescription.toLowerCase().trim();
  const cleanKeyword = primaryKeyword.toLowerCase().trim();

  // Parse words & sentences
  const words = textContent.match(/\b[A-Za-z0-9'-]+\b/g) || [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Extract sentences by punctuation (. ! ?)
  const rawSentences = textContent
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
  const sentenceCount = Math.max(1, rawSentences.length);

  // Extract paragraphs (detect <p> tags or double newlines)
  const paragraphBlocks = content.includes('<p>')
    ? content.split(/<\/p>/i).map((p) => p.replace(/<[^>]*>/g, '').trim()).filter((p) => p.length > 10)
    : content.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 10);

  // Count subheadings (h2, h3 or markdown ##, ###)
  const headingMatches = content.match(/<h[2-4][^>]*>|^(#{2,4})\s+/gim) || [];
  const subheadingCount = headingMatches.length;

  // ---------------------------------------------------------
  // 1. KEYWORDS EVALUATION (Max 100)
  // ---------------------------------------------------------
  let keywordScore = 0;
  let inTitle = false;
  let inMeta = false;
  let inFirstParagraph = false;
  let totalMatches = 0;
  let keywordDensity = 0;

  if (cleanKeyword.length > 0) {
    inTitle = lowerTitle.includes(cleanKeyword);
    inMeta = lowerMeta.includes(cleanKeyword);

    // Matches in content
    const regex = new RegExp(`\\b${cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowerContent.match(regex);
    totalMatches = matches ? matches.length : 0;

    // Density
    const keywordWordLen = cleanKeyword.split(/\s+/).length;
    keywordDensity = wordCount > 0 ? Number(((totalMatches * keywordWordLen / wordCount) * 100).toFixed(2)) : 0;

    // First paragraph check (first 100 words)
    const first100Words = words.slice(0, 100).join(' ').toLowerCase();
    inFirstParagraph = first100Words.includes(cleanKeyword);

    // Scoring breakdown
    if (inTitle) keywordScore += 25;
    if (inMeta) keywordScore += 20;

    if (totalMatches >= 3 && keywordDensity <= 3.0) {
      keywordScore += 25;
    } else if (totalMatches >= 1) {
      keywordScore += 15;
    }

    if (inFirstParagraph) keywordScore += 15;

    // Optimal density bonus (0.8% - 2.5%)
    if (keywordDensity >= 0.8 && keywordDensity <= 2.5) {
      keywordScore += 15;
    } else if (keywordDensity > 0 && keywordDensity < 0.8) {
      keywordScore += 8;
    }
  } else {
    // If no keyword entered, base minimal on topic/title presence
    keywordScore = wordCount > 200 ? 50 : 20;
  }

  // Secondary keywords check
  const secondaryList = secondaryKeywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  let secondaryMatchesCount = 0;
  secondaryList.forEach((skw) => {
    if (lowerContent.includes(skw)) secondaryMatchesCount++;
  });

  const secondaryBonus = secondaryList.length > 0
    ? Math.min(10, Math.round((secondaryMatchesCount / secondaryList.length) * 10))
    : 5;
  keywordScore = Math.min(100, keywordScore + secondaryBonus);

  // ---------------------------------------------------------
  // 2. READABILITY EVALUATION (Max 100)
  // ---------------------------------------------------------
  let readabilityScore = 50;
  let totalSyllables = 0;
  let complexWordsCount = 0;

  words.forEach((w) => {
    const syl = countSyllables(w);
    totalSyllables += syl;
    if (syl >= 3) complexWordsCount++;
  });

  const avgSyllablesPerWord = wordCount > 0 ? Number((totalSyllables / wordCount).toFixed(2)) : 1.4;
  const avgWordsPerSentence = Number((wordCount / sentenceCount).toFixed(1));
  const complexWordRatio = wordCount > 0 ? Number(((complexWordsCount / wordCount) * 100).toFixed(1)) : 10;

  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentence) - 84.6 * (syllables/word)
  let fleschScore = 65;
  if (wordCount > 30) {
    fleschScore = Math.round(206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord));
    fleschScore = Math.max(0, Math.min(100, fleschScore));
  }

  // Flesch rating level
  let readingLevel = 'Standard (Clear)';
  if (fleschScore >= 80) readingLevel = 'Very Easy (General Audience)';
  else if (fleschScore >= 65) readingLevel = 'Easy / Standard';
  else if (fleschScore >= 50) readingLevel = 'Fairly Difficult (Professional)';
  else if (fleschScore >= 30) readingLevel = 'Academic / Technical';
  else readingLevel = 'Dense / Highly Technical';

  // Count paragraphs longer than 130 words
  const longParagraphCount = paragraphBlocks.filter((p) => p.split(/\s+/).length > 130).length;

  // Compute Readability Score (0-100)
  let computedRead = 0;
  // Flesch contribution (40 pts)
  if (fleschScore >= 60 && fleschScore <= 80) computedRead += 40;
  else if (fleschScore >= 50) computedRead += 32;
  else computedRead += 20;

  // Sentence length contribution (30 pts)
  if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 20) computedRead += 30;
  else if (avgWordsPerSentence < 25) computedRead += 22;
  else computedRead += 12;

  // Paragraph chunking contribution (20 pts)
  if (longParagraphCount === 0 && paragraphBlocks.length >= 2) computedRead += 20;
  else if (longParagraphCount <= 1) computedRead += 14;
  else computedRead += 8;

  // Word length/complexity (10 pts)
  if (complexWordRatio < 18) computedRead += 10;
  else if (complexWordRatio < 25) computedRead += 7;
  else computedRead += 4;

  readabilityScore = Math.min(100, computedRead);

  // ---------------------------------------------------------
  // 3. SENTENCE STRUCTURE EVALUATION (Max 100)
  // ---------------------------------------------------------
  let structureScore = 40;
  let longSentenceCount = 0;
  let sentenceLengths: number[] = [];

  rawSentences.forEach((s) => {
    const sWords = s.match(/\b[A-Za-z0-9'-]+\b/g) || [];
    const len = sWords.length;
    sentenceLengths.push(len);
    if (len > 28) longSentenceCount++;
  });

  // Variance / variety of sentence lengths
  let varietyScore = 15;
  if (sentenceLengths.length >= 4) {
    const mean = avgWordsPerSentence;
    const variance = sentenceLengths.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    // Ideal stdDev is between 4 and 10 (good cadence of short + long sentences)
    if (stdDev >= 4 && stdDev <= 12) varietyScore = 25;
    else if (stdDev >= 2) varietyScore = 18;
    else varietyScore = 10;
  }

  // Count transition words
  let transitionWordsCount = 0;
  TRANSITION_WORDS.forEach((tw) => {
    const twRegex = new RegExp(`\\b${tw}\\b`, 'gi');
    const found = lowerContent.match(twRegex);
    if (found) transitionWordsCount += found.length;
  });

  // Calculate structure score
  let computedStruct = 0;

  // Average sentence length (25 pts)
  if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 20) computedStruct += 25;
  else if (avgWordsPerSentence >= 9 && avgWordsPerSentence <= 24) computedStruct += 18;
  else computedStruct += 10;

  // Variety score (25 pts)
  computedStruct += varietyScore;

  // Subheading scannability (25 pts)
  const expectedHeadings = Math.max(1, Math.floor(wordCount / 250));
  if (subheadingCount >= expectedHeadings) computedStruct += 25;
  else if (subheadingCount >= 1) computedStruct += 16;
  else computedStruct += 8;

  // Transition words density (25 pts)
  const transitionRatio = sentenceCount > 0 ? (transitionWordsCount / sentenceCount) * 100 : 0;
  if (transitionRatio >= 15) computedStruct += 25;
  else if (transitionRatio >= 8) computedStruct += 18;
  else if (transitionWordsCount >= 2) computedStruct += 12;
  else computedStruct += 6;

  structureScore = Math.min(100, computedStruct);

  // Minimum length penalty if content is very thin
  if (wordCount < 100) {
    keywordScore = Math.min(keywordScore, 35);
    readabilityScore = Math.min(readabilityScore, 40);
    structureScore = Math.min(structureScore, 35);
  } else if (wordCount < 300) {
    keywordScore = Math.min(keywordScore, 65);
    readabilityScore = Math.min(readabilityScore, 70);
    structureScore = Math.min(structureScore, 65);
  }

  // Overall Weighted Score (0-100)
  const overallScore = Math.round(
    keywordScore * 0.35 + readabilityScore * 0.35 + structureScore * 0.30
  );

  // Grade categorization
  let grade: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Poor';
  let gradeColor = 'text-rose-500';
  let badgeBg = 'bg-rose-500/10 border-rose-500/30 text-rose-500';

  if (overallScore >= 85) {
    grade = 'Excellent';
    gradeColor = 'text-emerald-500';
    badgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';
  } else if (overallScore >= 70) {
    grade = 'Good';
    gradeColor = 'text-cyan-500';
    badgeBg = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500';
  } else if (overallScore >= 50) {
    grade = 'Fair';
    gradeColor = 'text-amber-500';
    badgeBg = 'bg-amber-500/10 border-amber-500/30 text-amber-500';
  }

  // Diagnostic tips
  const tips: ContentScoreResult['tips'] = [];

  // Keyword tips
  if (!cleanKeyword) {
    tips.push({
      type: 'warning',
      category: 'keywords',
      text: 'Enter a Primary Keyword to evaluate search targeting and placement.',
    });
  } else {
    if (!inTitle) {
      tips.push({
        type: 'warning',
        category: 'keywords',
        text: `Primary keyword "${cleanKeyword}" is missing from Title. Place it near the beginning.`,
      });
    } else {
      tips.push({
        type: 'success',
        category: 'keywords',
        text: `Keyword detected in Title for optimal SEO CTR.`,
      });
    }

    if (!inMeta) {
      tips.push({
        type: 'warning',
        category: 'keywords',
        text: 'Keyword is missing from Meta Description snippet.',
      });
    }

    if (!inFirstParagraph && wordCount > 80) {
      tips.push({
        type: 'info',
        category: 'keywords',
        text: 'Include primary keyword within the first 100 words (the executive hook).',
      });
    }

    if (keywordDensity > 3.0) {
      tips.push({
        type: 'warning',
        category: 'keywords',
        text: `Keyword density is high (${keywordDensity}%). Reduce keyword frequency to prevent Google over-optimization penalties.`,
      });
    } else if (keywordDensity >= 0.8 && keywordDensity <= 2.5) {
      tips.push({
        type: 'success',
        category: 'keywords',
        text: `Keyword density is ideal (${keywordDensity}%). Perfectly balanced.`,
      });
    }
  }

  // Readability tips
  if (avgWordsPerSentence > 22) {
    tips.push({
      type: 'warning',
      category: 'readability',
      text: `Average sentence length is ${avgWordsPerSentence} words. Break long sentences into smaller, punchier thoughts.`,
    });
  } else {
    tips.push({
      type: 'success',
      category: 'readability',
      text: `Sentence length average (${avgWordsPerSentence} words) maintains high reader engagement.`,
    });
  }

  if (longParagraphCount > 0) {
    tips.push({
      type: 'warning',
      category: 'readability',
      text: `${longParagraphCount} paragraph(s) exceed 130 words. Break them up to improve mobile readability.`,
    });
  }

  // Structure tips
  if (subheadingCount < expectedHeadings) {
    tips.push({
      type: 'info',
      category: 'structure',
      text: `Add ${Math.max(1, expectedHeadings - subheadingCount)} more H2/H3 subheadings to structure your ${wordCount}-word brief for skimming.`,
    });
  } else {
    tips.push({
      type: 'success',
      category: 'structure',
      text: `Subheading hierarchy (${subheadingCount} headings) provides strong structural scaffolding.`,
    });
  }

  if (transitionWordsCount < 3 && sentenceCount > 5) {
    tips.push({
      type: 'info',
      category: 'structure',
      text: 'Use transitional connectors (e.g., "however", "furthermore", "consequently") to smooth paragraph flow.',
    });
  }

  // AdSense Depth & Length evaluation
  if (wordCount >= 1500) {
    tips.push({
      type: 'success',
      category: 'structure',
      text: `Panjang artikel (${wordCount} kata) memenuhi standar emas AdSense (Min. 1,500 kata) & berbobot tinggi.`,
    });
  } else if (wordCount >= 900) {
    tips.push({
      type: 'info',
      category: 'structure',
      text: `Panjang saat ini ${wordCount} kata. Disarankan mencapai 1,500+ kata agar aman dari penolakan "Low-Value Content" dan lolos AI detectors.`,
    });
  } else if (wordCount > 0) {
    tips.push({
      type: 'warning',
      category: 'structure',
      text: `Konten tipis (${wordCount} kata). Targetkan minimal 1,500 kata berkualitas jurnalisme manusia.`,
    });
  }

  return {
    overallScore,
    grade,
    gradeColor,
    badgeBg,
    wordCount,
    readingTimeMinutes,
    subscores: {
      keywords: {
        score: keywordScore,
        density: keywordDensity,
        inTitle,
        inMeta,
        inFirstParagraph,
        totalMatches,
        secondaryMatchesCount,
        totalSecondaryKeywords: secondaryList.length,
      },
      readability: {
        score: readabilityScore,
        fleschScore,
        readingLevel,
        avgSyllablesPerWord,
        complexWordRatio,
        longParagraphCount,
      },
      structure: {
        score: structureScore,
        avgWordsPerSentence,
        sentenceCount,
        subheadingCount,
        transitionWordsCount,
        varietyScore,
        longSentenceCount,
      },
    },
    tips,
  };
}

export const ArticleContentScorer: React.FC<ArticleContentScorerProps> = ({
  title,
  metaDescription,
  primaryKeyword,
  secondaryKeywords = '',
  content = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'keywords' | 'readability' | 'structure'>('all');

  const result = useMemo(() => {
    return computeArticleScore(title, metaDescription, primaryKeyword, secondaryKeywords, content);
  }, [title, metaDescription, primaryKeyword, secondaryKeywords, content]);

  // Color helper for subscore bars
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-emerald-500 to-teal-400';
    if (score >= 70) return 'from-cyan-500 to-blue-500';
    if (score >= 50) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-red-400';
  };

  const filteredTips = activeTab === 'all'
    ? result.tips
    : result.tips.filter((t) => t.category === activeTab);

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm overflow-hidden transition-all">
      {/* Header Bar with Circular Gauge & Progress Indicator */}
      <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40">
        <div className="flex items-center gap-3.5">
          {/* Radial Circular Progress Meter */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              {/* Background circle track */}
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Animated Progress Arc */}
              <path
                className={`transition-all duration-700 ease-out ${
                  result.overallScore >= 85
                    ? 'text-emerald-500'
                    : result.overallScore >= 70
                    ? 'text-cyan-500'
                    : result.overallScore >= 50
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
                strokeDasharray={`${result.overallScore}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white leading-none">
                {result.overallScore}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">/100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm font-heading text-slate-900 dark:text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-500" />
                <span>Automated Article Content Score</span>
              </h4>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${result.badgeBg}`}>
                {result.grade}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live evaluation of keywords, readability, and sentence rhythm.
            </p>
          </div>
        </div>

        {/* Quick Stats Pill & Toggle Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span><strong>{result.wordCount}</strong> words</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span><strong>{result.readingTimeMinutes}</strong> min read</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Flesch: <strong>{result.subscores.readability.fleschScore}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Overall Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
        <div
          className={`h-full bg-gradient-to-r transition-all duration-500 ${getScoreColor(result.overallScore)}`}
          style={{ width: `${Math.max(4, result.overallScore)}%` }}
        />
      </div>

      {/* Expanded Breakdown Section */}
      {isExpanded && (
        <div className="p-4 md:p-5 space-y-5 animate-in fade-in duration-200">
          {/* Subscore Cards Grid: Keywords, Readability, Sentence Structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. KEYWORDS SUBSCORE */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Keywords Target</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-cyan-400">
                  {result.subscores.keywords.score}/100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreColor(result.subscores.keywords.score)} transition-all duration-500 rounded-full`}
                  style={{ width: `${result.subscores.keywords.score}%` }}
                />
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>In H1 Title:</span>
                  {result.subscores.keywords.inTitle ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> Yes</span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5"><X className="w-3 h-3 text-rose-500" /> Missing</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>In Meta Description:</span>
                  {result.subscores.keywords.inMeta ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> Yes</span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5"><X className="w-3 h-3 text-rose-500" /> Missing</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Keyword Density:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {result.subscores.keywords.density}% ({result.subscores.keywords.totalMatches}x)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. READABILITY SUBSCORE */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Readability Level</span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {result.subscores.readability.score}/100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreColor(result.subscores.readability.score)} transition-all duration-500 rounded-full`}
                  style={{ width: `${result.subscores.readability.score}%` }}
                />
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Flesch Score:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {result.subscores.readability.fleschScore} / 100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audience Tier:</span>
                  <span className="text-slate-900 dark:text-white truncate max-w-[120px] font-medium" title={result.subscores.readability.readingLevel}>
                    {result.subscores.readability.readingLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Wall of Text Check:</span>
                  {result.subscores.readability.longParagraphCount === 0 ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> 0 Dense Blocks</span>
                  ) : (
                    <span className="text-amber-500 font-semibold">{result.subscores.readability.longParagraphCount} long</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. SENTENCE STRUCTURE SUBSCORE */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <AlignLeft className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sentence Structure</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {result.subscores.structure.score}/100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreColor(result.subscores.structure.score)} transition-all duration-500 rounded-full`}
                  style={{ width: `${result.subscores.structure.score}%` }}
                />
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Avg Words / Sentence:</span>
                  <span className={`font-mono font-semibold ${
                    result.subscores.structure.avgWordsPerSentence <= 20 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {result.subscores.structure.avgWordsPerSentence} wps
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subheadings (H2/H3):</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {result.subscores.structure.subheadingCount} headings
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Transition Connectors:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {result.subscores.structure.transitionWordsCount} used
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Actionable Tips with Filter Tabs */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Editorial Optimization Suggestions:</span>
              </span>

              {/* Filter pills */}
              <div className="flex items-center gap-1">
                {(['all', 'keywords', 'readability', 'structure'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List of tips */}
            <div className="space-y-2">
              {filteredTips.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>All checks passed! Article content is primed for Google Tier-1 indexing.</span>
                </div>
              ) : (
                filteredTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
                      tip.type === 'success'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                        : tip.type === 'warning'
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                        : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-300'
                    }`}
                  >
                    {tip.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : tip.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">{tip.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
