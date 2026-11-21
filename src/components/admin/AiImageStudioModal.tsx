import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Sliders,
  Download,
  Copy,
  Check,
  X,
  Upload,
  RefreshCw,
  Search,
  Maximize2,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Eye,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { GeneratedImageItem } from '../../types.ts';
import { adminFetch } from '../../utils/remote.ts';
import {
  buildTopicAltText,
  buildTopicImagePrompt,
  buildTopicStudioPresets,
  generateTopicVisualSvg,
  svgToDataUrl,
} from '../../utils/topicVisuals.ts';

interface AiImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentArticleTitle?: string;
  currentTopic?: string;
  currentKeyword?: string;
  currentCategory?: string;
  initialImage?: string;
  onApplyFeaturedImage: (imageUrl: string, altText: string) => void;
  onInsertIntoBody?: (imgHtml: string) => void;
}

type VisualStyle = 'editorial-scene' | 'visual-diagram' | 'workspace-photo' | 'flat-illustration';

export const AiImageStudioModal: React.FC<AiImageStudioModalProps> = ({
  isOpen,
  onClose,
  currentArticleTitle = '',
  currentTopic = '',
  currentKeyword = '',
  currentCategory = 'Productivity & AI Tools',
  initialImage = '',
  onApplyFeaturedImage,
  onInsertIntoBody,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('editorial-scene');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite-image' | 'gemini-nano-banana-2.1'>('gemini-3.1-flash-lite-image');

  const topicPromptDefault = useMemo(
    () =>
      buildTopicImagePrompt({
        title: currentArticleTitle,
        topic: currentTopic,
        keyword: currentKeyword,
        category: currentCategory,
        visualStyle,
      }),
    [currentArticleTitle, currentTopic, currentKeyword, currentCategory, visualStyle]
  );

  const topicPresets = useMemo(
    () =>
      buildTopicStudioPresets({
        title: currentArticleTitle,
        topic: currentTopic,
        keyword: currentKeyword,
        category: currentCategory,
      }),
    [currentArticleTitle, currentTopic, currentKeyword, currentCategory]
  );

  const fallbackTopicSvg = useMemo(
    () =>
      svgToDataUrl(
        generateTopicVisualSvg({
          title: currentArticleTitle || currentTopic || currentKeyword || 'Editorial Visual',
          topic: currentTopic,
          keyword: currentKeyword,
          category: currentCategory,
          styleMode: visualStyle,
        })
      ),
    [currentArticleTitle, currentTopic, currentKeyword, currentCategory, visualStyle]
  );

  const [prompt, setPrompt] = useState(topicPromptDefault);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16' | '21:9'>('16:9');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningNotice, setWarningNotice] = useState('');

  // Edit image options
  const [editSourceImage, setEditSourceImage] = useState<string>(initialImage || fallbackTopicSvg);
  const [editPrompt, setEditPrompt] = useState(topicPresets.editPresets[0].prompt);
  const [showCompare, setShowCompare] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAltText, setGeneratedAltText] = useState<string>('');
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Studio history
  const [history, setHistory] = useState<GeneratedImageItem[]>([]);

  // Always keep prompts & source image synchronized to the active article topic when opened or switched
  useEffect(() => {
    if (!isOpen) return;
    setPrompt(topicPromptDefault);
    setEditSourceImage(initialImage || fallbackTopicSvg);
    setEditPrompt(topicPresets.editPresets[0].prompt);
    setGeneratedAltText(
      buildTopicAltText({
        title: currentArticleTitle,
        keyword: currentKeyword,
        category: currentCategory,
      })
    );
    setErrorMessage('');
    setWarningNotice('');
  }, [
    isOpen,
    currentArticleTitle,
    currentTopic,
    currentKeyword,
    currentCategory,
    initialImage,
    topicPromptDefault,
    fallbackTopicSvg,
    topicPresets.editPresets,
  ]);

  if (!isOpen) return null;

  // Handle Text-to-Image Generation
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setErrorMessage('');
    setWarningNotice('');
    try {
      const res = await adminFetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          title: currentArticleTitle,
          topic: currentTopic,
          keyword: currentKeyword,
          category: currentCategory,
          visualStyle,
          aspectRatio,
          imageSize,
          useSearch: useSearchGrounding,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        if (data.warning) {
          setWarningNotice(`Using topic-matched SVG artwork engine (${data.warning}).`);
        }
        const autoAlt = buildTopicAltText({
          prompt: prompt.trim(),
          title: currentArticleTitle,
          keyword: currentKeyword,
          category: currentCategory,
        });
        setGeneratedAltText(autoAlt);

        const newItem: GeneratedImageItem = {
          id: `img-${Date.now()}`,
          url: data.imageUrl,
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
          model: data.model || selectedModel,
          createdAt: new Date().toLocaleTimeString(),
          altText: autoAlt,
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 7)]);
      } else {
        setErrorMessage(data.error || 'Failed to generate image. Please try again.');
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setErrorMessage(err.message || 'Network error occurred during image generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Edit Image (Image-to-Image)
  const handleEditImage = async () => {
    if (!editPrompt.trim() || !editSourceImage) return;
    setIsProcessing(true);
    setErrorMessage('');
    setWarningNotice('');
    try {
      const res = await adminFetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt.trim(),
          imageBase64: editSourceImage,
          aspectRatio,
          imageSize,
          title: currentArticleTitle,
          topic: currentTopic,
          keyword: currentKeyword,
          category: currentCategory,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        if (data.warning) {
          setWarningNotice(`Using topic-matched SVG artwork engine (${data.warning}).`);
        }
        const autoAlt = buildTopicAltText({
          prompt: editPrompt.trim(),
          title: currentArticleTitle,
          keyword: currentKeyword,
          category: currentCategory,
        });
        setGeneratedAltText(autoAlt);

        const newItem: GeneratedImageItem = {
          id: `img-${Date.now()}`,
          url: data.imageUrl,
          prompt: `[Edited] ${editPrompt.trim()}`,
          aspectRatio,
          imageSize,
          model: data.model || selectedModel,
          createdAt: new Date().toLocaleTimeString(),
          isEdited: true,
          originalUrl: editSourceImage,
          altText: autoAlt,
        };
        setHistory((prev) => [newItem, ...prev.slice(0, 7)]);
      } else {
        setErrorMessage(data.error || 'Failed to edit image.');
      }
    } catch (err: any) {
      console.error('Image edit error:', err);
      setErrorMessage(err.message || 'Error occurred while editing image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-generate Alt Text via API
  const handleAutoGenerateAltText = async () => {
    setIsGeneratingAlt(true);
    try {
      const res = await adminFetch('/api/images/seo-alt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeTab === 'create' ? prompt : editPrompt,
          title: currentArticleTitle,
          keyword: currentKeyword,
          category: currentCategory,
        }),
      });
      const data = await res.json();
      if (data.altText) {
        setGeneratedAltText(data.altText);
      }
    } catch (e) {
      console.warn('Alt text generation failed:', e);
    } finally {
      setIsGeneratingAlt(false);
    }
  };

  // Upload file from local disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEditSourceImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply as article featured image
  const handleApply = () => {
    if (!generatedImage) return;
    onApplyFeaturedImage(generatedImage, generatedAltText);
    setAppliedNotification('Applied to Article Featured Image!');
    setTimeout(() => {
      setAppliedNotification(null);
      onClose();
    }, 1200);
  };

  // Insert image HTML into article body
  const handleInsertBody = () => {
    if (!generatedImage || !onInsertIntoBody) return;
    const snippet = `<figure class="my-6">
  <img src="${generatedImage}" alt="${generatedAltText || currentArticleTitle}" class="w-full rounded-2xl shadow-md border border-slate-200 dark:border-slate-800" loading="lazy" referrerpolicy="no-referrer" />
  <figcaption class="mt-2 text-xs text-center text-slate-500 italic">${generatedAltText || currentArticleTitle}</figcaption>
</figure>`;
    onInsertIntoBody(snippet);
    setAppliedNotification('Embedded into Article Body!');
    setTimeout(() => setAppliedNotification(null), 2000);
  };

  // Copy Image Base64 / URL
  const handleCopyUrl = () => {
    if (!generatedImage) return;
    navigator.clipboard.writeText(generatedImage);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const promptPresets = topicPresets.createPresets;
  const editPresets = topicPresets.editPresets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Wand2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold font-heading text-slate-900 dark:text-white text-base">
                  Create &amp; Edit Images
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Cpu className="w-3 h-3" />
                  <span>{selectedModel}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {currentCategory}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
                Synced to: <strong className="text-slate-700 dark:text-slate-200">{currentArticleTitle || currentTopic || currentKeyword || 'Current Article'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Create vs Edit */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create New Image (Text-to-Image)</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Edit Existing Image (Image-to-Image)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Google E-E-A-T &amp; Image Search Grounding Ready</span>
          </div>
        </div>

        {/* Main Content Area: Split 50/50 */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Controls & Prompt inputs */}
          <div className="lg:col-span-6 space-y-4">
            {activeTab === 'create' ? (
              /* TAB 1: CREATE IMAGE */
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Topic-Matched Visual Prompt</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPrompt(topicPromptDefault)}
                      className="text-[10px] text-amber-500 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset to Article Topic</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image or diagram for this article topic..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden leading-relaxed shadow-xs"
                  />
                </div>

                {/* Visual Style & Model Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Visual Mode
                    </label>
                    <select
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="editorial-scene">Editorial Feature Scene</option>
                      <option value="visual-diagram">Topic Infographic / Diagram</option>
                      <option value="workspace-photo">Authentic Workspace Photo</option>
                      <option value="flat-illustration">Minimalist Vector Art</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Gemini Image Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="gemini-3.1-flash-lite-image">gemini-3.1-flash-lite-image (Fast)</option>
                      <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (Pro / Grounding)</option>
                    </select>
                  </div>
                </div>

                {/* Topic-aware preset chips */}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    Topic-Matched Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {promptPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setVisualStyle(preset.style);
                          setPrompt(preset.prompt);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700/60 cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio & Resolution Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['16:9', '4:3', '1:1', '9:16', '21:9'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold text-center border cursor-pointer transition-all ${
                            aspectRatio === ratio
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Image Resolution (nano banana 2.1)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['1K', '2K', '4K'] as const).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setImageSize(res)}
                          className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold text-center border cursor-pointer transition-all ${
                            imageSize === res
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Google Search Grounding toggle */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Google Search &amp; Image Grounding
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Synthesizes real-time web context using Google Image Search
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useSearchGrounding}
                    onChange={(e) => setUseSearchGrounding(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isProcessing || !prompt.trim()}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Topic Visual...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Topic-Matched Visual</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* TAB 2: EDIT IMAGE */
              <div className="space-y-4">
                {/* Source image preview & upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>Original Image to Edit</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-amber-500 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                      </button>
                      {initialImage && (
                        <button
                          type="button"
                          onClick={() => setEditSourceImage(initialImage)}
                          className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                        >
                          Article Image
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 group">
                    <img
                      src={editSourceImage}
                      alt="Source for editing"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace Image</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit prompt */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Edit Instructions / Modifications
                  </label>
                  <textarea
                    rows={3}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Describe exact modifications (e.g. Add futuristic glowing neural networks, warm sunrise lighting, sharp contrast)..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden leading-relaxed shadow-xs"
                  />
                </div>

                {/* Quick Edit Presets */}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    Quick Modification Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {editPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditPrompt(preset.prompt)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700/60 cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Edit */}
                <button
                  type="button"
                  onClick={handleEditImage}
                  disabled={isProcessing || !editPrompt.trim() || !editSourceImage}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Applying AI Edits via gemini-nano-banana-2.1...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Apply Edit with gemini-nano-banana-2.1</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {errorMessage}
              </div>
            )}
            {warningNotice && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{warningNotice}</span>
              </div>
            )}
          </div>

          {/* RIGHT: Live Preview, SEO Alt Text & Apply Options */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span>Output Preview</span>
                </span>
                {activeTab === 'edit' && generatedImage && (
                  <button
                    type="button"
                    onClick={() => setShowCompare(!showCompare)}
                    className="text-[11px] text-amber-500 hover:underline font-bold cursor-pointer"
                  >
                    {showCompare ? 'Show Edited Only' : 'Compare Before/After'}
                  </button>
                )}
              </div>

              {/* Image Preview Box */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative shadow-inner flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center animate-pulse">
                      <Cpu className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Rendering with gemini-nano-banana-2.1</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Synthesizing ultra-high definition pixels...</div>
                    </div>
                  </div>
                ) : generatedImage ? (
                  showCompare && activeTab === 'edit' ? (
                    <div className="grid grid-cols-2 w-full h-full">
                      <div className="relative h-full border-r border-slate-800">
                        <img src={editSourceImage} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                          Before
                        </span>
                      </div>
                      <div className="relative h-full">
                        <img src={generatedImage} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute bottom-2 right-2 bg-amber-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded">
                          After (AI Edited)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
                    <ImageIcon className="w-10 h-10 stroke-1" />
                    <p className="text-xs max-w-xs">
                      Enter a prompt or select a preset and click generate to create high-definition images using Google DeepMind gemini-nano-banana-2.1.
                    </p>
                  </div>
                )}

                {/* Watermark / Tech spec badge */}
                {generatedImage && !isProcessing && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-white/10">
                      {imageSize} • {aspectRatio}
                    </span>
                  </div>
                )}
              </div>

              {/* SEO Image Alt-Text Generator */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Google Image SEO Alt-Text</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateAltText}
                    disabled={isGeneratingAlt}
                    className="text-[10px] text-amber-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingAlt ? 'Generating Alt...' : '1-Click Auto Alt-Text'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={generatedAltText}
                  onChange={(e) => setGeneratedAltText(e.target.value)}
                  placeholder="Descriptive alt text for Google Image SEO and E-E-A-T..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Action Buttons */}
              {generatedImage && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleApply}
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Set as Article Featured Image</span>
                    </button>

                    {onInsertIntoBody && (
                      <button
                        type="button"
                        onClick={handleInsertBody}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Insert into Article Body</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied Data URL' : 'Copy URL'}</span>
                    </button>

                    <a
                      href={generatedImage}
                      download={`briefzy-ai-image-${Date.now()}.png`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              )}

              {appliedNotification && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{appliedNotification}</span>
                </div>
              )}
            </div>

            {/* Recents History Bar */}
            {history.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-2">
                  Recent Studio Generations:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setGeneratedImage(item.url);
                        setGeneratedAltText(item.altText || '');
                      }}
                      className="relative w-14 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:border-amber-500 cursor-pointer transition-all"
                    >
                      <img src={item.url} alt="Recent" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {item.isEdited && (
                        <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
