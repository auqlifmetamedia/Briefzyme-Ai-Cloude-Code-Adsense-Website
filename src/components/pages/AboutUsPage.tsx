import React from 'react';
import { BookOpen, ShieldCheck, Mail, RefreshCw } from 'lucide-react';

interface AboutUsPageProps {
  teamMembers?: import('../../types.ts').TeamMember[];
}

export const AboutUsPage: React.FC<AboutUsPageProps> = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
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
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Editorial and corrections:{' '}
          <a href="mailto:editorial@briefzy.me" className="text-amber-600 dark:text-amber-400 underline">editorial@briefzy.me</a>
          <br />
          Privacy questions:{' '}
          <a href="mailto:privacy@briefzy.me" className="text-amber-600 dark:text-amber-400 underline">privacy@briefzy.me</a>
        </p>
      </section>
    </div>
  );
};
