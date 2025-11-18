import { Post, User, Message, ChatSession, Comment } from './types';

// --- Constants ---
const MOCK_DELAY = 800;

// --- Helper: Avatar Generator ---
export const generateAvatar = (address: string) => 
  `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=1e2329`;

// --- Helper: Format Address ---
export const formatAddress = (addr: string) => 
  `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

// --- Mock Data Stores ---
const MOCK_USER: User = {
  address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  ens: "builder.eth",
  bio: "Web3 enthusiast and digital creator. Minting moments on the Binance Smart Chain. Building the future of decentralized social media.",
  followers: 142,
  following: 89,
  totalPosts: 34,
  avatarUrl: ""
};
MOCK_USER.avatarUrl = generateAvatar(MOCK_USER.address);

const OTHER_USERS: User[] = [
  { address: "0x3G2...91B2", ens: "defi.bsc", bio: "Yield farming all day.", followers: 8900, following: 12, totalPosts: 450, avatarUrl: generateAvatar("0x3G2...91B2") },
  { address: "0x99A...112C", ens: undefined, bio: "Just here for the tech.", followers: 42, following: 105, totalPosts: 5, avatarUrl: generateAvatar("0x99A...112C") },
  { address: "0xBb4...009A", ens: "artist.eth", bio: "Digital artist. NFT collector.", followers: 1200, following: 400, totalPosts: 128, avatarUrl: generateAvatar("0xBb4...009A") }
];

let POSTS_STORE: Post[] = [
  {
    id: 101,
    tokenId: "4092",
    author: OTHER_USERS[0],
    content: "Just deployed my first smart contract on BSC! Gas fees are incredibly low compared to Mainnet. 🚀 #BSC #Dev",
    timestamp: Date.now() - 3600000,
    likes: 24,
    commentsCount: 5,
    ipfsHash: "QmXyZ...91b",
    txHash: "0xabc...123",
    isLiked: true
  },
  {
    id: 102,
    tokenId: "4093",
    author: OTHER_USERS[2],
    content: "Minted this new generative art piece visible on the new 0xSocial platform. Check the IPFS metadata.",
    timestamp: Date.now() - 7200000,
    likes: 156,
    commentsCount: 12,
    ipfsHash: "QmRq...88a",
    txHash: "0xdef...456",
    attachmentUrl: "https://picsum.photos/600/300"
  }
];

// --- Service: Blockchain (Simulated) ---
export const BlockchainService = {
  connectWallet: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real app, use window.ethereum.request({ method: 'eth_requestAccounts' })
        resolve(MOCK_USER);
      }, 600);
    });
  },

  mintPost: async (content: string, attachment?: File): Promise<Post> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPost: Post = {
          id: Math.floor(Math.random() * 10000),
          tokenId: Math.floor(Math.random() * 5000).toString(),
          author: MOCK_USER,
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

// --- Service: Data/Firebase (Simulated) ---
export const DataService = {
  getFeed: async (): Promise<Post[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...POSTS_STORE]), MOCK_DELAY));
  },

  toggleLike: async (postId: number): Promise<void> => {
    // Simulate optimistic UI update
    const post = POSTS_STORE.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  },

  getComments: async (postId: number): Promise<Comment[]> => {
    return new Promise(resolve => setTimeout(() => {
      resolve([
        { id: 'c1', postId, author: OTHER_USERS[1], content: "This is revolutionary!", timestamp: Date.now() - 100000 },
        { id: 'c2', postId, author: OTHER_USERS[2], content: "Great work.", timestamp: Date.now() - 50000 }
      ]);
    }, MOCK_DELAY / 2));
  },

  postComment: async (postId: number, content: string, author: User): Promise<Comment> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `c_new_${Date.now()}`,
          postId,
          author,
          content,
          timestamp: Date.now()
        });
      }, 600);
    });
  },

  getChats: async (): Promise<ChatSession[]> => {
    return [
      {
        id: 'chat_1',
        participant: OTHER_USERS[0],
        lastMessage: { id: 'm1', sender: OTHER_USERS[0].address, recipient: MOCK_USER.address, content: "Hey, saw your recent token mint.", timestamp: Date.now() - 500000, isRead: false },
        unreadCount: 1
      },
      {
        id: 'chat_2',
        participant: OTHER_USERS[2],
        lastMessage: { id: 'm2', sender: MOCK_USER.address, recipient: OTHER_USERS[2].address, content: "Thanks for the follow!", timestamp: Date.now() - 86400000, isRead: true },
        unreadCount: 0
      }
    ];
  },

  getMessages: async (chatId: string): Promise<Message[]> => {
    // If it's a new temporary chat, return empty
    if (chatId.startsWith('temp_')) return [];
    
    return [
        { id: 'm0', sender: OTHER_USERS[0].address, recipient: MOCK_USER.address, content: "Are you planning to integrate NFTs?", timestamp: Date.now() - 600000, isRead: true },
        { id: 'm1', sender: MOCK_USER.address, recipient: OTHER_USERS[0].address, content: "Yes, BEP-721 support is coming next week.", timestamp: Date.now() - 550000, isRead: true },
        { id: 'm2', sender: OTHER_USERS[0].address, recipient: MOCK_USER.address, content: "That's huge. Let me know if you need beta testers.", timestamp: Date.now() - 500000, isRead: false },
    ];
  },
  
  sendMessage: async (text: string): Promise<Message> => {
      return {
          id: `m_new_${Date.now()}`,
          sender: MOCK_USER.address,
          recipient: OTHER_USERS[0].address,
          content: text,
          timestamp: Date.now(),
          isRead: false
      }
  },

  startNewChat: async (address: string): Promise<ChatSession> => {
    return new Promise(resolve => setTimeout(() => {
      resolve({
        id: `temp_${Date.now()}`,
        participant: {
          address: address,
          ens: undefined, // Could resolve ENS here in real app
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
    }, 600));
  }
};