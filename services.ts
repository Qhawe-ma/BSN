import { Post, User, Message, ChatSession, Comment } from './types';
import { IPFSService } from './ipfsService';
import { FirebaseService } from './firebaseService';
import { EncryptionService } from './encryptionService';
import { SolanaBlockchainService } from './solanaBlockchainService';

// Older call sites import this name.
export const BlockchainService = SolanaBlockchainService;

// Served immediately, refreshed in the background once it goes stale.
interface PostCache {
  posts: Post[];
  timestamp: number;
  ttl: number;
  staleTime: number;
}
let feedCache: PostCache | null = null;
const CACHE_TTL = 300000;
const STALE_TIME = 60000;
let backgroundRefreshInProgress = false;

// Counters handed to feed subscribers with each update.
interface StreamState {
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
  hasMore: boolean;
}
let streamState: StreamState = {
  isLoading: false,
  loadedCount: 0,
  totalCount: 0,
  hasMore: false
};

type FeedUpdateCallback = () => void;
type StreamUpdateCallback = (posts: Post[], state: StreamState) => void;
const feedUpdateListeners: Set<FeedUpdateCallback> = new Set();
const streamUpdateListeners: Set<StreamUpdateCallback> = new Set();

export const FeedEvents = {
  subscribe: (callback: FeedUpdateCallback): (() => void) => {
    feedUpdateListeners.add(callback);
    return () => feedUpdateListeners.delete(callback);
  },
  subscribeToStream: (callback: StreamUpdateCallback): (() => void) => {
    streamUpdateListeners.add(callback);
    return () => streamUpdateListeners.delete(callback);
  },
  emit: () => {
    feedUpdateListeners.forEach(callback => callback());
  },
  emitStream: (posts: Post[], state: StreamState) => {
    streamUpdateListeners.forEach(callback => callback(posts, state));
  }
};

export const getStreamState = () => streamState;

// Kept across cache refreshes until the mint confirms or fails.
let optimisticPosts: Map<string, Post> = new Map();
let confirmedTokenIds: Set<string> = new Set();

const mergeOptimisticPostsWithCache = (): void => {
  if (!feedCache) return;

  const activeOptimistic = Array.from(optimisticPosts.values()).filter(
    op => !confirmedTokenIds.has(op.optimisticId!)
  );

  if (activeOptimistic.length === 0) return;

  const nonOptimisticPosts = feedCache.posts.filter(p => !p.isOptimistic);
  feedCache.posts = [...activeOptimistic, ...nonOptimisticPosts];
  feedCache.posts.sort((a, b) => b.timestamp - a.timestamp);
};

