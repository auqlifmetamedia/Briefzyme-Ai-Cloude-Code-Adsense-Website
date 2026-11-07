import React, { useState } from 'react';
import { CategoryItem, Language } from '../types.ts';
import { Logo } from './Logo.tsx';
import { translations } from '../utils/translations.ts';
import {
  Search,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  ChevronDown,
  } from 'lucide-react';

interface NavbarProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  categoriesList?: (string | CategoryItem)[];
  onOpenSearch: () => void;
  onNavigateHome: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentLang: Language;
  onChangeLang: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  categoriesList,
  onOpenSearch,
  onNavigateHome,
  darkMode,
  onToggleDarkMode,
  currentLang,
  onChangeLang,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const t = translations[currentLang] || translations.en;

  const dynamicCategoryNames = categoriesList
    ? categoriesList.map((c) => (typeof c === 'string' ? c : c.name))
    : [
        'Technology',
        'Finance',
        'Cybersecurity',
        'SaaS & Business',
        'Strategy',
        'Future of Work',
      ];

  const categories = ['All', ...dynamicCategoryNames];

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Main Reader Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div onClick={onNavigateHome}>
          <Logo size="md" showDomain={true} />
        </div>

        {/* Center Categories (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                onSelectCategory(cat);
                onNavigateHome();
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                currentCategory === cat
                  ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-indigo-50/50 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Right Reader Tools: Search, Maps, AI Key, Sitemap, Language, Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Instant Search */}
          <button
            onClick={onOpenSearch}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-cyan-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2 cursor-pointer shadow-xs text-xs"
            title="Search Stories (⌘K)"
          >
            <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400" />
            <span className="hidden md:inline font-medium text-slate-400">Search...</span>
          </button>

          {/* Multi-language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span className="uppercase font-mono font-bold text-[11px] hidden sm:inline">
                {currentLang}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      onChangeLang(l.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                      currentLang === l.code ? 'font-bold text-indigo-600 dark:text-cyan-400 bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{l.flag} {l.label}</span>
                    {currentLang === l.code && <span className="text-[10px] text-cyan-500 font-mono">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 animate-in slide-in-from-top-4 duration-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Categories
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  onNavigateHome();
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                  currentCategory === cat
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Briefzy</span>
            <span className="font-mono text-slate-400">briefzy.me</span>
          </div>
        </div>
      )}
    </header>
  );
};
