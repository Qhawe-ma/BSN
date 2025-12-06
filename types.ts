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
  isLiked?: boolean; // Contextual to current user
  isRepost?: boolean; // If this post is a repost of another
  originalPostId?: string; // Token ID of original post if this is a repost
  originalAuthor?: User; // Original author if this is a repost
  contractAddress?: string; // The contract address this post was minted on
}

export interface Comment {
  id: string;
  postId: number;
  author: User;
  content: string;
  timestamp: number;
  imageUrl?: string;
}

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  isRead: boolean;
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
  CREATE = 'CREATE', // Mobile only mostly
  POST_DETAIL = 'POST_DETAIL', // Single post view
  ADMIN = 'ADMIN', // Admin panel
  BLOGS = 'BLOGS', // Blog section
  PREMIUM = 'PREMIUM' // Premium subscription
}