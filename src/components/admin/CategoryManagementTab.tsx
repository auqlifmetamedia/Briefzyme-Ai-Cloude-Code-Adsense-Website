import React, { useState } from 'react';
import { CategoryItem, Article } from '../../types.ts';
import {
  FolderPlus,
  Edit3,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  Layers,
  DollarSign,
  Plus,
  AlertCircle,
  CheckCircle,
  Tag,
} from 'lucide-react';

interface CategoryManagementTabProps {
  categories: CategoryItem[];
  articles: Article[];
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (category: CategoryItem) => void;
  onDeleteCategory: (categoryId: string) => void;
  operatorRole?: import('../../types.ts').StaffRole;
}

const AVAILABLE_COLORS = [
  { name: 'Indigo (Tech)', value: 'indigo' },
  { name: 'Emerald (Finance)', value: 'emerald' },
  { name: 'Rose (Security)', value: 'rose' },
  { name: 'Sky (SaaS)', value: 'sky' },
  { name: 'Amber (Strategy)', value: 'amber' },
  { name: 'Purple (Future)', value: 'purple' },
  { name: 'Teal (Operations)', value: 'teal' },
  { name: 'Cyan (AI & Data)', value: 'cyan' },
];

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  categories,
  articles,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [targetCpc, setTargetCpc] = useState('$18.50 - $42.00 (High)');
  const [color, setColor] = useState('indigo');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetForm = () => {
    setName('');
    setSlug('');
    setDescription('');
    setTargetCpc('$18.50 - $42.00 (High)');
    setColor('indigo');
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingCategory(null);
    setIsAddingCategory(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setTargetCpc(cat.targetCpc || '$18.50 - $42.00 (High)');
    setColor(cat.color || 'indigo');
    setIsAddingCategory(false);
  };

  const generateSlugFromName = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(generateSlugFromName(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Category name cannot be empty!' });
      return;
    }

    const cleanSlug = (slug.trim() || generateSlugFromName(name)).toLowerCase();

    if (editingCategory) {
      const updated: CategoryItem = {
        ...editingCategory,
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || `Comprehensive analysis and executive insights on ${name}.`,
        targetCpc,
        color,
      };
      onUpdateCategory(updated);
      setEditingCategory(null);
      setStatusMessage({ type: 'success', text: `Category "${updated.name}" updated successfully!` });
    } else {
      const exists = categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) {
        setStatusMessage({ type: 'error', text: `A category with the name "${name}" already exists!` });
        return;
      }

      const newCategory: CategoryItem = {
        id: `cat-${Date.now()}`,
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || `Curated editorial briefs and industry intelligence on ${name}.`,
        targetCpc,
        color,
      };
      onAddCategory(newCategory);
      setIsAddingCategory(false);
      setStatusMessage({ type: 'success', text: `Category "${newCategory.name}" successfully added to Briefzy!` });
    }

    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDelete = (cat: CategoryItem) => {
    if (categories.length <= 1) {
      setStatusMessage({ type: 'error', text: 'At least 1 active category is required.' });
      return;
    }
    const count = articles.filter((a) => a.category.toLowerCase() === cat.name.toLowerCase()).length;
    if (confirm(`Are you sure you want to delete category "${cat.name}"? There are ${count} stories in this category.`)) {
      onDeleteCategory(cat.id);
      setStatusMessage({ type: 'success', text: `Category "${cat.name}" has been deleted.` });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getColorClasses = (clr?: string) => {
    switch (clr) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'sky':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'teal':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Taxonomy & SEO Architecture</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total {categories.length} Categories
            </span>
          </div>
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Category & Taxonomy Management
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Create, edit, and organize taxonomy categories for Google SEO indexing, URL permalinks (<code className="text-amber-500 font-mono">/category/slug</code>), navbar navigation, and Tier-1 CPC optimization.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Form Add / Edit Category */}
      {(isAddingCategory || editingCategory) && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/40 shadow-xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Taxonomy Category'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This category will automatically synchronize with the navbar, sitemap.xml, home filter, and article editor.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAddingCategory(false);
                setEditingCategory(null);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence, Cloud Infrastructure, etc."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Slug URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  URL Permalink Slug (<span className="font-mono text-amber-500">/category/slug</span>)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. artificial-intelligence"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category Description (Meta & Google Index)
              </label>
              <textarea
                rows={2}
                placeholder="High-authority description for Google SERP snippet and category hub page..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target CPC */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Target AdSense CPC Auction (Estimated RPM)
                </label>
                <input
                  type="text"
                  placeholder="e.g. $22.00 - $48.50 (High Tier-1)"
                  value={targetCpc}
                  onChange={(e) => setTargetCpc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Color Accent */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Badge Accent Color
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  {AVAILABLE_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>{editingCategory ? 'Save Category Changes' : 'Publish New Category'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {categories.length} Categories
            </div>
            <div className="text-[11px] text-slate-400">Active in Menu & Navigation Bar</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              $18.50 Avg CPC
            </div>
            <div className="text-[11px] text-slate-400">AdSense Keyword Yield Tier-1</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {articles.length} Stories
            </div>
            <div className="text-[11px] text-slate-400">Indexed Across Categories</div>
          </div>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search categories by name, slug, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const categoryArticlesCount = articles.filter(
            (a) => a.category.toLowerCase() === cat.name.toLowerCase()
          ).length;

          return (
            <div
              key={cat.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between shadow-xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getColorClasses(
                      cat.color
                    )}`}
                  >
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1">
                  <span>Slug:</span>
                  <span className="text-amber-500 font-bold">/{cat.slug}</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                  <span>{categoryArticlesCount} published briefs</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {cat.targetCpc.split(' ')[0]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
          <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No categories found matching "{searchQuery}".</p>
        </div>
      )}

      {/* SEO & AdSense Strategy Callout */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>SEO & AdSense Monetization Guide for New Categories</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-white mb-1">1. Clean Permalink Architecture</div>
            <p className="text-[11px] text-slate-400">
              Every category generates a search-engine friendly permalink (e.g. <code className="text-amber-400 font-mono">briefzy.me/cybersecurity</code>) for rapid Googlebot crawling.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-white mb-1">2. High-Yield Auction Bidding</div>
            <p className="text-[11px] text-slate-400">
              Finance, SaaS, and Cybersecurity topics attract premium Tier-1 advertisers (US, UK, CA) with high CPC bids ($20–$50+).
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="font-bold text-white mb-1">3. Instant Automated Sync</div>
            <p className="text-[11px] text-slate-400">
              New categories immediately synchronize with the Navbar, article composer dropdowns, and live <code className="text-amber-400 font-mono">sitemap.xml</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
