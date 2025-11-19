import { database } from './firebaseConfig';
import { ref, push, set, onValue, query, orderByChild, limitToLast, off } from 'firebase/database';
import { Message, ChatSession, User } from './types';
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
                unreadCount: 0 // TODO: Calculate unread count
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
  markAsRead: async (senderId: string, recipientId: string): Promise<void> => {
    try {
      const chatId = [senderId, recipientId].sort().join('_');
      const messagesRef = ref(database, `chats/${chatId}/messages`);
      
      onValue(messagesRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          if (message.recipient === senderId && !message.isRead) {
            const messageRef = ref(database, `chats/${chatId}/messages/${childSnapshot.key}`);
            set(messageRef, { ...message, isRead: true });
          }
        });
      }, { onlyOnce: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
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
  }
};
