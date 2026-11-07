import React, { useState } from 'react';
import { ListFilter, ChevronDown, ChevronUp, Hash, BookOpen } from 'lucide-react';

export interface TocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

interface TableOfContentsProps {
  items: TocItem[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!items || items.length < 2) return null;

  const handleScrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // offset sticky navbar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      // Update browser hash without page jump
      history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <nav
      aria-label="Table of Contents"
      className="not-prose my-8 p-5 sm:p-6 rounded-3xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
              <span>Table of Contents</span>
              <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {items.length} sections
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quick jump to sections • Anchor navigation
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? 'Collapse Table of Contents' : 'Expand Table of Contents'}
          className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <ol className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm">
          {items.map((item, index) => {
            const isH3 = item.level === 'h3';
            return (
              <li
                key={item.id || index}
                className={`transition-colors ${isH3 ? 'pl-5 sm:pl-6 text-slate-600 dark:text-slate-400' : 'font-medium text-slate-800 dark:text-slate-200'}`}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleScrollTo(item.id, e)}
                  className="group flex items-start gap-2 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <span className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 text-[11px] font-mono mt-0.5 shrink-0">
                    {isH3 ? '↳' : `${index + 1}.`}
                  </span>
                  <span className="group-hover:underline underline-offset-2 leading-relaxed">
                    {item.text}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
};

// Utility to parse H2 and H3 headings and inject matching IDs into HTML
export function processArticleHeadings(htmlContent: string): { processedHtml: string; tocItems: TocItem[] } {
  const tocItems: TocItem[] = [];
  const slugCounts: Record<string, number> = {};

  const processedHtml = htmlContent.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
    // Strip nested HTML tags from text
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return match;

    // Generate slug id
    let baseSlug = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'section';

    if (slugCounts[baseSlug]) {
      slugCounts[baseSlug]++;
      baseSlug = `${baseSlug}-${slugCounts[baseSlug]}`;
    } else {
      slugCounts[baseSlug] = 1;
    }

    const level = tag.toLowerCase() as 'h2' | 'h3';
    tocItems.push({
      id: baseSlug,
      text: cleanText,
      level,
    });

    // If ID already present in attrs, preserve or replace
    const hasId = /id=["'][^"']*["']/i.test(attrs);
    const updatedAttrs = hasId
      ? attrs.replace(/id=["'][^"']*["']/i, `id="${baseSlug}"`)
      : `${attrs} id="${baseSlug}"`;

    return `<${tag}${updatedAttrs} class="scroll-mt-24">${text}</${tag}>`;
  });

  return { processedHtml, tocItems };
}
