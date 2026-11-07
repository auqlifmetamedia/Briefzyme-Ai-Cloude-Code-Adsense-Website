import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Layers,
} from 'lucide-react';
import { Article } from '../types.ts';

interface ArticleLocationExplorerProps {
  article: Article;
}

const GLOBAL_TECH_FINANCE_HUBS = [
  { name: 'Silicon Valley, CA', label: 'Silicon Valley' },
  { name: 'Wall Street, New York, NY', label: 'Wall Street' },
  { name: 'Canary Wharf, London, UK', label: 'London Tech & Finance' },
  { name: 'ETH Zurich AI Campus, Switzerland', label: 'Zurich AI Hub' },
  { name: 'Marina Bay Financial Centre, Singapore', label: 'Singapore APAC' },
  { name: 'Otemachi Financial District, Tokyo, Japan', label: 'Tokyo Hub' },
];

export const ArticleLocationExplorer: React.FC<ArticleLocationExplorerProps> = ({
  article,
}) => {
  // Derive smart initial query based on article topics
  const defaultLocation =
    article.primaryKeyword && article.primaryKeyword.length > 2
      ? `${article.primaryKeyword}, Silicon Valley, CA`
      : 'Silicon Valley, CA, USA';

  const [searchQuery, setSearchQuery] = useState(defaultLocation);
  const [activeLocation, setActiveLocation] = useState(defaultLocation);
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // m = roadmap, k = satellite
  const [isCopied, setIsCopied] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveLocation(searchQuery.trim());
    }
  };

  const handleSelectPreset = (location: string) => {
    setSearchQuery(location);
    setActiveLocation(location);
  };

  // Google Maps Direct Navigation URLs
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeLocation)}`;
  const searchMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeLocation)}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(activeLocation)}&t=${mapType}&z=13&ie=UTF8&iwloc=&output=embed`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${activeLocation} - ${searchMapUrl}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/20 border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-emerald-500/20 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Location Intelligence & Live Navigation
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                Google Maps
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore key global technology clusters, financial epicenters, and get live turn-by-turn directions.
            </p>
          </div>
        </div>

        {/* View in Full Google Maps external button */}
        <div className="flex items-center gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Route in Google Maps</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </a>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any place, company HQ, city, or address on Google Maps..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Explore Place
        </button>
      </form>

      {/* Preset Location Chips */}
      <div className="mb-5 flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-500" />
          <span>Quick Hubs:</span>
        </span>
        {GLOBAL_TECH_FINANCE_HUBS.map((hub) => (
          <button
            key={hub.name}
            onClick={() => handleSelectPreset(hub.name)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              activeLocation === hub.name
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {hub.label}
          </button>
        ))}
      </div>

      {/* Live Google Maps Interactive Viewport */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner relative">
        {/* Layer Controls Floating Header */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <button
            onClick={() => setMapType('m')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              mapType === 'm' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapType('k')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              mapType === 'k' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Satellite
          </button>
        </div>

        <iframe
          title={`Google Maps showing ${activeLocation}`}
          src={embedUrl}
          className="w-full h-80 sm:h-96 border-0"
          loading="lazy"
          allowFullScreen
        />

        {/* Bottom Status Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {activeLocation}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Link Copied' : 'Share Location'}</span>
            </button>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              <span>Turn-by-Turn Directions</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
