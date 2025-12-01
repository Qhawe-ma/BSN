import { database } from './firebaseConfig';
import { ref, push, set, onValue, query, orderByChild, limitToLast, off } from 'firebase/database';
import { Message, ChatSession, User, Comment } from './types';
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
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const chatSessions: ChatSession[] = [];
      
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
            }
          }
        }
      });
      
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
      const userRef = ref(database, `users/${address}`);
      
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
      const userRef = ref(database, `users/${user.address}`);
      
      // Filter out undefined values (Firebase doesn't allow them)
      const cleanUser: Record<string, any> = {};
      for (const [key, value] of Object.entries(user)) {
        if (value !== undefined) {
          cleanUser[key] = value;
        }
      }
      
      await set(userRef, cleanUser);
      console.log('✅ User profile saved to Firebase:', user.address);
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
      const userRef = ref(database, `users/${address}`);
      
      // Get current user data
      const currentUser = await FirebaseService.getUserProfile(address);
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
        console.log('✅ User profile updated:', address);
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
      
      return new Promise((resolve) => {
        onValue(likeRef, (snapshot) => {
          resolve(snapshot.exists());
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  },

  /**
   * Get post stats (likes count, comments count)
   */
  getPostStats: async (postId: string): Promise<{ likes: number; comments: number }> => {
    try {
      const statsRef = ref(database, `postStats/${postId}`);
      
      return new Promise((resolve) => {
        onValue(statsRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            resolve({
              likes: data.likes || 0,
              comments: data.comments || 0
            });
          } else {
            resolve({ likes: 0, comments: 0 });
          }
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('Error getting post stats:', error);
      return { likes: 0, comments: 0 };
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
  }
};
