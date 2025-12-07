import { Post, User, Message, ChatSession, Comment } from './types';
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { IPFSService } from './ipfsService';
import { FirebaseService } from './firebaseService';
import { POST_MINTING_ABI } from './contractABI';
import { EncryptionService } from './encryptionService';

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

// Public RPC endpoints for read-only access (no wallet needed)
const PUBLIC_RPC_URLS = [
  'https://bsc-dataseed.bnbchain.org',
  'https://bsc-dataseed1.bnbchain.org',
  'https://bsc-dataseed2.bnbchain.org'
];

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_BSC_CONTRACT_ADDRESS;

// Legacy contract address for old posts (keep showing old posts from previous contract)
const LEGACY_CONTRACT_ADDRESS = '0x9b2950ff51ac7514d1469f4990f248f5b3cbf075';

// --- Post Cache (Aggressive caching like major social platforms) ---
interface PostCache {
  posts: Post[];
  timestamp: number;
  ttl: number; // Time to live in ms
  staleTime: number; // When to background refresh
}
let feedCache: PostCache | null = null;
const CACHE_TTL = 300000; // 5 minutes cache - aggressive like X/Facebook
const STALE_TIME = 60000; // Background refresh after 1 minute
let backgroundRefreshInProgress = false;

// --- Progressive Loading State ---
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

// --- Feed Update Events (Enhanced for Streaming) ---
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

// --- Optimistic Posts Management (Like X.com - Instant Post Display) ---
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
    console.log('⚡ Added optimistic post:', post.optimisticId);
    
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
    console.log('✅ Confirming optimistic post:', optimisticId, 'with tokenId:', confirmedPost.tokenId);
    
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
    console.log('❌ Removing failed optimistic post:', optimisticId);
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

// --- Helper: Get Provider (works without wallet) ---
const getReadOnlyProvider = () => {
  return new JsonRpcProvider(PUBLIC_RPC_URLS[0]);
};

