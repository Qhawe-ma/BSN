import { database, storage } from './firebaseConfig';
import { ref, push, set, get, update, onValue, query, orderByChild, limitToLast, off, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Message, ChatSession, User, Comment, PremiumBadge, BadgeType, BadgeStatus } from './types';
import { generateAvatar } from './services';

export const FirebaseService = {
  /**
   * Send a message to a chat
   */
  sendMessage: async (senderId: string, recipientId: string, content: string): Promise<Message> => {
    try {
      const chatId = [senderId, recipientId].sort().join('_');
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      
      const message: Message = {
        id: newMessageRef.key || `msg_${Date.now()}`,
        sender: senderId,
        recipient: recipientId,
        content,
        timestamp: Date.now(),
        isRead: false
      };

      await set(newMessageRef, message);
      
      // Update last message in chat metadata
      const chatMetadataRef = ref(database, `chats/${chatId}/metadata`);
      await set(chatMetadataRef, {
        lastMessage: message,
        lastUpdated: Date.now()
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  },

  /**
   * Get messages for a chat in real-time
   */
  subscribeToMessages: (
    senderId: string, 
    recipientId: string, 
    callback: (messages: Message[]) => void
  ): (() => void) => {
    const chatId = [senderId, recipientId].sort().join('_');
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push(childSnapshot.val());
      });
      callback(messages);
    });

    // Return unsubscribe function
    return () => off(messagesRef);
  },

  /**
   * Get all chat sessions for a user
   */
  getUserChats: (userId: string, callback: (chats: ChatSession[]) => void): (() => void) => {
    const chatsRef = ref(database, 'chats');
    const normalizedUserId = userId.toLowerCase();
    
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      const chatSessions: ChatSession[] = [];
      const participantAddresses: string[] = [];
      
      snapshot.forEach((chatSnapshot) => {
        const chatId = chatSnapshot.key;
        const chatData = chatSnapshot.val();
        
        // Split chat ID to get both participant addresses
        if (chatId) {
          const parts = chatId.split('_');
          
          // Validate that we have exactly 2 participants
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            console.warn('Invalid chat ID format:', chatId);
            return;
          }
          
          const [user1, user2] = parts;
          
          // Check if user is exactly one of the two participants (case-insensitive)
          const isUser1 = user1.toLowerCase() === normalizedUserId;
          const isUser2 = user2.toLowerCase() === normalizedUserId;
          
          if (isUser1 || isUser2) {
            const otherUserId = isUser1 ? user2 : user1;
            
            const metadata = chatData.metadata;
            const lastMessage = metadata?.lastMessage;
            
            if (lastMessage) {
              // Calculate unread count
              let unreadCount = 0;
              const messages = chatData.messages || {};
              Object.values(messages).forEach((msg: any) => {
                if (msg.recipient === userId && !msg.isRead) {
                  unreadCount++;
                }
              });
              
              const chatSession: ChatSession = {
                id: chatId,
                participant: {
                  address: otherUserId,
                  ens: undefined,
                  followers: 0,
                  following: 0,
                  totalPosts: 0,
                  avatarUrl: generateAvatar(otherUserId)
                },
                lastMessage: lastMessage,
                unreadCount: unreadCount
              };
              chatSessions.push(chatSession);
              participantAddresses.push(otherUserId);
            }
          }
        }
      });
      
      // Fetch full user profiles (including badges) for all participants
      try {
        const profilePromises = participantAddresses.map(address => 
          FirebaseService.getUserProfile(address)
        );
        const profiles = await Promise.all(profilePromises);
        
        // Merge profile data (including badges) into chat sessions
        chatSessions.forEach((session, index) => {
          const profile = profiles[index];
          if (profile) {
            session.participant = {
              ...session.participant,
              ens: profile.ens,
              avatarUrl: profile.avatarUrl || session.participant.avatarUrl,
              activeBadge: profile.activeBadge,
              followers: profile.followers || 0,
              following: profile.following || 0,
              totalPosts: profile.totalPosts || 0
            };
          }
        });
      } catch (error) {
        console.error('Error fetching participant profiles:', error);
      }
      
      // Sort by last message timestamp
      chatSessions.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
      callback(chatSessions);
    });

    return () => off(chatsRef);
  },

  /**
   * Mark messages as read
   */
  markAsRead: async (currentUserId: string, otherUserId: string): Promise<void> => {
    try {
      const chatId = [currentUserId, otherUserId].sort().join('_');
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      
      onValue(messagesRef, (snapshot) => {
        let lastUpdatedMessage: Message | null = null;
        
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          // Mark as read if: message was sent TO me (currentUserId) and not yet read
          if (message.recipient === currentUserId && !message.isRead) {
            const messageRef = ref(database, `chats/${chatId}/messages/${childSnapshot.key}`);
            const updatedMessage = { ...message, isRead: true };
            set(messageRef, updatedMessage);
            lastUpdatedMessage = updatedMessage;
            console.log('✅ Marked message as read:', childSnapshot.key);
          }
        });
        
        // Update chat metadata if we marked any messages as read
        if (lastUpdatedMessage) {
          const chatMetadataRef = ref(database, `chats/${chatId}/metadata`);
          onValue(chatMetadataRef, (metaSnapshot) => {
            const metadata = metaSnapshot.val();
            if (metadata && metadata.lastMessage) {
              // Update lastMessage isRead status in metadata
              const updatedMetadata = {
                ...metadata,
                lastMessage: {
                  ...metadata.lastMessage,
                  isRead: metadata.lastMessage.recipient === currentUserId ? true : metadata.lastMessage.isRead
                }
              };
              set(chatMetadataRef, updatedMetadata);
            }
          }, { onlyOnce: true });
        }
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  /**
   * Delete a single message from a chat
   */
  deleteMessage: async (senderId: string, recipientId: string, messageId: string): Promise<void> => {
    try {
      const chatId = [senderId, recipientId].sort().join('_');
      const messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
      await remove(messageRef);
      console.log('✅ Message deleted:', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  },

  /**
   * Delete an entire chat conversation
   */
  deleteChat: async (userId: string, otherUserId: string): Promise<void> => {
    try {
      const chatId = [userId, otherUserId].sort().join('_');
      const chatRef = ref(database, `chats/${chatId}`);
      await remove(chatRef);
      console.log('✅ Chat deleted:', chatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  },

  /**
   * Set user online status
   */
  setUserOnline: async (userId: string, isOnline: boolean): Promise<void> => {
    try {
      const presenceRef = ref(database, `presence/${userId}`);
      await set(presenceRef, {
        online: isOnline,
        lastSeen: Date.now()
      });
    } catch (error) {
      console.error('Error setting user online status:', error);
    }
  },

  /**
   * Subscribe to user online status
   */
  subscribeToUserPresence: (userId: string, callback: (isOnline: boolean) => void): (() => void) => {
    const presenceRef = ref(database, `presence/${userId}`);
    
    onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Consider online if explicitly online AND last seen was within 3 minutes
        const timeSinceLastSeen = Date.now() - data.lastSeen;
        const isOnline = data.online === true && timeSinceLastSeen < 3 * 60 * 1000;
        callback(isOnline);
      } else {
        callback(false);
      }
    });

    return () => off(presenceRef);
  },

  /**
   * Get or create user profile
   */
  getUserProfile: async (address: string): Promise<User | null> => {
    try {
      const normalizedAddress = address.toLowerCase();
      const userRef = ref(database, `users/${normalizedAddress}`);
      
      return new Promise((resolve) => {
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            resolve(userData as User);
          } else {
            resolve(null);
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  /**
   * Save user profile to Firebase
   */
  saveUserProfile: async (user: User): Promise<void> => {
    try {
      const normalizedAddress = user.address.toLowerCase();
      const userRef = ref(database, `users/${normalizedAddress}`);
      
      // Filter out undefined values (Firebase doesn't allow them)
      const cleanUser: Record<string, any> = {};
      for (const [key, value] of Object.entries(user)) {
        if (value !== undefined) {
          cleanUser[key] = value;
        }
      }
      cleanUser.address = normalizedAddress;
      
      await set(userRef, cleanUser);
      console.log('✅ User profile saved to Firebase:', normalizedAddress);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw new Error('Failed to save user profile');
    }
  },

  /**
   * Update user profile fields
   */
  updateUserProfile: async (address: string, updates: Partial<User>): Promise<void> => {
    try {
      const normalizedAddress = address.toLowerCase();
      const userRef = ref(database, `users/${normalizedAddress}`);
      
      // Get current user data
      const currentUser = await FirebaseService.getUserProfile(normalizedAddress);
      if (currentUser) {
        const updatedUser = { ...currentUser, ...updates };
        
        // Filter out undefined values (Firebase doesn't allow them)
        const cleanUser: Record<string, any> = {};
        for (const [key, value] of Object.entries(updatedUser)) {
          if (value !== undefined) {
            cleanUser[key] = value;
          }
        }
        
        await set(userRef, cleanUser);
        console.log('✅ User profile updated:', normalizedAddress);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  },

  /**
   * Check if a user is following another user
   */
  isFollowing: async (followerAddress: string, targetAddress: string): Promise<boolean> => {
    try {
      const followRef = ref(database, `follows/${followerAddress}/${targetAddress}`);
      
      return new Promise((resolve) => {
        onValue(followRef, (snapshot) => {
          resolve(snapshot.exists());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },

  /**
   * Follow a user
   */
  followUser: async (followerAddress: string, targetAddress: string): Promise<void> => {
    try {
      // Don't allow self-follow
      if (followerAddress === targetAddress) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const alreadyFollowing = await FirebaseService.isFollowing(followerAddress, targetAddress);
      if (alreadyFollowing) {
        console.log('Already following this user');
        return;
      }

      // Create follow relationship
      const followRef = ref(database, `follows/${followerAddress}/${targetAddress}`);
      await set(followRef, {
        followedAt: Date.now()
      });

      // Increment target user's followers count
      const targetUser = await FirebaseService.getUserProfile(targetAddress);
      if (targetUser) {
        await FirebaseService.updateUserProfile(targetAddress, {
          followers: (targetUser.followers || 0) + 1
        });
      }

      // Increment follower's following count
      const followerUser = await FirebaseService.getUserProfile(followerAddress);
      if (followerUser) {
        await FirebaseService.updateUserProfile(followerAddress, {
          following: (followerUser.following || 0) + 1
        });
      }

      console.log('✅ Follow successful:', followerAddress, '->', targetAddress);
    } catch (error) {
      console.error('Error following user:', error);
      throw new Error('Failed to follow user');
    }
  },

  /**
   * Unfollow a user
   */
  unfollowUser: async (followerAddress: string, targetAddress: string): Promise<void> => {
    try {
      // Check if actually following
      const isFollowing = await FirebaseService.isFollowing(followerAddress, targetAddress);
      if (!isFollowing) {
        console.log('Not following this user');
        return;
      }

      // Remove follow relationship
      const followRef = ref(database, `follows/${followerAddress}/${targetAddress}`);
      await set(followRef, null);

      // Decrement target user's followers count
      const targetUser = await FirebaseService.getUserProfile(targetAddress);
      if (targetUser) {
        await FirebaseService.updateUserProfile(targetAddress, {
          followers: Math.max(0, (targetUser.followers || 0) - 1)
        });
      }

      // Decrement follower's following count
      const followerUser = await FirebaseService.getUserProfile(followerAddress);
      if (followerUser) {
        await FirebaseService.updateUserProfile(followerAddress, {
          following: Math.max(0, (followerUser.following || 0) - 1)
        });
      }

      console.log('✅ Unfollow successful:', followerAddress, '->', targetAddress);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw new Error('Failed to unfollow user');
    }
  },

  /**
   * Get list of addresses the user is following
   */
  getFollowing: async (userAddress: string): Promise<string[]> => {
    try {
      const followsRef = ref(database, `follows/${userAddress}`);
      
      return new Promise((resolve) => {
        onValue(followsRef, (snapshot) => {
          const following: string[] = [];
          snapshot.forEach((childSnapshot) => {
            following.push(childSnapshot.key as string);
          });
          resolve(following);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting following list:', error);
      return [];
    }
  },

  // ============ LIKES SYSTEM ============

  /**
   * Toggle like on a post
   */
  toggleLike: async (postId: string, userAddress: string): Promise<{ liked: boolean; likes: number }> => {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      const likeRef = ref(database, `likes/${postId}/${normalizedAddress}`);
      const statsRef = ref(database, `postStats/${postId}`);

      // Check if already liked
      const isLiked = await FirebaseService.isPostLiked(postId, userAddress);

      if (isLiked) {
        // Unlike: remove the like
        await set(likeRef, null);
        
        // Decrement count
        const stats = await FirebaseService.getPostStats(postId);
        const newLikes = Math.max(0, stats.likes - 1);
        await set(statsRef, { ...stats, likes: newLikes });
        
        return { liked: false, likes: newLikes };
      } else {
        // Like: add the like
        await set(likeRef, { timestamp: Date.now() });
        
        // Increment count
        const stats = await FirebaseService.getPostStats(postId);
        const newLikes = stats.likes + 1;
        await set(statsRef, { ...stats, likes: newLikes });
        
        return { liked: true, likes: newLikes };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw new Error('Failed to toggle like');
    }
  },

  /**
   * Check if user has liked a post
   */
  isPostLiked: async (postId: string, userAddress: string): Promise<boolean> => {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      const likeRef = ref(database, `likes/${postId}/${normalizedAddress}`);
      const snapshot = await get(likeRef);
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  },

  /**
   * Get post stats (likes count, comments count, reposts count, txHash)
   */
  getPostStats: async (postId: string): Promise<{ likes: number; comments: number; reposts: number; txHash?: string }> => {
    try {
      const statsRef = ref(database, `postStats/${postId}`);
      const snapshot = await get(statsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          likes: data.likes || 0,
          comments: data.comments || 0,
          reposts: data.reposts || 0,
          txHash: data.txHash || undefined
        };
      }
      return { likes: 0, comments: 0, reposts: 0 };
    } catch (error) {
      console.error('Error getting post stats:', error);
      return { likes: 0, comments: 0, reposts: 0 };
    }
  },

  /**
   * Save transaction hash for a post
   */
  savePostTxHash: async (postId: string, txHash: string): Promise<void> => {
    try {
      const statsRef = ref(database, `postStats/${postId}`);
      const stats = await FirebaseService.getPostStats(postId);
      await set(statsRef, { ...stats, txHash });
      console.log('✅ Saved txHash for post:', postId);
    } catch (error) {
      console.error('Error saving txHash:', error);
    }
  },

  /**
   * Check if user has reposted a post
   */
  hasReposted: async (postId: string, userAddress: string): Promise<boolean> => {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      const repostRef = ref(database, `reposts/${postId}/${normalizedAddress}`);
      
      return new Promise((resolve) => {
        onValue(repostRef, (snapshot) => {
          resolve(snapshot.exists());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error checking repost status:', error);
      return false;
    }
  },

  /**
   * Record a repost and increment count
   */
  recordRepost: async (postId: string, userAddress: string, repostTokenId: string): Promise<number> => {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      const repostRef = ref(database, `reposts/${postId}/${normalizedAddress}`);
      const statsRef = ref(database, `postStats/${postId}`);

      await set(repostRef, { 
        timestamp: Date.now(),
        repostTokenId 
      });
      
      const stats = await FirebaseService.getPostStats(postId);
      const newReposts = stats.reposts + 1;
      await set(statsRef, { ...stats, reposts: newReposts });
      
      return newReposts;
    } catch (error) {
      console.error('Error recording repost:', error);
      throw new Error('Failed to record repost');
    }
  },

  // ============ COMMENTS SYSTEM ============

  /**
   * Get comments for a post
   */
  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      const commentsRef = ref(database, `comments/${postId}`);
      const commentsQuery = query(commentsRef, orderByChild('timestamp'));
      
      return new Promise((resolve) => {
        onValue(commentsQuery, (snapshot) => {
          const comments: Comment[] = [];
          snapshot.forEach((childSnapshot) => {
            comments.push(childSnapshot.val());
          });
          resolve(comments);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  },

  /**
   * Post a comment
   */
  postComment: async (postId: string, content: string, author: User): Promise<Comment> => {
    try {
      const commentsRef = ref(database, `comments/${postId}`);
      const newCommentRef = push(commentsRef);
      
      const comment: Comment = {
        id: newCommentRef.key || `comment_${Date.now()}`,
        postId: parseInt(postId),
        author,
        content,
        timestamp: Date.now()
      };

      await set(newCommentRef, comment);
      
      // Update comment count in stats
      const stats = await FirebaseService.getPostStats(postId);
      const statsRef = ref(database, `postStats/${postId}`);
      await set(statsRef, { ...stats, comments: stats.comments + 1 });
      
      return comment;
    } catch (error) {
      console.error('Error posting comment:', error);
      throw new Error('Failed to post comment');
    }
  },

  // ============ REPORT SYSTEM ============

  /**
   * Report a post
   */
  reportPost: async (postId: string, reporterAddress: string, reason: string, postContent?: string, postAuthor?: string): Promise<void> => {
    try {
      const reportsRef = ref(database, `reports`);
      const newReportRef = push(reportsRef);
      
      const report = {
        id: newReportRef.key,
        postId,
        reporterAddress,
        reason,
        postContent: postContent || '',
        postAuthor: postAuthor || '',
        timestamp: Date.now(),
        status: 'pending'
      };

      await set(newReportRef, report);
      console.log('✅ Post reported successfully');
    } catch (error) {
      console.error('Error reporting post:', error);
      throw new Error('Failed to report post');
    }
  },

  /**
   * Get all reports (admin only)
   */
  getReports: async (): Promise<any[]> => {
    try {
      const reportsRef = ref(database, 'reports');
      const reportsQuery = query(reportsRef, orderByChild('timestamp'));
      
      return new Promise((resolve) => {
        onValue(reportsQuery, (snapshot) => {
          const reports: any[] = [];
          snapshot.forEach((childSnapshot) => {
            reports.push({ id: childSnapshot.key, ...childSnapshot.val() });
          });
          resolve(reports.reverse());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  },

  /**
   * Update report status
   */
  updateReportStatus: async (reportId: string, status: string): Promise<void> => {
    try {
      const reportRef = ref(database, `reports/${reportId}/status`);
      await set(reportRef, status);
    } catch (error) {
      console.error('Error updating report status:', error);
      throw new Error('Failed to update report status');
    }
  },

  /**
   * Delete a report
   */
  deleteReport: async (reportId: string): Promise<void> => {
    try {
      const reportRef = ref(database, `reports/${reportId}`);
      await set(reportRef, null);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  },

  // ============ HIDDEN POSTS (ADMIN MODERATION) ============

  /**
   * Hide a post (soft delete - admin moderation)
   */
  hidePost: async (postId: string, reason?: string): Promise<void> => {
    try {
      const hiddenRef = ref(database, `hiddenPosts/${postId}`);
      await set(hiddenRef, {
        hiddenAt: Date.now(),
        reason: reason || 'Violated community guidelines'
      });
      console.log('✅ Post hidden successfully:', postId);
    } catch (error) {
      console.error('Error hiding post:', error);
      throw new Error('Failed to hide post');
    }
  },

  /**
   * Unhide a post
   */
  unhidePost: async (postId: string): Promise<void> => {
    try {
      const hiddenRef = ref(database, `hiddenPosts/${postId}`);
      await set(hiddenRef, null);
      console.log('✅ Post unhidden successfully:', postId);
    } catch (error) {
      console.error('Error unhiding post:', error);
      throw new Error('Failed to unhide post');
    }
  },

  /**
   * Check if a post is hidden
   */
  isPostHidden: async (postId: string): Promise<boolean> => {
    try {
      const hiddenRef = ref(database, `hiddenPosts/${postId}`);
      
      return new Promise((resolve) => {
        onValue(hiddenRef, (snapshot) => {
          resolve(snapshot.exists());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error checking hidden status:', error);
      return false;
    }
  },

  /**
   * Get all hidden posts
   */
  getHiddenPosts: async (): Promise<string[]> => {
    try {
      const hiddenRef = ref(database, 'hiddenPosts');
      
      return new Promise((resolve) => {
        onValue(hiddenRef, (snapshot) => {
          const hiddenIds: string[] = [];
          snapshot.forEach((childSnapshot) => {
            hiddenIds.push(childSnapshot.key as string);
          });
          resolve(hiddenIds);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting hidden posts:', error);
      return [];
    }
  },

  // ============ BLOG SYSTEM ============

  /**
   * Create a blog post
   */
  createBlogPost: async (blog: {
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    author: string;
    tags?: string[];
  }): Promise<string> => {
    try {
      const blogsRef = ref(database, 'blogs');
      const newBlogRef = push(blogsRef);
      
      const slug = blog.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const blogPost = {
        id: newBlogRef.key,
        slug: `${slug}-${Date.now().toString(36)}`,
        title: blog.title,
        excerpt: blog.excerpt,
        content: blog.content,
        coverImage: blog.coverImage || '',
        author: blog.author,
        tags: blog.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        published: true
      };

      await set(newBlogRef, blogPost);
      console.log('✅ Blog post created successfully');
      return newBlogRef.key || '';
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw new Error('Failed to create blog post');
    }
  },

  /**
   * Update a blog post
   */
  updateBlogPost: async (blogId: string, updates: Partial<{
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    tags: string[];
    published: boolean;
  }>): Promise<void> => {
    try {
      const blogRef = ref(database, `blogs/${blogId}`);
      
      return new Promise((resolve, reject) => {
        onValue(blogRef, async (snapshot) => {
          const currentBlog = snapshot.val();
          if (currentBlog) {
            const updatedBlog = {
              ...currentBlog,
              ...updates,
              updatedAt: Date.now()
            };
            await set(blogRef, updatedBlog);
            console.log('✅ Blog post updated successfully');
            resolve();
          } else {
            reject(new Error('Blog post not found'));
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw new Error('Failed to update blog post');
    }
  },

  /**
   * Delete a blog post
   */
  deleteBlogPost: async (blogId: string): Promise<void> => {
    try {
      const blogRef = ref(database, `blogs/${blogId}`);
      await set(blogRef, null);
      console.log('✅ Blog post deleted successfully');
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw new Error('Failed to delete blog post');
    }
  },

  /**
   * Get all blog posts
   */
  getBlogPosts: async (publishedOnly: boolean = true): Promise<any[]> => {
    try {
      const blogsRef = ref(database, 'blogs');
      const blogsQuery = query(blogsRef, orderByChild('createdAt'));
      
      return new Promise((resolve) => {
        onValue(blogsQuery, (snapshot) => {
          const blogs: any[] = [];
          snapshot.forEach((childSnapshot) => {
            const blog = childSnapshot.val();
            if (!publishedOnly || blog.published) {
              blogs.push({ id: childSnapshot.key, ...blog });
            }
          });
          resolve(blogs.reverse());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting blog posts:', error);
      return [];
    }
  },

  /**
   * Get a single blog post by slug
   */
  getBlogBySlug: async (slug: string): Promise<any | null> => {
    try {
      const blogsRef = ref(database, 'blogs');
      
      return new Promise((resolve) => {
        onValue(blogsRef, (snapshot) => {
          let foundBlog = null;
          snapshot.forEach((childSnapshot) => {
            const blog = childSnapshot.val();
            if (blog.slug === slug) {
              foundBlog = { id: childSnapshot.key, ...blog };
            }
          });
          resolve(foundBlog);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting blog by slug:', error);
      return null;
    }
  },

  /**
   * Get a single blog post by ID
   */
  getBlogById: async (blogId: string): Promise<any | null> => {
    try {
      const blogRef = ref(database, `blogs/${blogId}`);
      
      return new Promise((resolve) => {
        onValue(blogRef, (snapshot) => {
          if (snapshot.exists()) {
            resolve({ id: snapshot.key, ...snapshot.val() });
          } else {
            resolve(null);
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting blog by ID:', error);
      return null;
    }
  },

  // ============ IMAGE UPLOAD ============

  /**
   * Upload an image to Firebase Storage with timeout
   */
  uploadImage: async (file: File, folder: string = 'blog-images'): Promise<string> => {
    const timeoutMs = 30000;
    
    const uploadPromise = async (): Promise<string> => {
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${folder}/${timestamp}_${cleanFileName}`;
      const imageRef = storageRef(storage, fileName);
      
      const snapshot = await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('Image uploaded successfully:', downloadUrl);
      return downloadUrl;
    };

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timed out. Please check your Firebase Storage configuration.')), timeoutMs);
    });

    try {
      return await Promise.race([uploadPromise(), timeoutPromise]);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      if (error.code === 'storage/unauthorized') {
        throw new Error('Upload not authorized. Please configure Firebase Storage rules.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was cancelled.');
      } else if (error.message?.includes('timed out')) {
        throw error;
      } else {
        throw new Error(error.message || 'Failed to upload image. Please try again.');
      }
    }
  },

  /**
   * Convert image to base64 data URL (fallback for when Firebase Storage isn't configured)
   */
  imageToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  },

  // ============ PREMIUM BADGES ============

  /**
   * Create a new badge purchase request (pending admin review)
   */
  createBadgePurchase: async (
    userAddress: string,
    badgeType: 'blue' | 'gold',
    txHash: string,
    amountPaid: string
  ): Promise<string> => {
    try {
      const purchaseId = `${userAddress}_${Date.now()}`;
      const purchaseDate = Date.now();
      const expiryDate = purchaseDate + (30 * 24 * 60 * 60 * 1000); // 30 days
      
      const badgeData = {
        id: purchaseId,
        userAddress: userAddress.toLowerCase(),
        badgeType,
        txHash,
        purchaseDate,
        expiryDate,
        status: 'pending',
        amountPaid
      };

      await set(ref(database, `premiumBadges/${purchaseId}`), badgeData);
      console.log('Badge purchase created:', purchaseId);
      return purchaseId;
    } catch (error) {
      console.error('Error creating badge purchase:', error);
      throw new Error('Failed to create badge purchase');
    }
  },

  /**
   * Purchase and immediately activate a badge
   */
  purchaseAndActivateBadge: async (
    userAddress: string,
    badgeType: 'blue' | 'gold',
    txHash: string,
    amountPaid: string
  ): Promise<string> => {
    try {
      const purchaseId = `${userAddress}_${Date.now()}`;
      const purchaseDate = Date.now();
      const expiryDate = purchaseDate + (30 * 24 * 60 * 60 * 1000); // 30 days
      
      const badgeData = {
        id: purchaseId,
        userAddress: userAddress.toLowerCase(),
        badgeType,
        txHash,
        purchaseDate,
        expiryDate,
        status: 'active',
        amountPaid,
        approvedAt: purchaseDate,
        approvedBy: 'auto'
      };

      await set(ref(database, `premiumBadges/${purchaseId}`), badgeData);
      
      // Also update user's active badge
      await update(ref(database, `users/${userAddress.toLowerCase()}`), {
        activeBadge: badgeData
      });
      
      console.log('Badge purchased and activated:', purchaseId);
      return purchaseId;
    } catch (error) {
      console.error('Error purchasing badge:', error);
      throw new Error('Failed to purchase badge');
    }
  },

  /**
   * Get all badge records (for admin)
   */
  getAllBadges: async (): Promise<any[]> => {
    try {
      const badgesRef = ref(database, 'premiumBadges');
      const snapshot = await get(badgesRef);
      
      if (!snapshot.exists()) return [];
      
      const badges: any[] = [];
      const data = snapshot.val();
      
      Object.keys(data).forEach(key => {
        const badge = { ...data[key], id: key };
        if (badge.status === 'active' && badge.expiryDate < Date.now()) {
          badge.status = 'expired';
        }
        badges.push(badge);
      });

      badges.sort((a, b) => b.purchaseDate - a.purchaseDate);
      return badges;
    } catch (error) {
      console.error('Error fetching badges:', error);
      return [];
    }
  },

  /**
   * Get active badge for a user
   */
  getActiveBadge: async (userAddress: string): Promise<any | null> => {
    try {
      const badgesRef = ref(database, 'premiumBadges');
      const snapshot = await get(badgesRef);
      
      if (!snapshot.exists()) return null;
      
      const data = snapshot.val();
      const now = Date.now();
      
      for (const key of Object.keys(data)) {
        const badge = data[key];
        if (
          badge.userAddress.toLowerCase() === userAddress.toLowerCase() &&
          badge.status === 'active' &&
          badge.expiryDate > now
        ) {
          return { ...badge, id: key };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching active badge:', error);
      return null;
    }
  },

  /**
   * Update badge status (admin action)
   */
  updateBadgeStatus: async (
    badgeId: string,
    status: 'pending' | 'active' | 'expired' | 'rejected',
    adminAddress?: string,
    rejectionNote?: string
  ): Promise<void> => {
    try {
      const badgeRef = ref(database, `premiumBadges/${badgeId}`);
      const badgeSnapshot = await get(badgeRef);
      
      if (!badgeSnapshot.exists()) {
        throw new Error('Badge not found');
      }
      
      const badgeData = badgeSnapshot.val();
      const updates: any = { status };
      
      if (status === 'active' && adminAddress) {
        updates.approvedBy = adminAddress;
        updates.approvedAt = Date.now();
        updates.expiryDate = Date.now() + (30 * 24 * 60 * 60 * 1000);
      }
      
      if (status === 'rejected' && rejectionNote) {
        updates.rejectionNote = rejectionNote;
      }

      await update(badgeRef, updates);
      
      if (status === 'active') {
        const updatedBadge = { ...badgeData, ...updates, id: badgeId };
        await update(ref(database, `users/${badgeData.userAddress.toLowerCase()}`), {
          activeBadge: updatedBadge
        });
      } else if (status === 'rejected' || status === 'expired') {
        await update(ref(database, `users/${badgeData.userAddress.toLowerCase()}`), {
          activeBadge: null
        });
      }
      
      console.log('Badge status updated:', badgeId, status);
    } catch (error) {
      console.error('Error updating badge status:', error);
      throw new Error('Failed to update badge status');
    }
  },

  /**
   * Admin manually assign a badge to a user
   */
  assignBadge: async (
    userAddress: string,
    badgeType: 'blue' | 'gold',
    adminAddress: string
  ): Promise<string> => {
    try {
      const purchaseId = `admin_${userAddress}_${Date.now()}`;
      const now = Date.now();
      
      const badgeData = {
        id: purchaseId,
        userAddress: userAddress.toLowerCase(),
        badgeType,
        txHash: 'ADMIN_ASSIGNED',
        purchaseDate: now,
        expiryDate: now + (30 * 24 * 60 * 60 * 1000),
        status: 'active',
        amountPaid: '0',
        approvedBy: adminAddress,
        approvedAt: now
      };

      await set(ref(database, `premiumBadges/${purchaseId}`), badgeData);
      
      await update(ref(database, `users/${userAddress.toLowerCase()}`), {
        activeBadge: badgeData
      });
      
      console.log('Badge assigned by admin:', purchaseId);
      return purchaseId;
    } catch (error) {
      console.error('Error assigning badge:', error);
      throw new Error('Failed to assign badge');
    }
  },

  revokeBadge: async (
    userAddress: string,
    badgeId: string,
    adminAddress: string
  ): Promise<void> => {
    try {
      await update(ref(database, `premiumBadges/${badgeId}`), {
        status: 'revoked',
        revokedBy: adminAddress,
        revokedAt: Date.now()
      });
      
      await update(ref(database, `users/${userAddress.toLowerCase()}`), {
        activeBadge: null
      });
      
      console.log('Badge revoked by admin:', badgeId);
    } catch (error) {
      console.error('Error revoking badge:', error);
      throw new Error('Failed to revoke badge');
    }
  },

  /**
   * Get all users with their badge status
   */
  getAllUsersWithBadges: async (): Promise<any[]> => {
    try {
      // Get all users
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      // Get all badges
      const badgesRef = ref(database, 'premiumBadges');
      const badgesSnapshot = await get(badgesRef);
      
      const users: any[] = [];
      const badges = badgesSnapshot.exists() ? badgesSnapshot.val() : {};
      const now = Date.now();
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        
        Object.keys(usersData).forEach(address => {
          const user = usersData[address];
          
          let activeBadge = null;
          for (const key of Object.keys(badges)) {
            const badge = badges[key];
            if (
              badge.userAddress.toLowerCase() === address.toLowerCase() &&
              badge.status === 'active' &&
              badge.expiryDate > now
            ) {
              activeBadge = { ...badge, id: key };
              break;
            }
          }
          
          users.push({
            address,
            ...user,
            activeBadge
          });
        });
      }

      return users;
    } catch (error) {
      console.error('Error fetching users with badges:', error);
      return [];
    }
  }
};
