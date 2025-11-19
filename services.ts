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

    // TODO: Real implementation would:
    // 1. Upload image to IPFS
    // 2. Create post metadata JSON
    // 3. Mint NFT on BSC smart contract
    // 4. Store post reference in backend database
    
    throw new Error('Minting posts requires backend and smart contract integration. Please implement the backend API first.');
  }
};

// --- Service: Data/Firebase (Real implementation will use backend API) ---
export const DataService = {
  getFeed: async (): Promise<Post[]> => {
    // TODO: Fetch posts from backend API
    // Example: const response = await fetch('/api/feed');
    // return response.json();
    return [];
  },

  toggleLike: async (postId: number): Promise<void> => {
    // TODO: Update like status via backend API
    // Example: await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    throw new Error('Toggling likes requires backend API integration');
  },

  getComments: async (postId: number): Promise<Comment[]> => {
    // TODO: Fetch comments from backend API
    // Example: const response = await fetch(`/api/posts/${postId}/comments`);
    // return response.json();
    return [];
  },

  postComment: async (postId: number, content: string, author: User): Promise<Comment> => {
    // TODO: Post comment to backend API
    // Example: const response = await fetch(`/api/posts/${postId}/comments`, {
    //   method: 'POST',
    //   body: JSON.stringify({ content, author })
    // });
    // return response.json();
    throw new Error('Posting comments requires backend API integration');
  },

  getChats: async (): Promise<ChatSession[]> => {
    // TODO: Fetch chat sessions from backend API
    // Example: const response = await fetch('/api/chats');
    // return response.json();
    return [];
  },

  getMessages: async (chatId: string): Promise<Message[]> => {
    // TODO: Fetch messages from backend API
    // Example: const response = await fetch(`/api/chats/${chatId}/messages`);
    // return response.json();
    return [];
  },
  
  sendMessage: async (text: string, recipientAddress: string): Promise<Message> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    // TODO: Send message via backend API with encryption
    // Example: const response = await fetch('/api/messages', {
    //   method: 'POST',
    //   body: JSON.stringify({ text, recipient: recipientAddress })
    // });
    // return response.json();
    throw new Error('Sending messages requires backend API integration');
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    // TODO: Create chat session via backend API
    // Example: const response = await fetch('/api/chats', {
    //   method: 'POST',
    //   body: JSON.stringify({ participantAddress: address })
    // });
    // return response.json();
    throw new Error('Starting chats requires backend API integration');
  }
};