const getProvider = () => {
  if (window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return getReadOnlyProvider();
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
  // Silent reconnect - doesn't prompt user, used for auto-reconnect on page load
  silentReconnect: async (): Promise<User | null> => {
    if (!window.ethereum) {
      return null;
    }

    try {
      // Check for already connected accounts WITHOUT prompting
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });

      if (!accounts || accounts.length === 0) {
        return null;
      }

      // Get provider and user address
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Try to load existing user from Firebase
      let user = await FirebaseService.getUserProfile(address);

      if (!user) {
        // If no profile exists, create a basic one
        user = {
          address,
          followers: 0,
          following: 0,
          totalPosts: 0,
          avatarUrl: generateAvatar(address),
          createdAt: Date.now()
        };
        await FirebaseService.saveUserProfile(user);
      }

      CURRENT_USER = user;
      console.log('✅ Silent reconnect successful:', address);
      
      return user;
    } catch (error) {
      console.warn('Silent reconnect failed:', error);
      return null;
    }
  },

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
        // Only include defined fields (Firebase doesn't allow undefined values)
        user = {
          address,
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

      console.log('⛏️ Minting post NFT on blockchain with FULL ON-CHAIN DATA...');
      console.log('📦 IPFS Hash:', ipfsHash);
      console.log('📝 Content:', content);
      console.log('🖼️ Image URL:', attachmentUrl || '(none)');
      
      // Use mintWithData to store content and image URL directly on-chain
      const tx = await contract.mintWithData(ipfsHash, content, attachmentUrl || '');
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
      const internalId = `${CONTRACT_ADDRESS.toLowerCase()}_${tokenId}`;
      const post: Post = {
        id: Date.now(),
        tokenId,
        internalId,
        author: CURRENT_USER,
        content,
        timestamp: metadata.timestamp,
        likes: 0,
        commentsCount: 0,
        repostsCount: 0,
        ipfsHash,
        txHash: receipt.hash,
        attachmentUrl,
        contractAddress: CONTRACT_ADDRESS
      };

      console.log('🎉 Post minted successfully!');
      console.log('Token ID:', tokenId);
      console.log('Transaction Hash:', receipt.hash);
      console.log('View on BSCScan:', `https://bscscan.com/tx/${receipt.hash}`);
      await FirebaseService.savePostTxHash(internalId, receipt.hash);
      
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
  },

  repostPost: async (originalPost: Post): Promise<Post> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Please add VITE_BSC_CONTRACT_ADDRESS to your environment.');
    }

    try {
      // Check if user already reposted this post
      const alreadyReposted = await FirebaseService.hasReposted(originalPost.tokenId, CURRENT_USER.address);
      if (alreadyReposted) {
        throw new Error('You have already reposted this post');
      }

      // Create repost metadata
      console.log('📝 Creating repost metadata...');
      const metadata = {
        content: originalPost.content,
        author: CURRENT_USER.address,
        timestamp: Date.now(),
        imageUrl: originalPost.attachmentUrl,
        isRepost: true,
        originalPostId: originalPost.tokenId,
        originalAuthor: {
          address: originalPost.author.address,
          ens: originalPost.author.ens,
          avatarUrl: originalPost.author.avatarUrl
        }
      };
      
      const ipfsHash = await IPFSService.uploadMetadata(metadata);
      console.log('✅ Repost metadata uploaded to IPFS:', ipfsHash);

      // Mint the repost NFT on blockchain
      console.log('🔗 Connecting to smart contract for repost...');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, POST_MINTING_ABI, signer);

      console.log('⛏️ Minting repost NFT on blockchain...');
      const tx = await contract.mint(ipfsHash);
      console.log('📡 Repost transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Repost transaction confirmed!');

      // Extract token ID from event logs
      let tokenId: string | null = null;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
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
          } else {
            for (const log of receipt.logs) {
              try {
                if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
                  continue;
                }
                if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                  if (log.topics.length >= 4) {
                    tokenId = BigInt(log.topics[3]).toString();
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

      if (!tokenId) {
        throw new Error('Failed to extract token ID from repost transaction.');
      }

      // Record the repost in Firebase
      await FirebaseService.recordRepost(originalPost.internalId, CURRENT_USER.address, tokenId);

      // Create the repost object
      const internalId = `${CONTRACT_ADDRESS.toLowerCase()}_${tokenId}`;
      const repost: Post = {
        id: Date.now(),
        tokenId,
        internalId,
        author: CURRENT_USER,
        content: originalPost.content,
        timestamp: metadata.timestamp,
        likes: 0,
        commentsCount: 0,
        repostsCount: 0,
        ipfsHash,
        txHash: receipt.hash,
        attachmentUrl: originalPost.attachmentUrl,
        isRepost: true,
        originalPostId: originalPost.tokenId,
        originalAuthor: originalPost.author,
        contractAddress: CONTRACT_ADDRESS
      };

      console.log('🎉 Repost minted successfully!');
      console.log('Repost Token ID:', tokenId);
      console.log('Original Post ID:', originalPost.tokenId);
      await FirebaseService.savePostTxHash(internalId, receipt.hash);
      
      DataService.invalidateCache();
      
      return repost;
    } catch (error: any) {
      console.error('Error reposting:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Repost rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient BNB for gas fees');
      } else if (error.message?.includes('user rejected')) {
        throw new Error('Repost rejected by user');
      }
      
      throw new Error(error.message || 'Failed to repost on blockchain');
    }
  }
};

