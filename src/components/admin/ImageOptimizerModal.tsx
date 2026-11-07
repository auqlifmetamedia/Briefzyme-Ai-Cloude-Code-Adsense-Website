import React, { useState } from 'react';
import { Image, Sparkles, Check, Download, Zap, X, Sliders, Shield } from 'lucide-react';

interface ImageOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImage?: (imageUrl: string, altText: string) => void;
}

export const ImageOptimizerModal: React.FC<ImageOptimizerModalProps> = ({
  isOpen,
  onClose,
  onApplyImage,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'high' | 'balanced' | 'max'>('balanced');
  const [stripExif, setStripExif] = useState(true);
  const [generateSrcset, setGenerateSrcset] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);

  // Sample or uploaded image
  const [currentImage, setCurrentImage] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
  );
  const [altText, setAltText] = useState('Abstract neural network architecture visualizing autonomous enterprise AI agents');

  if (!isOpen) return null;

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimized(true);
    }, 800);
  };

  const handleApply = () => {
    if (onApplyImage) {
      onApplyImage(currentImage, altText);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                <span>Automated Image Optimizer Plugin</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Core Web Vitals LCP 100%
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                WebP conversion, EXIF data stripping, and responsive srcset generator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Comparison View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Original Uncompressed (PNG)</span>
                <span className="text-rose-600 font-mono font-bold">2,420 KB</span>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 relative">
                <img src={currentImage} alt="Original preview" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] px-2 py-0.5 rounded">
                  Format: PNG • 1920x1080 • EXIF Present
                </div>
              </div>
            </div>

            {/* After */}
            <div className="border border-emerald-300/80 dark:border-emerald-900/60 rounded-2xl overflow-hidden bg-emerald-50/20 dark:bg-emerald-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimized WebP Engine</span>
                </span>
                <span className="text-emerald-600 font-mono font-bold">185 KB (-92.3%)</span>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 relative">
                <img src={currentImage} alt="Optimized preview" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  <span>WebP • 100% Core Web Vitals • Clean EXIF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings & Knobs */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Optimization Preset:</span>
              <div className="flex items-center gap-1">
                {(['high', 'balanced', 'max'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSelectedPreset(preset)}
                    className={`px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold cursor-pointer transition-colors ${
                      selectedPreset === preset
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripExif}
                  onChange={(e) => setStripExif(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Strip GPS & EXIF Camera Metadata (Privacy Shield)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateSrcset}
                  onChange={(e) => setGenerateSrcset(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Generate Responsive Srcset (480w, 800w, 1200w)
                </span>
              </label>
            </div>
          </div>

          {/* Automated SEO Alt Text Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Automated Google SEO Alt-Text Description:</span>
              <button
                onClick={() =>
                  setAltText('High-resolution architectural diagram depicting enterprise AI autonomous pipelines with zero-latency data stream')
                }
                className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Re-generate Alt</span>
              </button>
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Speed Gain: <strong>+1.4s faster page load</strong> for mobile Tier-1 readers.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunOptimization}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              {isOptimizing ? 'Compressing...' : 'Test Re-Compress'}
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Article</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
