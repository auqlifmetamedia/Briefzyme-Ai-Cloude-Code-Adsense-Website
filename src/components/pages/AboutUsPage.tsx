import React, { useMemo, useState } from 'react';
import { BookOpen, ShieldCheck, Mail, RefreshCw, Users, CheckCircle2 } from 'lucide-react';
import type { TeamMember } from '../../types.ts';

interface AboutUsPageProps {
  teamMembers?: TeamMember[];
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ teamMembers = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categoryTabs = useMemo(() => {
    const cats = new Set<string>();
    teamMembers.forEach((m) => {
      if (m.category && m.category !== 'All') cats.add(m.category);
    });
    return ['All', ...Array.from(cats), 'Editorial Desk'];
  }, [teamMembers]);

  const visibleMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Editorial Desk') return !m.category || m.category === 'All';
      return m.category === selectedCategory;
    });
  }, [teamMembers, selectedCategory]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight mb-4">
          About Briefzy
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Briefzy publishes practical, plain-English guides on AI tools, online privacy and security,
          everyday tech, and remote work. Our goal is simple: help you get something done, or avoid
          a costly mistake, without wading through jargon or filler.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" /> What we cover
        </h2>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 dark:text-slate-300">
          <li><strong>Productivity &amp; AI Tools:</strong> how to use AI assistants and work habits that save time.</li>
          <li><strong>Online Privacy &amp; Security:</strong> clear steps to protect your accounts, devices, and data.</li>
          <li><strong>Tech How-To:</strong> step-by-step help for everyday computer and phone tasks.</li>
          <li><strong>Remote Work &amp; Careers:</strong> setting up and running a productive work-from-home life.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" /> How we work
        </h2>
        <ul className="list-disc pl-6 space-y-1.5 text-slate-600 dark:text-slate-300">
          <li>Guides are researched from official documentation and well-established best practices, then reviewed before publication.</li>
          <li>Some drafts are prepared with AI-assisted writing tools and are edited by the Briefzy editorial team before they go live.</li>
          <li>We do not invent statistics, quotes, or credentials. If a claim cannot be supported, we leave it out.</li>
          <li>Our articles are general information, not professional legal, financial, medical, or security-engineering advice.</li>
          <li>Advertising, including Google AdSense, may appear on the site. Ads never decide what we write.</li>
        </ul>
      </section>

      <section className="mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500 dark:text-cyan-400" /> Briefzy Authors &amp; Editorial Desk ({teamMembers.length})
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
          Every guide on Briefzy is written and reviewed by hands-on practitioners dedicated to real-world testing of AI tools,
          online security practices, everyday hardware, and remote team workflows—without exaggerated titles or honorary credentials.
        </p>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryTabs.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                {cat === 'All' ? `All Contributors (${teamMembers.length})` : cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleMembers.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-start gap-4"
            >
              <img
                src={m.avatar}
                alt={m.name}
                loading="lazy"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/25 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight flex items-center gap-1">
                    <span>{m.name}</span>
                    {m.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </h3>
                  {m.category && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-cyan-300 text-[10px] font-bold">
                      {m.category === 'All' ? 'Editorial Desk' : m.category}
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-0.5 mb-1.5">
                  {m.title || m.role}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {m.bio}
                </p>
                {m.specialty && m.specialty.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.specialty.slice(0, 4).map((spec, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-500" /> Corrections
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Found a mistake or an outdated step? Tell us and we will review it and update the article.
        </p>
      </section>

      <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-500" /> Contact
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <span className="block">
            Editorial and corrections:{' '}
            <a href="mailto:editorial@briefzy.me" className="bz-link">editorial@briefzy.me</a>
          </span>
          <span className="block">
            Privacy questions:{' '}
            <a href="mailto:privacy@briefzy.me" className="bz-link">privacy@briefzy.me</a>
          </span>
        </p>
      </section>
    </div>
  );
};
