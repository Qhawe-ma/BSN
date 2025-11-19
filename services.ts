import { Post, User, Message, ChatSession, Comment } from './types';
import { BrowserProvider, Contract } from 'ethers';
import { IPFSService } from './ipfsService';
import { FirebaseService } from './firebaseService';
import { POST_MINTING_ABI } from './contractABI';

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

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_BSC_CONTRACT_ADDRESS;

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

      // Try to load existing user from Firebase
      let user = await FirebaseService.getUserProfile(address);

      // If user doesn't exist in Firebase, create new profile
      if (!user) {
        console.log('🆕 Creating new user profile...');
        user = {
          address,
          ens: undefined,
          bio: undefined,
          website: undefined,
          followers: 0,
          following: 0,
          totalPosts: 0,
          avatarUrl: generateAvatar(address),
          createdAt: Date.now() // Save account creation timestamp
        };

        // Save new user to Firebase
        await FirebaseService.saveUserProfile(user);
        console.log('✅ New user profile created in Firebase');
      } else {
        console.log('✅ Loaded existing user profile from Firebase');
      }

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

    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Please add VITE_BSC_CONTRACT_ADDRESS to your environment.');
    }

    try {
      let attachmentUrl: string | undefined;
      
      // Step 1: Upload image to IPFS if present
      if (attachment) {
        console.log('📤 Uploading image to IPFS...');
        const ipfsImageUri = await IPFSService.uploadImage(attachment);
        attachmentUrl = IPFSService.getIPFSUrl(ipfsImageUri.replace('ipfs://', ''));
      }

      // Step 2: Create and upload post metadata to IPFS
      console.log('📝 Creating post metadata...');
      const metadata = {
        content,
        author: CURRENT_USER.address,
        timestamp: Date.now(),
        imageUrl: attachmentUrl
      };
      
      const ipfsHash = await IPFSService.uploadMetadata(metadata);
      console.log('✅ Metadata uploaded to IPFS:', ipfsHash);

      // Step 3: Mint NFT on BSC smart contract
      console.log('🔗 Connecting to smart contract...');
      console.log('📍 Contract address:', CONTRACT_ADDRESS);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, POST_MINTING_ABI, signer);

      console.log('⛏️ Minting post NFT on blockchain...');
      console.log('📦 IPFS Hash:', ipfsHash);
      const tx = await contract.mint(ipfsHash);
      console.log('📡 Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!');

      // Extract token ID from event logs
      let tokenId: string | null = null;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          // Try to find PostMinted event
          const postMintedEvent = receipt.logs.find((log: any) => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed?.name === 'PostMinted';
            } catch {
              return false;
            }
          });

          if (postMintedEvent) {
            const parsed = contract.interface.parseLog(postMintedEvent);
            tokenId = parsed?.args?.tokenId?.toString();
            console.log('📝 Extracted tokenId from PostMinted event');
          } else {
            // Fall back to standard ERC721 Transfer event
            // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
            for (const log of receipt.logs) {
              try {
                // Only process Transfer events from OUR contract (not random ERC20/721 tokens)
                if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
                  continue;
                }
                
                // Standard ERC721 Transfer event topic
                if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                  // tokenId is the 4th topic (index 3) in a standard Transfer event
                  if (log.topics.length >= 4) {
                    tokenId = BigInt(log.topics[3]).toString();
                    console.log('📝 Extracted tokenId from ERC721 Transfer event');
                    break;
                  }
                }
              } catch (error) {
                console.warn('Could not parse Transfer event:', error);
              }
            }
          }
        } catch (error) {
          console.warn('Could not parse event logs:', error);
        }
      }

      // If we still don't have a tokenId, something went wrong
      if (!tokenId) {
        throw new Error('Failed to extract token ID from transaction. The contract may not be compatible or the transaction failed.');
      }

      // Step 4: Create post object with real blockchain data
      const post: Post = {
        id: Date.now(),
        tokenId,
        author: CURRENT_USER,
        content,
        timestamp: metadata.timestamp,
        likes: 0,
        commentsCount: 0,
        ipfsHash,
        txHash: receipt.hash,
        attachmentUrl
      };

      console.log('🎉 Post minted successfully!');
      console.log('Token ID:', tokenId);
      console.log('Transaction Hash:', receipt.hash);
      console.log('View on BSCScan:', `https://bscscan.com/tx/${receipt.hash}`);
      
      return post;
    } catch (error: any) {
      console.error('Error minting post:', error);
      
      // Provide more helpful error messages
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient BNB for gas fees');
      } else if (error.message?.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }
      
      throw new Error(error.message || 'Failed to mint post on blockchain');
    }
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
    if (!CURRENT_USER) {
      return [];
    }
    
    return new Promise((resolve) => {
      FirebaseService.getUserChats(CURRENT_USER!.address, (chats) => {
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
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    return await FirebaseService.sendMessage(CURRENT_USER.address, recipientAddress, text);
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    // Create a new chat session
    const chatSession: ChatSession = {
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
    };

    return chatSession;
  },

  /**
   * Subscribe to real-time messages
   */
  subscribeToMessages: (
    senderId: string,
    recipientId: string,
    callback: (messages: Message[]) => void
  ): (() => void) => {
    return FirebaseService.subscribeToMessages(senderId, recipientId, callback);
  },

  /**
   * Subscribe to real-time chats
   */
  subscribeToChats: (
    userId: string,
    callback: (chats: ChatSession[]) => void
  ): (() => void) => {
    return FirebaseService.getUserChats(userId, callback);
  }
};