export const OptimisticPostService = {
  addOptimisticPost: (post: Post): void => {
    optimisticPosts.set(post.optimisticId!, post);
    console.log('Added optimistic post:', post.optimisticId);

    if (feedCache) {
      feedCache.posts = [post, ...feedCache.posts.filter(p => p.optimisticId !== post.optimisticId)];
    } else {
      feedCache = {
        posts: [post],
        timestamp: Date.now(),
        ttl: CACHE_TTL,
        staleTime: STALE_TIME
      };
    }

    FeedEvents.emit();
    FeedEvents.emitStream(feedCache.posts, streamState);
  },

  updateOptimisticPost: (optimisticId: string, updates: Partial<Post>): void => {
    const existingPost = optimisticPosts.get(optimisticId);
    if (existingPost) {
      const updatedPost = { ...existingPost, ...updates };
      optimisticPosts.set(optimisticId, updatedPost);

      if (feedCache) {
        feedCache.posts = feedCache.posts.map(p =>
          p.optimisticId === optimisticId ? updatedPost : p
        );

        FeedEvents.emit();
        FeedEvents.emitStream(feedCache.posts, streamState);
      }
    }
  },

  confirmOptimisticPost: (optimisticId: string, confirmedPost: Post): void => {
    console.log('Confirming optimistic post:', optimisticId, 'with tokenId:', confirmedPost.tokenId);

    confirmedTokenIds.add(optimisticId);

    const confirmedWithCleanup: Post = {
      ...confirmedPost,
      isOptimistic: false,
      optimisticId: undefined,
      optimisticStatus: undefined
    };

    optimisticPosts.delete(optimisticId);

    if (feedCache) {
      feedCache.posts = feedCache.posts
        .filter(p => p.optimisticId !== optimisticId)
        .filter(p => p.tokenId !== confirmedPost.tokenId);

      feedCache.posts = [confirmedWithCleanup, ...feedCache.posts];
      feedCache.posts.sort((a, b) => b.timestamp - a.timestamp);

      FeedEvents.emit();
      FeedEvents.emitStream(feedCache.posts, streamState);
    }

    setTimeout(() => {
      confirmedTokenIds.delete(optimisticId);
    }, 60000);
  },

  removeOptimisticPost: (optimisticId: string): void => {
    console.log('Removing failed optimistic post:', optimisticId);
    optimisticPosts.delete(optimisticId);

    if (feedCache) {
      feedCache.posts = feedCache.posts.filter(p => p.optimisticId !== optimisticId);

      FeedEvents.emit();
      FeedEvents.emitStream(feedCache.posts, streamState);
    }
  },

  getOptimisticPosts: (): Post[] => {
    return Array.from(optimisticPosts.values());
  },

  hasOptimisticPost: (optimisticId: string): boolean => {
    return optimisticPosts.has(optimisticId);
  },

  reapplyOptimisticPosts: (): void => {
    mergeOptimisticPostsWithCache();
    if (feedCache) {
      FeedEvents.emitStream(feedCache.posts, streamState);
    }
  },

  createOptimisticPost: (content: string, author: User, attachmentUrl?: string, imagePreview?: string): Post => {
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const post: Post = {
      id: now,
      tokenId: optimisticId,
      internalId: optimisticId,
      author,
      content,
      timestamp: now,
      likes: 0,
      commentsCount: 0,
      repostsCount: 0,
      ipfsHash: '',
      txHash: '',
      attachmentUrl: imagePreview || attachmentUrl,
      isOptimistic: true,
      optimisticId,
      optimisticStatus: 'pending'
    };

    return post;
  }
};

// The address is the Dicebear seed, so the same wallet always gets the same avatar.
export const generateAvatar = (address: string): string => {
  if (!address) {
    return `https://api.dicebear.com/7.x/shapes/svg?seed=default&backgroundColor=1e2329&shapeColor=9945ff`;
  }

  const addressHash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const styles = [
    'shapes',
    'bottts',
    'avataaars',
    'personas',
    'pixel-art',
  ];

  const solanaColors = [
    '9945ff',
    '14f195',
    '00d4ff',
    'ff6b6b',
    '4ecdc4',
    'ffe66d',
    'a8e6cf',
    'ff8b94',
  ];

  const styleIndex = addressHash % styles.length;
  const colorIndex = (addressHash * 7) % solanaColors.length;
  const secondaryColorIndex = (addressHash * 13) % solanaColors.length;
  
  const selectedStyle = styles[styleIndex];
  const primaryColor = solanaColors[colorIndex];
  const secondaryColor = solanaColors[secondaryColorIndex];
  
  const baseUrl = `https://api.dicebear.com/7.x/${selectedStyle}/svg`;
  const params = new URLSearchParams({
    seed: address,
    backgroundColor: '1e2329',
    ...(selectedStyle === 'shapes' && {
      shapeColor: primaryColor,
      shapeColor2: secondaryColor,
    }),
    ...(selectedStyle === 'bottts' && {
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
    }),
    ...(selectedStyle === 'avataaars' && {
      backgroundColor: '1e2329',
    }),
    ...(selectedStyle === 'personas' && {
      backgroundColor: '1e2329',
    }),
    ...(selectedStyle === 'pixel-art' && {
      backgroundColor: '1e2329',
    }),
  });
  
  return `${baseUrl}?${params.toString()}`;
};

export const formatAddress = (addr: string | undefined | null) => {
  if (!addr) return 'Unknown';
  if (addr.length < 8) return addr;
  return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
};

