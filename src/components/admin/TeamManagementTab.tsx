import React, { useState } from 'react';
import { StaffRole, TeamMember, RolePermissions } from '../../types.ts';
import {
  Users,
  Shield,
  UserPlus,
  CheckCircle2,
  Trash2,
  Edit3,
  X,
  UserCheck,
  AlertCircle,
  Briefcase,
  Sparkles,
  Award,
} from 'lucide-react';

interface TeamManagementTabProps {
  teamMembers: TeamMember[];
  onAddMember: (newMember: TeamMember) => void;
  onUpdateMember: (updatedMember: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  currentActiveMemberId: string;
  onSwitchActiveMember: (id: string) => void;
}

export const TeamManagementTab: React.FC<TeamManagementTabProps> = ({
  teamMembers,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  currentActiveMemberId,
  onSwitchActiveMember,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<StaffRole | 'All'>('All');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('Writer');
  const [formTitle, setFormTitle] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAvatar, setFormAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formVerified, setFormVerified] = useState(true);

  const rolePermissionMap: Record<StaffRole, RolePermissions> = {
    Manager: {
      canDraft: true,
      canUseAi: true,
      canReview: true,
      canPublish: true,
      canManageTeam: true,
      canManageAdSense: true,
    },
    Supervisor: {
      canDraft: true,
      canUseAi: true,
      canReview: true,
      canPublish: true,
      canManageTeam: false,
      canManageAdSense: false,
    },
    Editor: {
      canDraft: true,
      canUseAi: true,
      canReview: true,
      canPublish: false,
      canManageTeam: false,
      canManageAdSense: false,
    },
    Writer: {
      canDraft: true,
      canUseAi: true,
      canReview: false,
      canPublish: false,
      canManageTeam: false,
      canManageAdSense: false,
    },
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('Writer');
    setFormTitle('');
    setFormBio('');
    setFormAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80');
    setFormSpecialty('');
    setFormVerified(true);
    setIsAddingMember(false);
    setEditingMemberId(null);
  };

  const handleStartEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormTitle(member.title);
    setFormBio(member.bio);
    setFormAvatar(member.avatar);
    setFormSpecialty(member.specialty.join(', '));
    setFormVerified(member.verified);
    setIsAddingMember(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const specialties = formSpecialty
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (editingMemberId) {
      // Update existing
      const existing = teamMembers.find((m) => m.id === editingMemberId);
      if (existing) {
        const updated: TeamMember = {
          ...existing,
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          title: formTitle.trim() || getDefaultTitle(formRole),
          avatar: formAvatar.trim(),
          bio: formBio.trim() || `Journalist and contributor covering ${specialties.join(', ') || 'digital topics'} for Briefzy.`,
          specialty: specialties.length > 0 ? specialties : ['Editorial Writing'],
          verified: formVerified,
          permissions: rolePermissionMap[formRole],
        };
        onUpdateMember(updated);
      }
    } else {
      // Create new
      const newMember: TeamMember = {
        id: `staff-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        title: formTitle.trim() || getDefaultTitle(formRole),
        avatar: formAvatar.trim(),
        bio: formBio.trim() || `Journalist and contributor covering ${specialties.join(', ') || 'digital topics'} for Briefzy.`,
        specialty: specialties.length > 0 ? specialties : ['Editorial Writing'],
        articlesCount: 0,
        verified: formVerified,
        status: 'active',
        permissions: rolePermissionMap[formRole],
      };
      onAddMember(newMember);
    }

    resetForm();
  };

  const getDefaultTitle = (role: StaffRole): string => {
    switch (role) {
      case 'Manager':
        return 'Executive Publisher & General Manager';
      case 'Supervisor':
        return 'Editorial Supervisor & Quality Director';
      case 'Editor':
        return 'Senior Technical & Fact-Checking Editor';
      case 'Writer':
        return 'Staff Technology & Business Columnist';
    }
  };

  const roleBadgeStyles: Record<StaffRole, string> = {
    Manager: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    Supervisor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    Editor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    Writer: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (selectedRoleFilter === 'All') return true;
    return m.role === selectedRoleFilter;
  });

  const activeOperator = teamMembers.find((m) => m.id === currentActiveMemberId) || teamMembers[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Active Persona Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <span>Editorial Team & RBAC Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-medium">
              E-E-A-T Verified
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage Writers, Editors, Supervisors, and Managers with multi-tiered role-based access control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Operator Badge */}
          <div className="p-2 px-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2.5 text-xs">
            <span className="text-slate-400 text-[11px]">Logged in as:</span>
            <img src={activeOperator.avatar} alt={activeOperator.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-400" />
            <span className="font-bold text-slate-900 dark:text-white">{activeOperator.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleBadgeStyles[activeOperator.role]}`}>
              {activeOperator.role}
            </span>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsAddingMember(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Role Definitions & Permissions Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Writer
            </span>
            <span className="text-xs font-mono text-slate-400">Level 1</span>
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Content Authoring</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Write drafts, use AI SEO Assistant, research keywords, and submit completed briefs for peer review.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Draft & AI Generate • ✕ Direct Publish
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Editor
            </span>
            <span className="text-xs font-mono text-slate-400">Level 2</span>
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Review & Fact-Check</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Audit copy quality, verify citation accuracy (E-E-A-T), optimize SEO headlines and meta descriptions.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Review, Edit & Fact-Check
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              Supervisor
            </span>
            <span className="text-xs font-mono text-slate-400">Level 3</span>
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Editorial Oversight</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Oversee publication calendar, manage beats, validate Google Helpful Content alignment, and issue final approvals.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Final Approval & Publishing
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Manager
            </span>
            <span className="text-xs font-mono text-slate-400">Level 4 (Admin)</span>
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Executive Control</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Unrestricted administrative access: team provisioning, Google AdSense yield configuration, and security settings.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Full Access, AdSense & RBAC
          </div>
        </div>
      </div>

      {/* Add / Edit Staff Form */}
      {isAddingMember && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-400/80 dark:border-amber-500/60 shadow-xl space-y-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold font-heading text-lg text-slate-900 dark:text-white">
                  {editingMemberId ? 'Update Team Member Profile & Role' : 'Add New Editorial Team Member (Writer / Editor / Supervisor / Manager)'}
                </h4>
                <p className="text-xs text-slate-500">
                  Configure editorial role, access permissions, and E-E-A-T columnist credentials for Briefzy.
                </p>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name & Credentials
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Julian Vance, CISSP"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Corporate Email (@briefzy.me)
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@briefzy.me"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Editorial Role & Access Tier
                </label>
                <select
                  value={formRole}
                  onChange={(e) => {
                    const r = e.target.value as StaffRole;
                    setFormRole(r);
                    if (!formTitle) setFormTitle(getDefaultTitle(r));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Writer">Writer (Staff Columnist)</option>
                  <option value="Editor">Editor (Fact-Checker & Copy Editor)</option>
                  <option value="Supervisor">Supervisor (Editorial Lead & Reviewer)</option>
                  <option value="Manager">Manager (General Manager & Admin)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Masthead Title
                </label>
                <input
                  type="text"
                  placeholder={getDefaultTitle(formRole)}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Specialty Areas (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Architecture, Cybersecurity, SaaS Economics"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Profile Photo URL (Avatar)
              </label>
              <div className="flex items-center gap-3">
                <img src={formAvatar} alt="Preview" className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400 shrink-0" />
                <input
                  type="text"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormAvatar(
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80'
                    )
                  }
                  className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Preset 2
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormAvatar(
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&q=80'
                    )
                  }
                  className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Preset 3
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Author Biography & E-E-A-T Credentials (Critical for Google Trust)
              </label>
              <textarea
                rows={3}
                placeholder="Academic credentials, work history, or notable research achievements..."
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formVerified}
                  onChange={(e) => setFormVerified(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Display Verified Columnist Badge (E-E-A-T Verified Columnist)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold cursor-pointer shadow-xs"
                >
                  {editingMemberId ? 'Save Changes' : 'Register Member'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs & Directory */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs">
            {(['All', 'Manager', 'Supervisor', 'Editor', 'Writer'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  selectedRoleFilter === r
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {r === 'All' ? `All Team (${teamMembers.length})` : `${r} (${teamMembers.filter((m) => m.role === r).length})`}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredMembers.length} active staff
          </div>
        </div>

        {/* Staff Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.map((member) => {
            const isCurrent = member.id === currentActiveMemberId;

            return (
              <div
                key={member.id}
                className={`p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white">
                            {member.name}
                          </h4>
                          {member.verified && (
                            <span title="Verified E-E-A-T">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {member.title}
                        </div>
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border uppercase tracking-wider shrink-0 ${roleBadgeStyles[member.role]}`}
                    >
                      {member.role}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-2">
                    {member.bio}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {member.specialty.map((spec, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {member.articlesCount} briefs published
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                        ● Currently Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isCurrent && (
                      <button
                        onClick={() => onSwitchActiveMember(member.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-semibold text-[11px] cursor-pointer transition-colors"
                        title="Switch to this account"
                      >
                        Switch Persona
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit Staff Member"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {teamMembers.length > 1 && (
                      <button
                        onClick={() => onDeleteMember(member.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Staff Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
