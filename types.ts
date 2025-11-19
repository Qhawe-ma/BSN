export interface User {
  address: string;
  ens?: string;
  bio?: string;
  website?: string;
  followers: number;
  following: number;
  totalPosts: number;
  avatarUrl: string;
  createdAt?: number; // Timestamp when user first connected wallet
}

export interface Post {
  id: number;
  tokenId: string;
  author: User;
  content: string;
  timestamp: number;
  likes: number;
  commentsCount: number;
  ipfsHash: string;
  txHash: string;
  attachmentUrl?: string;
  isLiked?: boolean; // Contextual to current user
}

export interface Comment {
  id: string;
  postId: number;
  author: User;
  content: string;
  timestamp: number;
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
  CREATE = 'CREATE' // Mobile only mostly
}