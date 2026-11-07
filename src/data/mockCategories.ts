import { CategoryItem } from '../types.ts';

export const initialCategories: CategoryItem[] = [
  {
    id: 'cat-ai',
    name: 'Productivity & AI Tools',
    slug: 'productivity-ai-tools',
    description: 'Practical ways to get more done with AI assistants, smarter workflows, and better work habits.',
    targetCpc: '',
    color: 'emerald',
  },
  {
    id: 'cat-sec',
    name: 'Online Security',
    slug: 'online-security',
    description: 'Plain-English steps to protect your accounts, devices, and personal data from scams and breaches.',
    targetCpc: '',
    color: 'rose',
  },
  {
    id: 'cat-how',
    name: 'Tech How-To',
    slug: 'tech-how-to',
    description: 'Step-by-step guides for everyday computer, phone, and home-network tasks.',
    targetCpc: '',
    color: 'blue',
  },
  {
    id: 'cat-work',
    name: 'Remote Work',
    slug: 'remote-work',
    description: 'Setting up a productive home office and building routines that make working remotely sustainable.',
    targetCpc: '',
    color: 'amber',
  },
];
