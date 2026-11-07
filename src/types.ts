export type Category = string;

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  targetCpc: string;
  color?: string;
}


export interface Author {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  verified: boolean;
}

export type StaffRole = 'Writer' | 'Editor' | 'Supervisor' | 'Manager';

export interface RolePermissions {
  canDraft: boolean;
  canUseAi: boolean;
  canReview: boolean;
  canPublish: boolean;
  canManageTeam: boolean;
  canManageAdSense: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  title: string;
  avatar: string;
  bio: string;
  specialty: string[];
  articlesCount: number;
  verified: boolean;
  status: 'active' | 'on_leave';
  permissions: RolePermissions;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CommentItem {
  id: string;
  author: string;
  date: string;
  content: string;
  likes: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: Category;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  readingTime: string;
  publishDate: string;
  author: Author;
  featuredImage: string;
  imageAlt: string;
  keyTakeaways: string[];
  content: string;
  faqs: FAQItem[];
  views: number;
  shares: number;
  tags: string[];
  seoScore: number;
  estimatedCpc: string;
  comments: CommentItem[];
  featured?: boolean;
}

export type Language = 'en' | 'es' | 'de' | 'fr' | 'ja';

export type AdSlotType = 
  | 'header_leaderboard'
  | 'sidebar_rectangle'
  | 'in_article'
  | 'in_feed'
  | 'sticky_sidebar'
  | 'anchor_bottom'
  | 'multiplex';

export interface KeywordAnalysis {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: string;
  trend: string;
  competition: 'Low' | 'Medium' | 'High';
  intent: 'Informational' | 'Commercial' | 'Transactional';
  tier1Demographics: Record<string, string>;
  suggestedLsi: string[];
}

export interface AnalyticsMetrics {
  liveVisitors: number;
  dailyPageviews: number;
  monthlyPageviews: number;
  organicSearchPct: number;
  adSenseEstEarnings: number;
  adSenseRpm: number;
  averageCtr: number;
  tier1Breakdown: { country: string; flag: string; share: number; visitors: number }[];
  topKeywords: { keyword: string; impressions: number; clicks: number; position: number }[];
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
  type: 'breaking' | 'traffic' | 'revenue' | 'system';
}

export interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  imageSize?: '1K' | '2K' | '4K';
  model: string;
  createdAt: string;
  isEdited?: boolean;
  originalUrl?: string;
  altText?: string;
}