// Separate from getFeed so a stale cache hit cannot recurse into itself.
const refreshFeedInBackground = async (): Promise<void> => {
  try {
    console.log('Background: Fetching fresh feed from Firebase...');
    const allPosts = await FirebaseService.getPosts(50); // Fetch last 50 posts

    feedCache = {
      posts: allPosts,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
      staleTime: STALE_TIME
    };

    OptimisticPostService.reapplyOptimisticPosts();

    console.log(`Background refresh complete: ${allPosts.length} posts`);
    FeedEvents.emit();
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
};

export const DataService = {
  getFeed: async (forceRefresh = false): Promise<Post[]> => {
    try {
      const now = Date.now();

      if (!forceRefresh && feedCache && (now - feedCache.timestamp < feedCache.ttl)) {
        console.log('Returning cached feed (instant)');

        if (now - feedCache.timestamp > STALE_TIME && !backgroundRefreshInProgress) {
          console.log('Starting background refresh...');
          backgroundRefreshInProgress = true;
          refreshFeedInBackground().finally(() => {
            backgroundRefreshInProgress = false;
          });
        }

        return feedCache.posts;
      }

      console.log('Fetching fresh feed from Firebase...');
      const allPosts = await FirebaseService.getPosts(50);

      feedCache = {
        posts: allPosts,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
        staleTime: STALE_TIME
      };

      console.log(`Loaded ${allPosts.length} posts`);
      return allPosts;
    } catch (error) {
      console.error('Error fetching feed:', error);
      if (feedCache) {
        console.log('Using stale cache due to error');
        return feedCache.posts;
      }
      return [];
    }
  },

  // One Firebase page. The name is historical; nothing is streamed.
  getFeedProgressive: async (forceRefresh = false): Promise<void> => {
    const posts = await DataService.getFeed(forceRefresh);

    streamState = {
      isLoading: false,
      loadedCount: posts.length,
      totalCount: posts.length,
      hasMore: false
    };

    FeedEvents.emitStream(posts, streamState);
  },

  getPostsByOwner: async (ownerAddress: string): Promise<Post[]> => {
    try {
      const normalizedOwner = ownerAddress.toLowerCase();

      if (feedCache && (Date.now() - feedCache.timestamp < feedCache.ttl)) {
        const cachedPosts = feedCache.posts.filter(
          post => post.author.address.toLowerCase() === normalizedOwner
        );
        console.log(`Instant load: ${cachedPosts.length} posts for ${formatAddress(ownerAddress)} from cache`);
        return cachedPosts;
      }

      const allPosts = await DataService.getFeed();

      const ownerPosts = allPosts.filter(
        post => post.author.address.toLowerCase() === normalizedOwner
      );

      console.log(`Loaded ${ownerPosts.length} posts for user ${formatAddress(ownerAddress)}`);
      return ownerPosts;
    } catch (error) {
      console.error('Error fetching posts by owner:', error);
      return [];
    }
  },

  getCachedFeed: (): Post[] | null => {
    if (feedCache && (Date.now() - feedCache.timestamp < feedCache.ttl)) {
      return feedCache.posts;
    }
    return null;
  },

  isCacheValid: (): boolean => {
    return feedCache !== null && (Date.now() - feedCache.timestamp < feedCache.ttl);
  },

  invalidateCache: () => {
    feedCache = null;
    FeedEvents.emit();
  },

  toggleLike: async (postId: string, userAddress: string): Promise<{ liked: boolean; likes: number }> => {
    if (!userAddress) {
      throw new Error('Please connect your wallet first');
    }
    return await FirebaseService.toggleLike(postId, userAddress);
  },

  isPostLiked: async (postId: string, userAddress: string): Promise<boolean> => {
    if (!userAddress) return false;
    return await FirebaseService.isPostLiked(postId, userAddress);
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    return await FirebaseService.getComments(postId);
  },

  postComment: async (postId: string, content: string, author: User, imageUrl?: string, parentId?: string): Promise<Comment> => {
    if (!author) {
      throw new Error('Please connect your wallet first');
    }
    return await FirebaseService.postComment(postId, content, author, imageUrl, parentId);
  },

  getChats: async (): Promise<ChatSession[]> => {
    const currentUser = SolanaBlockchainService.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    return new Promise((resolve) => {
      FirebaseService.getUserChats(currentUser.address, (chats) => {
        resolve(chats);
      });
    });
  },

  getMessages: async (senderId: string, recipientId: string): Promise<Message[]> => {
    return new Promise((resolve) => {
      FirebaseService.subscribeToMessages(senderId, recipientId, (messages) => {
        resolve(messages);
      });
    });
  },

  sendMessage: async (text: string, recipientAddress: string): Promise<Message> => {
    const currentUser = SolanaBlockchainService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Please connect your wallet first');
    }

    const encryptedText = await EncryptionService.encrypt(text, currentUser.address, recipientAddress);
    return await FirebaseService.sendMessage(currentUser.address, recipientAddress, encryptedText);
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    const currentUser = SolanaBlockchainService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Please connect your wallet first');
    }

    // Same id format as Firebase: the two addresses, sorted.
    const chatId = [currentUser.address, address].sort().join('_');

    let participantData: User = {
      address: address,
      ens: undefined,
      followers: 0,
      following: 0,
      totalPosts: 0,
      avatarUrl: generateAvatar(address)
    };

    try {
      const profile = await FirebaseService.getUserProfile(address);
      if (profile) {
        participantData = {
          ...participantData,
          ens: profile.ens,
          avatarUrl: profile.avatarUrl || participantData.avatarUrl,
          activeBadge: profile.activeBadge,
          followers: profile.followers || 0,
          following: profile.following || 0,
          totalPosts: profile.totalPosts || 0
        };
      }
    } catch (error) {
      console.error('Error fetching participant profile:', error);
    }

    const chatSession: ChatSession = {
      id: chatId,
      participant: participantData,
      lastMessage: {
        id: 'init',
        sender: '',
        recipient: '',
        content: 'Start chatting',
        timestamp: Date.now(),
        isRead: true
      },
      unreadCount: 0
    };

    return chatSession;
  },

  // Decrypts on the way out. Messages older than deletionTimestamp stay hidden.
  subscribeToMessages: (
    senderId: string,
    recipientId: string,
    callback: (messages: Message[]) => void,
    deletionTimestamp?: number | null
  ): (() => void) => {
    return FirebaseService.subscribeToMessages(senderId, recipientId, async (encryptedMessages) => {
      const decryptedMessages = await Promise.all(
        encryptedMessages.map(async (msg) => {
          if (EncryptionService.isEncrypted(msg.content)) {
            const decryptedContent = await EncryptionService.decrypt(
              msg.content,
              msg.sender,
              msg.recipient
            );
            return { ...msg, content: decryptedContent, encryptedContent: msg.content };
          }
          return msg;
        })
      );
      callback(decryptedMessages);
    }, deletionTimestamp);
  },

  getChatDeletionTime: async (userId: string, otherUserId: string): Promise<number | null> => {
    return FirebaseService.getChatDeletionTime(userId, otherUserId);
  },

  // Hides the thread for this wallet only. The other participant still has it.
  hideChatForUser: async (userId: string, otherUserId: string): Promise<void> => {
    return FirebaseService.hideChatForUser(userId, otherUserId);
  },

  subscribeToChats: (
    userId: string,
    callback: (chats: ChatSession[]) => void
  ): (() => void) => {
    return FirebaseService.getUserChats(userId, async (chats) => {
      const decryptedChats = await Promise.all(
        chats.map(async (chat) => {
          if (chat.lastMessage && EncryptionService.isEncrypted(chat.lastMessage.content)) {
            const decryptedContent = await EncryptionService.decrypt(
              chat.lastMessage.content,
              chat.lastMessage.sender,
              chat.lastMessage.recipient
            );
            return {
              ...chat,
              lastMessage: { ...chat.lastMessage, content: decryptedContent }
            };
          }
          return chat;
        })
      );
      callback(decryptedChats);
    });
  }
};
