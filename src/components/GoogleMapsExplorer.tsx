import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  Copy,
  Check,
  Building2,
  X,
} from 'lucide-react';

interface GoogleMapsExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const POPULAR_FINTECH_LOCATIONS = [
  { name: 'Silicon Valley, California', category: 'Tech Capital', query: 'Silicon Valley, CA, USA' },
  { name: 'Wall Street & NYSE, New York', category: 'Finance', query: 'New York Stock Exchange, Wall Street, New York, NY' },
  { name: 'Googleplex, Mountain View', category: 'HQ', query: 'Googleplex, 1600 Amphitheatre Pkwy, Mountain View, CA' },
  { name: 'Canary Wharf, London', category: 'Global Finance', query: 'Canary Wharf, London, UK' },
  { name: 'Marina Bay Financial Centre, Singapore', category: 'APAC Hub', query: 'Marina Bay Financial Centre, Singapore' },
  { name: 'Frankfurt Stock Exchange, Germany', category: 'EU Banking', query: 'Börse Frankfurt, Frankfurt, Germany' },
  { name: 'Otemachi Financial Hub, Tokyo', category: 'Asia Capital', query: 'Otemachi, Chiyoda City, Tokyo, Japan' },
];

export const GoogleMapsExplorer: React.FC<GoogleMapsExplorerProps> = ({
  isOpen,
  onClose,
  initialQuery = 'Silicon Valley, CA',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // m = roadmap, k = satellite
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const handleSelectPopular = (query: string) => {
    setSearchQuery(query);
    setActiveQuery(query);
  };

  // Turn-by-turn navigation URL in Google Maps
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeQuery)}`;
  // Direct Google Maps search URL
  const gmapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeQuery)}`;
  // Embed URL (Zero Owner API Key required)
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(activeQuery)}&t=${mapType}&z=14&ie=UTF8&iwloc=&output=embed`;

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(`${activeQuery} - ${gmapsSearchUrl}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-cyan-900/10 dark:from-indigo-950/60 dark:via-slate-900/40 dark:to-cyan-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading flex items-center gap-2">
                <span>Google Maps Explorer & Route Navigation</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live Navigation
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore global technology hubs, check transit corridors, and launch turn-by-turn GPS directions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Shortcuts */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company headquarters, city, exchange, or address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Place</span>
            </button>
          </form>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Key Hubs:</span>
            {POPULAR_FINTECH_LOCATIONS.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPopular(loc.query)}
                className={`px-2.5 py-1 rounded-xl text-[11px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeQuery === loc.query
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <Building2 className="w-3 h-3 text-emerald-500" />
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Map Body */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] bg-slate-100 dark:bg-slate-950">
          <iframe
            title="Google Maps Location"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
          />

          {/* Map Layer Floating Switcher */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => setMapType('m')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                mapType === 'm' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Roadmap
            </button>
            <button
              onClick={() => setMapType('k')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                mapType === 'k' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
              {activeQuery}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLocation}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy location info"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy Info'}</span>
            </button>

            {/* Turn-by-Turn Directions Button */}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Navigation className="w-4 h-4 animate-bounce" />
              <span>Launch Turn-by-Turn Routing in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
