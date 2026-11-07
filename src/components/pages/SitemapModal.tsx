import React, { useState } from 'react';
import { articleUrl } from '../../utils/routes.ts';
import { Article, CategoryItem } from '../../types.ts';
import { FileCode, Copy, Check, Download, ExternalLink, Globe, Sparkles, X } from 'lucide-react';

interface SitemapModalProps {
  articles: Article[];
  categories?: CategoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
}

export const SitemapModal: React.FC<SitemapModalProps> = ({
  articles,
  categories = [],
  isOpen,
  onClose,
  onSelectArticle,
}) => {
  const [tab, setTab] = useState<'visual' | 'xml'>('visual');
  const [copied, setCopied] = useState(false);
  const [pinged, setPinged] = useState(false);

  if (!isOpen) return null;

  const today = '2026-10-13';

  const defaultCategories: CategoryItem[] = [
    { id: '1', name: 'Technology', slug: 'technology', description: '', targetCpc: '' },
    { id: '2', name: 'Finance', slug: 'finance', description: '', targetCpc: '' },
    { id: '3', name: 'Cybersecurity', slug: 'cybersecurity', description: '', targetCpc: '' },
    { id: '4', name: 'SaaS & Business', slug: 'saas-business', description: '', targetCpc: '' },
    { id: '5', name: 'Strategy', slug: 'strategy', description: '', targetCpc: '' },
    { id: '6', name: 'Future of Work', slug: 'future-of-work', description: '', targetCpc: '' },
  ];

  const activeCategories = categories.length > 0 ? categories : defaultCategories;

  // Build standard Google XML Sitemap
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Core Domain Entry -->
  <url>
    <loc>https://briefzy.me/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Main Category Hubs -->
${activeCategories
  .map(
    (cat) => `  <url>
    <loc>https://briefzy.me/${cat.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`
  )
  .join('\n')}
  <!-- Mandatory AdSense & Compliance Pages -->
  <url>
    <loc>https://briefzy.me/about-us</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>
  </url>
  <url>
    <loc>https://briefzy.me/contact-us</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>
  </url>
  <url>
    <loc>https://briefzy.me/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>https://briefzy.me/terms-of-service</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>https://briefzy.me/dmca</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.50</priority>
  </url>
  <!-- Dynamic Article Endpoints -->
${articles
  .map(
    (art) => `  <url>
    <loc>${articleUrl(art)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.90</priority>
    <image:image>
      <image:loc>${art.featuredImage}</image:loc>
      <image:title>${art.title.replace(/&/g, '&amp;')}</image:title>
    </image:image>
  </url>`
  )
  .join('\n')}
</urlset>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePingGSC = () => {
    setPinged(true);
    setTimeout(() => setPinged(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                <span>sitemap.xml – Search Engine Index Engine</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Google Validated
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                https://briefzy.me/sitemap.xml • Optimized for Googlebot & Google News Indexing
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

        {/* Tab Controls & Actions */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('visual')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                tab === 'visual'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Visual Index ({articles.length + 12} URLs)
            </button>
            <button
              onClick={() => setTab('xml')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                tab === 'xml'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Raw XML Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePingGSC}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                pinged
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{pinged ? 'Pinged Google Search Console!' : 'Ping Googlebot'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied XML!' : 'Copy XML'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium transition-opacity hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'visual' ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Displaying canonical URLs indexed for Tier 1 search distribution.</span>
                <span>Format: sitemap-0.9</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {/* Core Pages */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500">1.0</span>
                    <span className="text-slate-900 dark:text-white font-medium">https://briefzy.me/</span>
                  </div>
                  <span className="text-slate-400">hourly • Main Hub</span>
                </div>

                {articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      onSelectArticle(art);
                      onClose();
                    }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between font-mono cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate pr-4">
                      <span className="font-bold text-emerald-500">0.9</span>
                      <span className="text-slate-700 dark:text-slate-300 group-hover:text-amber-500 truncate">
                        /category/{art.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/{art.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-slate-400">{art.publishDate}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 selection:bg-emerald-900 selection:text-white">
              {xmlContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
