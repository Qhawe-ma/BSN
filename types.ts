export type BadgeType = 'blue' | 'gold';
export type BadgeStatus = 'pending' | 'active' | 'expired' | 'rejected';

export interface PremiumBadge {
  id: string;
  userAddress: string;
  badgeType: BadgeType;
  txHash: string;
  purchaseDate: number;
  expiryDate: number;
  status: BadgeStatus;
  approvedBy?: string;
  approvedAt?: number;
  rejectionNote?: string;
  amountPaid: string;
}

export interface User {
  address: string;
  ens?: string;
  bio?: string;
  website?: string;
  followers: number;
  following: number;
  totalPosts: number;
  avatarUrl: string;
  createdAt?: number;
  activeBadge?: PremiumBadge | null;
}

export interface Post {
  id: number;
  tokenId: string;
  internalId: string; // Unique ID for stats tracking: contractAddress_tokenId
  author: User;
  content: string;
  timestamp: number;
  likes: number;
  commentsCount: number;
  repostsCount: number;
  ipfsHash: string;
  txHash: string;
  attachmentUrl?: string;
  isLiked?: boolean;
  isRepost?: boolean;
  originalPostId?: string;
  originalAuthor?: User;
  contractAddress?: string;
  isOptimistic?: boolean; // Shown before the mint confirms
  optimisticId?: string;
  optimisticStatus?: 'pending' | 'confirming' | 'confirmed' | 'failed'; // Status of optimistic post
}

export interface Comment {
  id: string;
  postId: number;
  author: User;
  content: string;
  timestamp: number;
  imageUrl?: string;
  parentId?: string;
  replies?: Comment[];
}

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  encryptedContent?: string; // Raw encrypted content for proof display
}

export interface ChatSession {
  id: string;
  participant: User;
  lastMessage: Message;
  unreadCount: number;
}

export enum ViewState {
  FEED = 'FEED',
  EXPLORE = 'EXPLORE',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  DASHBOARD = 'DASHBOARD',
  CREATE = 'CREATE',
  POST_DETAIL = 'POST_DETAIL',
  ADMIN = 'ADMIN',
  BLOGS = 'BLOGS',
  PREMIUM = 'PREMIUM'
}