import React from 'react';
import { ShieldCheck, Mail, AlertTriangle, FileText } from 'lucide-react';

export const DmcaPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Copyright Compliance & Takedown Protocol</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight mb-4">
          DMCA Copyright Notice
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Digital Millennium Copyright Act (17 U.S.C. § 512) Notification Procedure
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-6 text-sm md:text-base leading-relaxed">
        <p>
          Briefzy (<strong>briefzy.me</strong>) respects the intellectual property rights of creators and content owners. We strictly adhere to the Digital Millennium Copyright Act of 1998 (DMCA). It is our policy to respond with urgency to notices of alleged infringement and remove non-compliant materials.
        </p>

        <section>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
            Filing a Notice of Copyright Infringement
          </h2>
          <p>
            If you are a copyright owner or an agent thereof and believe that any content hosted on Briefzy infringes upon your copyrights, you may submit a formal notification containing:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright.</li>
            <li>Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are involved.</li>
            <li>Identification of the material that is claimed to be infringing, including the exact URL slug on <code>briefzy.me</code>.</li>
            <li>Information reasonably sufficient to permit us to contact you (full legal name, physical address, telephone number, and email address).</li>
            <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement made under penalty of perjury that the information in the notification is accurate.</li>
          </ol>
        </section>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Designated DMCA Copyright Agent
          </h3>
          <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
            <p><strong>Attn:</strong> Legal & Copyright Clearance Department</p>
            <p><strong>Site:</strong> Briefzy (briefzy.me)</p>
            <p><strong>Email:</strong> <a href="mailto:dmca@briefzy.me" className="text-amber-500 font-semibold underline">dmca@briefzy.me</a></p>
            <p><strong>Turnaround SLA:</strong> We review valid takedown notices promptly and act on them as soon as we reasonably can.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
