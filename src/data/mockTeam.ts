import { TeamMember, StaffRole, RolePermissions } from '../types.ts';

export const rolePermissionMap: Record<StaffRole, RolePermissions> = {
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

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'staff-01',
    name: 'Briefzy Editorial Team',
    email: 'editorial@briefzy.me',
    role: 'Manager',
    title: 'Editorial Team',
    avatar: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='24' fill='%230f172a'/%3E%3Ctext x='60' y='80' font-family='Georgia,serif' font-size='64' font-weight='700' text-anchor='middle' fill='%23fbbf24'%3EB%3C/text%3E%3C/svg%3E",
    bio: 'The Briefzy editorial team researches, writes, and reviews practical guides on AI tools, online security, everyday tech, and remote work.',
    specialty: ['AI tools', 'Online security', 'Tech how-to', 'Remote work'],
    articlesCount: 0,
    verified: false,
    status: 'active',
    permissions: rolePermissionMap.Manager,
  },
];
