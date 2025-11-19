import { Post, User, Message, ChatSession, Comment } from './types';
import { BrowserProvider } from 'ethers';

// --- Constants ---
const BSC_MAINNET_CHAIN_ID = '0x38'; // Chain ID 56 in hex
const BSC_MAINNET_CONFIG = {
  chainId: BSC_MAINNET_CHAIN_ID,
  chainName: 'BNB Smart Chain Mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.bnbchain.org'],
  blockExplorerUrls: ['https://bscscan.com/']
};

// --- Helper: Avatar Generator ---
export const generateAvatar = (address: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=1e2329`;

// --- Helper: Format Address ---
export const formatAddress = (addr: string) => 
  `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

// --- Store for posts (empty by default, will be populated from backend/chain) ---
let POSTS_STORE: Post[] = [];

// --- Store current connected user ---
let CURRENT_USER: User | null = null;

// --- Service: Blockchain (Real BSC Connection) ---
export const BlockchainService = {
  connectWallet: async (): Promise<User> => {
    // Check if MetaMask or other wallet is installed
    if (!window.ethereum) {
      throw new Error('Please install MetaMask or another Web3 wallet to connect!');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      // Switch to BSC Mainnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_MAINNET_CHAIN_ID }],
        });
      } catch (switchError: any) {
        // If BSC network is not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_MAINNET_CONFIG]
          });
        } else {
          throw switchError;
        }
      }

      // Get provider and user address
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Get BNB balance
      const balance = await provider.getBalance(address);

      // Create user object
      const user: User = {
        address,
        ens: undefined, // ENS is not available on BSC by default
        bio: undefined,
        followers: 0,
        following: 0,
        totalPosts: 0,
        avatarUrl: generateAvatar(address)
      };

      CURRENT_USER = user;

      console.log('✅ Connected to BSC Mainnet:', address);
      console.log('💰 BNB Balance:', balance.toString());

      return user;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  },

  mintPost: async (content: string, attachment?: File): Promise<Post> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    // In a real implementation, this would:
    // 1. Upload image to IPFS
    // 2. Create post metadata
    // 3. Mint NFT on BSC
    // 4. Store reference in backend
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPost: Post = {
          id: Math.floor(Math.random() * 10000),
          tokenId: Math.floor(Math.random() * 5000).toString(),
          author: CURRENT_USER!,
          content,
          timestamp: Date.now(),
          likes: 0,
          commentsCount: 0,
          ipfsHash: `Qm${Math.random().toString(36).substring(7)}`,
          txHash: `0x${Math.random().toString(36).substring(2)}`,
          attachmentUrl: attachment ? URL.createObjectURL(attachment) : undefined,
        };
        POSTS_STORE = [newPost, ...POSTS_STORE];
        resolve(newPost);
      }, 2000); // Simulate block time
    });
  }
};

// --- Service: Data/Firebase (Real implementation will use backend API) ---
export const DataService = {
  getFeed: async (): Promise<Post[]> => {
    // In a real app, this would fetch from your backend API or blockchain
    return new Promise(resolve => setTimeout(() => resolve([...POSTS_STORE]), 300));
  },

  toggleLike: async (postId: number): Promise<void> => {
    // In a real app, this would update on backend/blockchain
    const post = POSTS_STORE.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  },

  getComments: async (postId: number): Promise<Comment[]> => {
    // In a real app, fetch comments from backend
    return new Promise(resolve => setTimeout(() => {
      resolve([]);
    }, 300));
  },

  postComment: async (postId: number, content: string, author: User): Promise<Comment> => {
    // In a real app, post to backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `c_new_${Date.now()}`,
          postId,
          author,
          content,
          timestamp: Date.now()
        });
      }, 300);
    });
  },

  getChats: async (): Promise<ChatSession[]> => {
    // In a real app, fetch from backend
    return [];
  },

  getMessages: async (chatId: string): Promise<Message[]> => {
    // In a real app, fetch messages from backend
    return [];
  },
  
  sendMessage: async (text: string, recipientAddress: string): Promise<Message> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    // In a real app, send via backend with encryption
    return {
      id: `m_new_${Date.now()}`,
      sender: CURRENT_USER.address,
      recipient: recipientAddress,
      content: text,
      timestamp: Date.now(),
      isRead: false
    }
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    // In a real app, create chat session in backend
    return new Promise(resolve => setTimeout(() => {
      resolve({
        id: `temp_${Date.now()}`,
        participant: {
          address: address,
          ens: undefined,
          followers: 0,
          following: 0,
          totalPosts: 0,
          avatarUrl: generateAvatar(address)
        },
        lastMessage: {
          id: 'init',
          sender: '',
          recipient: '',
          content: 'New conversation',
          timestamp: Date.now(),
          isRead: true
        },
        unreadCount: 0
      });
    }, 300));
  }
};
