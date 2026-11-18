import React, { useState } from 'react';
import { Mail, MapPin, Clock, Lock, Send, CheckCircle2, Shield } from 'lucide-react';

export const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Editorial Inquiry',
    message: '',
    consent: true,
  });
  const [submitted, setSubmitted] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    const body = `${formData.message}\n\n— ${formData.name} (${formData.email})`;
    window.location.href = `mailto:editorial@briefzy.me?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Mail className="w-3.5 h-3.5" />
          <span>Direct Editorial & Partner Communications</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight mb-4">
          Contact Briefzy
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          For editorial questions, corrections, partnerships, or technical feedback, contact the Briefzy team using the email addresses below. The form opens your email application; it does not send data directly to our server.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Contact Information & Channels */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Official Channels</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Editorial Board</div>
                  <a href="mailto:editorial@briefzy.me" className="text-amber-500 hover:underline">
                    editorial@briefzy.me
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">AdSense & Partnerships</div>
                  <a href="mailto:partners@briefzy.me" className="text-indigo-500 hover:underline">
                    partners@briefzy.me
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Response time</div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    We aim to respond to genuine enquiries within a few business days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Online publication</div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Briefzy is published online. Please reach us by email.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Encryption Shield Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              <Lock className="w-4 h-4" />
              <span>How this contact form works</span>
            </div>
            <p className="leading-relaxed">
              When you submit this form, your browser opens a new email addressed to editorial@briefzy.me. The message is sent only if you choose to send it in your email application. Your email provider handles the transmission under its own privacy and security terms.
            </p>
          </div>
        </div>

        {/* Interactive Form */}
        <div className="md:col-span-7">
          <div className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mb-2">
                  Almost done: send the email
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                  Thank you, <strong>{formData.name}</strong>. Your email app should have opened with your message ready to send to editorial@briefzy.me. If it did not, please email us directly at that address. We aim to reply within a few business days.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', subject: 'Editorial Inquiry', message: '', consent: true });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alexander Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alexander@organization.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Editorial Inquiry">Editorial Story Pitch / Corrections</option>
                    <option value="Google AdSense & Media Partnership">Google AdSense & Brand Sponsorship</option>
                    <option value="Press & Interview Request">Press & Media Interview Request</option>
                    <option value="DMCA & Rights Clearance">DMCA & Copyright Clearance</option>
                    <option value="Technical Support">Technical & Site Access Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Message Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide detailed context regarding your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="consentCheck"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="consentCheck" className="text-xs text-slate-500 dark:text-slate-400">
                    I have read the Briefzy Privacy Policy and understand that this form opens my email application.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Email Application</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
