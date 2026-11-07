import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Sliders,
  FileText,
  ChevronDown,
  X,
  Radio,
} from 'lucide-react';
import {
  hasVisitorKey,
  callVisitorGemini,
  generateHeuristicPodcastScript,
  stripHtml,
} from '../utils/visitorAi.ts';

interface AiAudioPlayerProps {
  title: string;
  metaDescription: string;
  keyTakeaways?: string[];
  content: string;
  primaryKeyword?: string;
  onOpenKeyModal: () => void;
}

export const AiAudioPlayer: React.FC<AiAudioPlayerProps> = ({
  title,
  metaDescription,
  keyTakeaways = [],
  content,
  primaryKeyword = '',
  onOpenKeyModal,
}) => {
  const [mode, setMode] = useState<'podcast' | 'full'>('podcast');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGeneratingAiScript, setIsGeneratingAiScript] = useState(false);
  const [podcastScript, setPodcastScript] = useState<string>(() => {
    return generateHeuristicPodcastScript(title, metaDescription, keyTakeaways, content);
  });
  const [showScriptDrawer, setShowScriptDrawer] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const durationEstimate =
    mode === 'podcast' ? 120 : Math.max(180, Math.round(stripHtml(content).split(' ').length / 2.5));

  // Reset/update script when article changes
  useEffect(() => {
    stopAudio();
    const defaultScript = generateHeuristicPodcastScript(title, metaDescription, keyTakeaways, content);
    setPodcastScript(defaultScript);
  }, [title, content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setElapsedSeconds(0);
  };

  const getTargetText = () => {
    if (mode === 'podcast') {
      return podcastScript;
    }
    return `${title}. ${metaDescription}. ${stripHtml(content)}`;
  };

  const startAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      startTimer();
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = getTargetText();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Pick premier English voice (Natural US / UK English)
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google US English') ||
            v.name.includes('Google UK English') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.lang = 'en-US';
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      startTimer();
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      startAudio();
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        const total = durationEstimate / playbackRate;
        const calcProgress = Math.min(99, Math.round((next / total) * 100));
        setProgress(calcProgress);
        return next;
      });
    }, 1000);
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (isPlaying && utteranceRef.current) {
      pauseAudio();
      setTimeout(() => {
        startAudio();
      }, 50);
    }
  };

  const handleGenerateAiPodcastScript = async () => {
    if (!hasVisitorKey()) {
      onOpenKeyModal();
      return;
    }

    setIsGeneratingAiScript(true);
    const systemPrompt = `You are a premier executive business podcast host in the style of Bloomberg and NPR. Write a crisp, dynamic 2-minute broadcast script (around 260 words) in flawless American English. Open with an authoritative newsroom intro, detail 3 surprising market metrics/strategic realities, and finish with a decisive executive takeaway.`;
    const userPrompt = `Create an executive 2-minute podcast script for:
Title: ${title}
Summary: ${metaDescription}
Keyword: ${primaryKeyword}
Key Takeaways: ${keyTakeaways.join('; ')}
Article Excerpt: ${stripHtml(content).slice(0, 1600)}`;

    const response = await callVisitorGemini(userPrompt, systemPrompt);
    setIsGeneratingAiScript(false);

    if (response.text) {
      setPodcastScript(response.text);
      setShowScriptDrawer(true);
      stopAudio();
    } else if (response.error === 'NO_KEY_PROVIDED') {
      onOpenKeyModal();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
    setProgress(pct);
    const newSeconds = Math.round((pct / 100) * (durationEstimate / playbackRate));
    setElapsedSeconds(newSeconds);
  };

  return (
    <div className="my-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
      {/* Sleek Single-Row Audio Bar */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Play/Pause + Brand Badge + Duration */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={togglePlay}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
              isPlaying
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white ring-2 ring-cyan-400/40'
                : 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:brightness-110'
            }`}
            title={isPlaying ? 'Pause Narration' : 'Listen with AI Voice'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={stopAudio}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <span className="flex items-center gap-1">
                <Radio className={`w-3.5 h-3.5 text-cyan-500 ${isPlaying ? 'animate-pulse' : ''}`} />
                <span>AI Briefing</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                English Audio
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatTime(elapsedSeconds)}
              </span>
              <span>/</span>
              <span>{formatTime(durationEstimate)}</span>
            </div>
          </div>
        </div>

        {/* Center: Waveform visualizer (visible when playing) */}
        <div className="hidden md:flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          {[20, 60, 90, 40, 80, 50, 95, 70, 30, 85, 45].map((h, i) => (
            <span
              key={i}
              className={`w-0.5 sm:w-1 rounded-full transition-all duration-200 ${
                isPlaying
                  ? 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(25, (h * (i % 2 === 0 ? 0.8 : 1.2)) % 100)}%` : '20%',
                maxHeight: '18px',
                minHeight: '4px',
              }}
            />
          ))}
        </div>

        {/* Right: Mode Switcher, Speed & Script Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mode Pill Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                if (mode !== 'podcast') {
                  stopAudio();
                  setMode('podcast');
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                mode === 'podcast'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              2-Min Brief
            </button>
            <button
              onClick={() => {
                if (mode !== 'full') {
                  stopAudio();
                  setMode('full');
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                mode === 'full'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Full Read
            </button>
          </div>

          {/* Speed Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Playback Speed"
            >
              <span>{playbackRate}x</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSpeedMenu && (
              <div className="absolute right-0 mt-1 w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-30 text-xs font-mono">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`w-full px-2.5 py-1 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer ${
                      playbackRate === rate
                        ? 'font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom AI Script Trigger */}
          {mode === 'podcast' && (
            <button
              onClick={handleGenerateAiPodcastScript}
              disabled={isGeneratingAiScript}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-indigo-400/30 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Generate a custom podcast script with your Gemini Key"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiScript ? 'animate-spin text-cyan-400' : 'text-cyan-500'}`} />
              <span className="hidden sm:inline">
                {isGeneratingAiScript ? 'Generating...' : 'Custom AI'}
              </span>
            </button>
          )}

          {/* Transcript toggle */}
          <button
            onClick={() => setShowScriptDrawer(!showScriptDrawer)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showScriptDrawer
                ? 'border-indigo-500 text-indigo-600 dark:text-cyan-400 bg-indigo-50/50 dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-900'
            }`}
            title="Toggle Transcript"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sleek Interactive Progress Bar */}
      <div
        onClick={handleSeek}
        className="h-1 bg-slate-100 dark:bg-slate-800/80 rounded-b-2xl overflow-hidden cursor-pointer group relative"
      >
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-200 relative group-hover:h-1.5"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Expandable Transcript Drawer */}
      {showScriptDrawer && (
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 rounded-b-2xl text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60 font-semibold text-slate-900 dark:text-white">
            <span className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-cyan-500" />
              <span>Voice Narration Transcript ({mode === 'podcast' ? '2-Minute Brief' : 'Full Narrative'})</span>
            </span>
            <button
              onClick={() => setShowScriptDrawer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto pr-2 mt-2 leading-relaxed whitespace-pre-wrap font-sans text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
            {getTargetText()}
          </div>
        </div>
      )}
    </div>
  );
};
