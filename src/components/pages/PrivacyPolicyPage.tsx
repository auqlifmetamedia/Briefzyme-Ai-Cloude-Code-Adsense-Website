import React from 'react';
import { Shield, Lock, FileCheck, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Google AdSense & GDPR / CCPA Validated</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last Updated & Ratified: October 13, 2026 • Effective Date: January 1, 2026
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-6 text-sm md:text-base leading-relaxed">
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs md:text-sm text-amber-900 dark:text-amber-200">
          <strong>Key Summary:</strong> At Briefzy (<strong>briefzy.me</strong>), safeguarding user privacy and transparency in advertising is paramount. We comply strictly with the European Union General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and Google AdSense Publisher Policies.
        </div>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            1. Google AdSense & Third-Party Advertising Disclosures
          </h2>
          <p>
            Briefzy displays advertisements served by Google AdSense and authorized third-party ad networks. In compliance with Google's Advertising Policies:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Third-Party Vendor Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to <em>briefzy.me</em> or other websites across the internet.
            </li>
            <li>
              <strong>Google DART & Advertising Cookies:</strong> Google's use of advertising cookies enables it and its partners to serve relevant ads to our readers based on their visit to our sites and/or other sites on the Internet.
            </li>
            <li>
              <strong>User Opt-Out Choices:</strong> Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="text-amber-500 underline font-medium">Google Ads Settings</a>. Alternatively, users can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noreferrer" className="text-amber-500 underline font-medium">www.aboutads.info</a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            2. Information We Collect
          </h2>
          <p>We collect information to deliver high-quality, relevant editorial journalism:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Log Files:</strong> Like all professional publications, Briefzy follows a standard procedure of utilizing log files. These include IP addresses, browser types, Internet Service Providers (ISPs), date/time stamps, referring/exit pages, and click counts. These are not linked to personally identifiable information.
            </li>
            <li>
              <strong>Voluntarily Provided Data:</strong> When subscribing to the Briefzy Daily Brief newsletter or contacting our editorial board, you provide your name and email address.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            3. Client-Side Data Encryption & Security Standards
          </h2>
          <p>
            Briefzy incorporates modern client-side data encryption (AES-256 standards) for form transmissions, newsletter subscriptions, and administrative authentication. All data in transit is protected via TLS 1.3 encryption with strict HTTP Strict Transport Security (HSTS) headers.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            4. GDPR Rights for European Economic Area (EEA) Readers
          </h2>
          <p>If you are a resident of the European Economic Area, you have established statutory rights:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The right to access and receive a copy of your personal data held by Briefzy.</li>
            <li>The right to rectify inaccurate or incomplete records.</li>
            <li>The right to erasure ("Right to be Forgotten").</li>
            <li>The right to restrict or object to automated data processing.</li>
            <li>The right to data portability in a machine-readable JSON format.</li>
          </ul>
          <p className="text-xs text-slate-500">
            To exercise these rights, email our Data Protection Officer at <code className="text-amber-500">dpo@briefzy.me</code>.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            5. CCPA Notice for California Consumers
          </h2>
          <p>
            Under the California Consumer Privacy Act (CCPA), California residents have the right to request that we disclose categories of collected personal information and the right to request deletion. <strong>Briefzy does not sell your personal data</strong> to third-party data brokers.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            6. Children's Online Privacy Protection Act (COPPA)
          </h2>
          <p>
            Briefzy does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you believe your child provided this information on our website, please contact us immediately.
          </p>
        </section>

        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <p className="font-semibold text-slate-900 dark:text-white mb-1">Data Controller Information:</p>
          <p>Briefzy (briefzy.me) • Attn: Privacy</p>
          <p>Email: privacy@briefzy.me</p>
        </div>
      </div>
    </div>
  );
};