// --- Helper: Fetch single post data ---
const fetchPostData = async (
  contract: Contract, 
  tokenId: number,
  contractAddress: string
): Promise<Post | null> => {
  try {
    // Get owner and metadata URI from contract in parallel
    const [owner, metadataURI] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId)
    ]);
    
    // Handle both "ipfs://hash" and just "hash" formats
    const cleanHash = metadataURI.replace('ipfs://', '').trim();

    // Fetch metadata from IPFS
    const metadataUrl = IPFSService.getIPFSUrl(cleanHash);
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch from IPFS: ${metadataResponse.status}`);
    }
    
    const contentType = metadataResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Invalid content type: ${contentType}, expected JSON`);
    }
    
    const metadata = await metadataResponse.json();

    // Validate metadata has required fields
    if (!metadata.content) {
      throw new Error('Metadata missing content field');
    }

    // Create unique internal ID with contract prefix for Firebase stats tracking
    const internalId = `${contractAddress.toLowerCase()}_${tokenId}`;

    // Get user profile and post stats in parallel
    const [author, stats] = await Promise.all([
      FirebaseService.getUserProfile(owner),
      FirebaseService.getPostStats(internalId)
    ]);
    
    const finalAuthor = author 
      ? { ...author, address: author.address || owner }
      : {
          address: owner,
          followers: 0,
          following: 0,
          totalPosts: 0,
          avatarUrl: generateAvatar(owner),
          createdAt: Date.now()
        };

    return {
      id: tokenId,
      tokenId: tokenId.toString(),
      internalId: internalId,
      author: finalAuthor,
      content: metadata.content || '',
      timestamp: metadata.timestamp || Date.now(),
      likes: stats.likes,
      commentsCount: stats.comments,
      repostsCount: stats.reposts,
      ipfsHash: cleanHash,
      txHash: stats.txHash || metadata.txHash || '',
      attachmentUrl: metadata.imageUrl,
      isRepost: metadata.isRepost || false,
      originalPostId: metadata.originalPostId,
      originalAuthor: metadata.originalAuthor,
      contractAddress: contractAddress
    };
  } catch (error) {
    console.warn(`Skipping post ${tokenId}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch posts from a specific contract (original - used for non-streaming)
const fetchPostsFromContract = async (contractAddress: string, provider: JsonRpcProvider): Promise<Post[]> => {
  try {
    const contract = new Contract(contractAddress, POST_MINTING_ABI, provider);
    const totalSupply = await contract.totalSupply();
    const totalPosts = Number(totalSupply);

    if (totalPosts === 0) {
      return [];
    }

    const batchSize = 3;
    const posts: Post[] = [];
    
    for (let i = 0; i < totalPosts; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, totalPosts); j++) {
        batch.push(fetchPostData(contract, j, contractAddress));
      }
      
      const results = await Promise.all(batch);
      posts.push(...results.filter((p): p is Post => p !== null));
      
      if (i + batchSize < totalPosts) {
        await delay(200);
      }
    }

    return posts;
  } catch (error) {
    console.warn(`Error fetching from contract ${contractAddress}:`, error);
    return [];
  }
};

// Progressive/streaming fetch - emits posts as they arrive (NEWEST FIRST for instant UX)
const fetchPostsProgressively = async (
  contractAddress: string, 
  provider: JsonRpcProvider,
  onBatchComplete: (posts: Post[], loaded: number, total: number) => void
): Promise<Post[]> => {
  try {
    const contract = new Contract(contractAddress, POST_MINTING_ABI, provider);
    const totalSupply = await contract.totalSupply();
    const totalPosts = Number(totalSupply);

    if (totalPosts === 0) {
      return [];
    }

    const batchSize = 5;
    const allPosts: Post[] = [];
    
    for (let i = totalPosts - 1; i >= 0; i -= batchSize) {
      const batch = [];
      const startIdx = Math.max(0, i - batchSize + 1);
      
      for (let j = i; j >= startIdx; j--) {
        batch.push(fetchPostData(contract, j, contractAddress));
      }
      
      const results = await Promise.all(batch);
      const validPosts = results.filter((p): p is Post => p !== null);
      allPosts.push(...validPosts);
      
      onBatchComplete(
        [...allPosts].sort((a, b) => b.timestamp - a.timestamp),
        allPosts.length,
        totalPosts
      );
      
      if (startIdx > 0) {
        await delay(50); // Fast batch loading like major social platforms
      }
    }

    return allPosts;
  } catch (error) {
    console.warn(`Error fetching progressively from ${contractAddress}:`, error);
    return [];
  }
};

// --- Background Refresh Helper (avoids recursion) ---
const refreshFeedInBackground = async (): Promise<void> => {
  try {
    console.log('🔄 Background: Fetching fresh feed...');
    const provider = getReadOnlyProvider();
    
    const newPosts = CONTRACT_ADDRESS ? await fetchPostsFromContract(CONTRACT_ADDRESS, provider) : [];
    await delay(100);
    const legacyPosts = LEGACY_CONTRACT_ADDRESS ? await fetchPostsFromContract(LEGACY_CONTRACT_ADDRESS, provider) : [];

    const allPosts = [...newPosts, ...legacyPosts];
    allPosts.sort((a, b) => b.timestamp - a.timestamp);

    feedCache = {
      posts: allPosts,
      timestamp: Date.now(),
      ttl: CACHE_TTL,
      staleTime: STALE_TIME
    };

    OptimisticPostService.reapplyOptimisticPosts();

    console.log(`✅ Background refresh complete: ${allPosts.length} posts`);
    FeedEvents.emit();
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
};

// --- Service: Data/Firebase ---
export const DataService = {
  getFeed: async (forceRefresh = false): Promise<Post[]> => {
    try {
      const now = Date.now();
      
      // Return cached immediately if valid (within TTL) and not forcing refresh
      if (!forceRefresh && feedCache && (now - feedCache.timestamp < feedCache.ttl)) {
        console.log('📦 Returning cached feed (instant)');
        
        // Background refresh if stale but still valid (separate helper to avoid recursion)
        if (now - feedCache.timestamp > STALE_TIME && !backgroundRefreshInProgress) {
          console.log('🔄 Starting background refresh...');
          backgroundRefreshInProgress = true;
          refreshFeedInBackground().finally(() => {
            backgroundRefreshInProgress = false;
          });
        }
        
        return feedCache.posts;
      }

      console.log('🔄 Fetching fresh feed from blockchain...');
      
      const provider = getReadOnlyProvider();
      
      const newPosts = CONTRACT_ADDRESS ? await fetchPostsFromContract(CONTRACT_ADDRESS, provider) : [];
      
      await delay(100);
      
      const legacyPosts = LEGACY_CONTRACT_ADDRESS ? await fetchPostsFromContract(LEGACY_CONTRACT_ADDRESS, provider) : [];

      const allPosts = [...newPosts, ...legacyPosts];

      allPosts.sort((a, b) => b.timestamp - a.timestamp);

      feedCache = {
        posts: allPosts,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
        staleTime: STALE_TIME
      };

      console.log(`✅ Loaded ${allPosts.length} posts (${newPosts.length} new, ${legacyPosts.length} legacy)`);
      return allPosts;
    } catch (error) {
      console.error('Error fetching feed:', error);
      // Return stale cache if available on error
      if (feedCache) {
        console.log('⚠️ Using stale cache due to error');
        return feedCache.posts;
      }
      return [];
    }
  },

  getFeedProgressive: async (forceRefresh = false): Promise<void> => {
    const now = Date.now();
    const existingPosts = feedCache?.posts || [];
    const hasExistingData = existingPosts.length > 0;
    
    if (!forceRefresh && feedCache && (now - feedCache.timestamp < feedCache.ttl)) {
      console.log('📦 Using cached feed for progressive load (instant)');
      streamState = {
        isLoading: false,
        loadedCount: feedCache.posts.length,
        totalCount: feedCache.posts.length,
        hasMore: false
      };
      FeedEvents.emitStream(feedCache.posts, streamState);
      
      if (now - feedCache.timestamp > STALE_TIME && !backgroundRefreshInProgress) {
        console.log('🔄 Background refresh triggered...');
        backgroundRefreshInProgress = true;
        refreshFeedInBackground().finally(() => {
          backgroundRefreshInProgress = false;
        });
      }
      return;
    }

    if (streamState.isLoading) {
      console.log('⏳ Progressive fetch already in progress');
      return;
    }

    console.log('🔄 Starting progressive feed fetch...');
    
    if (hasExistingData) {
      streamState = {
        isLoading: true,
        loadedCount: existingPosts.length,
        totalCount: existingPosts.length,
        hasMore: false
      };
      FeedEvents.emitStream(existingPosts, streamState);
    } else {
      streamState = {
        isLoading: true,
        loadedCount: 0,
        totalCount: 0,
        hasMore: true
      };
    }

    const provider = getReadOnlyProvider();
    let allPosts: Post[] = [];
    let totalExpected = 0;

    try {
      if (CONTRACT_ADDRESS) {
        const contract = new Contract(CONTRACT_ADDRESS, POST_MINTING_ABI, provider);
        const supply = await contract.totalSupply();
        totalExpected += Number(supply);
      }
      if (LEGACY_CONTRACT_ADDRESS) {
        const legacyContract = new Contract(LEGACY_CONTRACT_ADDRESS, POST_MINTING_ABI, provider);
        const legacySupply = await legacyContract.totalSupply();
        totalExpected += Number(legacySupply);
      }

      streamState.totalCount = totalExpected;

      if (CONTRACT_ADDRESS) {
        await fetchPostsProgressively(CONTRACT_ADDRESS, provider, (posts, loaded, total) => {
          allPosts = [...posts];
          const optimistic = OptimisticPostService.getOptimisticPosts();
          const merged = [...optimistic, ...allPosts.filter(p => !p.isOptimistic)];
          merged.sort((a, b) => b.timestamp - a.timestamp);
          streamState.loadedCount = loaded;
          FeedEvents.emitStream(merged, { ...streamState });
        });
      }

      await delay(50);

      if (LEGACY_CONTRACT_ADDRESS) {
        const currentPosts = [...allPosts];
        await fetchPostsProgressively(LEGACY_CONTRACT_ADDRESS, provider, (posts, loaded, total) => {
          allPosts = [...currentPosts, ...posts];
          const optimistic = OptimisticPostService.getOptimisticPosts();
          const merged = [...optimistic, ...allPosts.filter(p => !p.isOptimistic)];
          merged.sort((a, b) => b.timestamp - a.timestamp);
          streamState.loadedCount = currentPosts.length + loaded;
          FeedEvents.emitStream(merged, { ...streamState });
        });
      }

      feedCache = {
        posts: allPosts,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
        staleTime: STALE_TIME
      };

      OptimisticPostService.reapplyOptimisticPosts();

      streamState = {
        isLoading: false,
        loadedCount: feedCache.posts.length,
        totalCount: feedCache.posts.length,
        hasMore: false
      };
      FeedEvents.emitStream(feedCache.posts, streamState);

      console.log(`✅ Progressive load complete: ${allPosts.length} posts`);
    } catch (error) {
      console.error('Error in progressive fetch:', error);
      streamState.isLoading = false;
      streamState.hasMore = false;
      if (feedCache) {
        OptimisticPostService.reapplyOptimisticPosts();
        FeedEvents.emitStream(feedCache.posts, streamState);
      }
    }
  },

  // Get posts by specific owner address - uses cache for instant loading
  getPostsByOwner: async (ownerAddress: string): Promise<Post[]> => {
    try {
      const normalizedOwner = ownerAddress.toLowerCase();
      
      // First, try to get from cache for instant results
      if (feedCache && (Date.now() - feedCache.timestamp < feedCache.ttl)) {
        const cachedPosts = feedCache.posts.filter(
          post => post.author.address.toLowerCase() === normalizedOwner
        );
        console.log(`⚡ Instant load: ${cachedPosts.length} posts for ${formatAddress(ownerAddress)} from cache`);
        return cachedPosts;
      }
      
      // If no cache, fetch the full feed (this populates the cache)
      const allPosts = await DataService.getFeed();
      
      // Filter for this owner
      const ownerPosts = allPosts.filter(
        post => post.author.address.toLowerCase() === normalizedOwner
      );
      
      console.log(`✅ Loaded ${ownerPosts.length} posts for user ${formatAddress(ownerAddress)}`);
      return ownerPosts;
    } catch (error) {
      console.error('Error fetching posts by owner:', error);
      return [];
    }
  },

  // Get cached feed without fetching (for instant display)
  getCachedFeed: (): Post[] | null => {
    if (feedCache && (Date.now() - feedCache.timestamp < feedCache.ttl)) {
      return feedCache.posts;
    }
    return null;
  },

  // Check if cache is valid
  isCacheValid: (): boolean => {
    return feedCache !== null && (Date.now() - feedCache.timestamp < feedCache.ttl);
  },

  // Invalidate cache (call after minting new post)
  invalidateCache: () => {
    feedCache = null;
    console.log('🗑️ Feed cache invalidated');
    // Notify all subscribers to refresh their feed
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

    const encryptedText = await EncryptionService.encrypt(text, CURRENT_USER.address, recipientAddress);
    return await FirebaseService.sendMessage(CURRENT_USER.address, recipientAddress, encryptedText);
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    if (!CURRENT_USER) {
      throw new Error('Please connect your wallet first');
    }

    // Create chat ID using the same format as Firebase (sorted addresses)
    const chatId = [CURRENT_USER.address, address].sort().join('_');

    // Fetch the user's profile to get their badge and other info
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

    // Create a new chat session
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

  /**
   * Subscribe to real-time messages (with automatic decryption)
   */
  subscribeToMessages: (
    senderId: string,
    recipientId: string,
    callback: (messages: Message[]) => void
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
            return { ...msg, content: decryptedContent };
          }
          return msg;
        })
      );
      callback(decryptedMessages);
    });
  },

  /**
   * Subscribe to real-time chats (with automatic decryption of last message)
   */
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
