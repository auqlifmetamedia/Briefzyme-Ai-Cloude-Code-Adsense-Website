import React from 'react';
import { FileText, ShieldAlert, Scale, CheckCircle } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Scale className="w-3.5 h-3.5" />
          <span>Legal & Editorial Usage Agreement</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last updated: 18 November 2026 • Valid for Briefzy.me and associated syndication feeds
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-6 text-sm md:text-base leading-relaxed">
        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or reading content on <strong>Briefzy (briefzy.me)</strong>, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue access to the platform immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            2. Intellectual Property Rights & Syndication
          </h2>
          <p>
            Unless stated otherwise, original articles and branding published by Briefzy are protected by applicable intellectual property laws.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Fair Use & Quotation:</strong> You may quote a reasonable excerpt where permitted by applicable law, with clear attribution and a link to the original page.
            </li>
            <li>
              <strong>Prohibited Automated Scraping:</strong> Do not copy or republish substantial portions of the site's content without permission, except where permitted by applicable law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            3. Disclaimer of Financial & Legal Advice
          </h2>
          <p>
            Content published on Briefzy is for educational, informational, and journalistic purposes only. Market reports, SaaS unit economic models, and venture analyses do not constitute financial, investment, or legal advice. Readers must conduct independent due diligence before making capital allocation decisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            4. User Discussions & Comment Moderation
          </h2>
          <p>
            If reader comments are enabled, Briefzy may moderate or remove material that is unlawful, abusive, spam, or infringes another person's rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            5. Governing Law & Jurisdiction
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws that apply in the jurisdiction where the site publisher is established, without regard to conflict of law provisions.
          </p>
        </section>
      </div>
    </div>
  );
};
