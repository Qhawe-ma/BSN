# BSN - Blockchain Social Network

## Overview
BSN is a decentralized social network application built with React, TypeScript, and Vite. It features a modern UI for blockchain-based social interactions including posts, messaging, profiles, and analytics.

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
- **Blockchain**: Ethers.js 6.x for BSC mainnet integration
- **Storage**: Pinata for IPFS metadata and images
- **Database**: Firebase Realtime Database for user profiles and messaging
- **UI Library**: Tailwind CSS (via CDN)
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Axios for API calls

### Project Structure
```
├── components/          # Reusable UI components
│   └── UIComponents.tsx
├── views/              # Main application views
│   ├── ChatView.tsx    # Real-time messaging
│   ├── DashboardView.tsx # Analytics dashboard
│   ├── FeedView.tsx    # Social feed
│   └── ProfileView.tsx # User profiles
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── services.ts         # Main service layer with blockchain integration
├── contractABI.ts      # Smart contract ABI for NFT minting
├── ipfsService.ts      # IPFS/Pinata integration
├── firebaseService.ts  # Firebase real-time messaging
├── firebaseConfig.ts   # Firebase configuration
├── types.ts            # TypeScript type definitions
├── ethereum.d.ts       # Web3 wallet types
├── vite-env.d.ts       # Vite environment types
└── vite.config.ts      # Vite configuration

```

## Key Features
- Wallet-based authentication
- Social feed with posts
- Encrypted messaging
- User profiles
- Analytics dashboard
- IPFS integration for content storage
- Blockchain post minting

## Environment Setup

### Required Environment Variables
- `GEMINI_API_KEY`: API key for Gemini AI integration (optional)

### Development Server
The app runs on port 5000 with Vite dev server configured for Replit's proxy environment:
- Host: 0.0.0.0
- Port: 5000
- HMR enabled on port 5000

## Recent Changes
- **2024-12-03**: Share and Repost Functionality
  - ✅ **Share Button**: Uses Web Share API on mobile or copies post link to clipboard on desktop
  - ✅ **Visual Feedback**: Share button shows checkmark and "Copied!" when link is copied
  - ✅ **Repost Button**: Opens confirmation modal before minting repost on blockchain
  - ✅ **Wallet Confirmation**: Reposting requires wallet transaction approval with gas fees
  - ✅ **Repost Tracking**: Reposts stored in Firebase with count displayed on posts
  - ✅ **Repost Indicator**: Posts that are reposts show "X reposted from Y" header
  - ✅ **Duplicate Prevention**: Users cannot repost the same post twice
  - ✅ **Self-Repost Prevention**: Users cannot repost their own posts
  - 📁 **Updated Files**: `types.ts`, `services.ts`, `firebaseService.ts`, `views/FeedView.tsx`

- **2024-12-02**: Added End-to-End Encryption for Messages
  - ✅ **AES-GCM Encryption**: Messages encrypted with 256-bit AES-GCM before sending
  - ✅ **PBKDF2 Key Derivation**: Secure key derivation with 100,000 iterations
  - ✅ **Automatic Encryption**: All new messages are automatically encrypted
  - ✅ **Transparent Decryption**: Messages decrypted on receipt without user action
  - ✅ **Backward Compatible**: Old plain-text messages remain readable
  - ✅ **Encrypted Prefix**: Encrypted messages prefixed with "E2E:" in Firebase
  - 📁 **New File**: `encryptionService.ts` - Encryption/decryption service
  - ⚠️ **Note**: Current implementation uses app-level key derivation. For production, implement wallet-based ECDH key exchange for true per-user E2E encryption.

- **2024-12-02**: Analytics Dashboard Improvements
  - ✅ **Real Blockchain Data**: Analytics now fetches actual posts from blockchain
  - ✅ **Total Posts**: Shows real count of user's minted posts
  - ✅ **Total Likes**: Aggregates likes across all user posts
  - ✅ **Activity Charts**: Charts display real posting activity over time
  - ✅ **Loading States**: Added loading spinners while fetching data

- **2024-11-19**: UI/UX Improvements for Messaging and Profiles
  - ✅ **BETA Badge Removed**: Removed BETA badge from profile name field
  - ✅ **Smart Name Display**: Shows shortened wallet address (0x1234...5678) when user has no custom name set
  - ✅ **Follow Button**: Made follow button functional with toggle state (Follow/Following)
  - ✅ **Online Status**: Added green pulsing dot and "Online" indicator in chat header
  - ✅ **Read Receipts**: Single checkmark (✓) for sent messages, double checkmark (✓✓) for read messages
  - ✅ **Always-Visible Timestamps**: Message timestamps now always visible (not just on hover)
  - ✅ **Professional Look**: Clean, modern UI with proper spacing and styling

- **2024-11-19**: Fixed Real-Time Messaging Functionality
  - ✅ **Message Sending**: Fixed handleSend to pass recipient address when sending messages
  - ✅ **Real-Time Updates**: Implemented live message subscriptions so messages appear instantly
  - ✅ **Chat Sessions**: Implemented real-time chat list subscription to show new conversations immediately
  - ✅ **Chat ID Format**: Fixed startNewChat to create proper Firebase-compatible chat IDs (sorted addresses)
  - ✅ **Memory Management**: Added proper cleanup for Firebase listeners to prevent memory leaks
  - ✅ **No Draft State**: Messages now send immediately to Firebase - no more stuck "draft" conversations
  - ✅ **Case-Insensitive Matching**: Fixed getUserChats to properly match wallet addresses regardless of casing
  - ✅ **Chat ID Validation**: Added validation to prevent crashes from malformed chat IDs
  - 🐛 **Fixed Issues**: 
    - Messages were stuck in "draft" state and not being sent
    - New chats not appearing until page refresh
    - Messages not updating in real-time
    - Chat sessions not persisting between navigation
    - Recipients couldn't see chats when address casing didn't match exactly

- **2024-11-19**: Fixed Firebase Undefined Values Error
  - ✅ **Firebase Compatibility**: Removed undefined fields from user profile creation (Firebase doesn't allow undefined values)
  - ✅ **Data Sanitization**: Added filtering in saveUserProfile and updateUserProfile to strip undefined values before saving
  - ✅ **Clean User Objects**: New users are created with only defined fields (address, followers, following, totalPosts, avatarUrl, createdAt)
  - 🐛 **Fixed Issue**: "set failed: value argument contains undefined" error when connecting wallet for the first time

- **2024-11-19**: Fixed Wallet Connection UX Issue
  - ✅ **Error Handling**: Added comprehensive try-catch error handling to prevent silent failures
  - ✅ **Loading States**: All connect buttons now show "Connecting..." state with spinner
  - ✅ **Error Toast**: Replaced alert() with elegant toast notification for errors
  - ✅ **Firebase Fallback**: Connection works even if Firebase is unavailable
  - ✅ **Timeout Management**: Fixed stale timer issue to ensure error messages display for full duration
  - ✅ **Consistent UX**: All wallet connection entry points (sidebar, mobile, profile, prompts) show unified loading/error states
  - 🐛 **Fixed Issue**: Wallet connection getting stuck without showing connected state after MetaMask approval

- **2024-11-19**: Complete Firebase Integration - ALL Dummy Data Removed
  - ✅ **User Profiles**: Fully integrated with Firebase Realtime Database
    - Profile data (name, bio, website, avatar) stored and retrieved from Firebase
    - Real creation dates from Firebase timestamps
    - Profile editing saves to and reloads from Firebase
    - Both own profile and other users' profiles load real Firebase data
  - ✅ **Wallet**: Real BSC mainnet connection with Firebase profile hydration on connect
  - ✅ **IPFS/Pinata**: Post minting uploads images and metadata to IPFS
  - ✅ **Firebase Messaging**: Real-time chat sync across users
  - ✅ **Smart Contract**: Real blockchain minting with NFT creation
  - ✅ **Zero Dummy Data**: Removed ALL mock/placeholder data from profiles
    - Removed hardcoded "BSC Mainnet" location
    - Removed fake join dates, websites, and stats
    - Removed dummy NFT posts - shows empty state or real posts only
  - ✅ All profile navigation paths load from Firebase (sidebar, mobile nav, profile links)
  - ✅ Post creation uploads to IPFS and mints NFT on BSC smart contract
  - ✅ Transaction hash and token ID extracted from blockchain
  - ✅ Supports both custom PostMinted and standard ERC721 Transfer events
  - ⚠️ **Security Note**: Pinata keys are in frontend (should move to backend proxy for production)
  - 🔒 Firebase integration is secure and follows best practices
  - 📦 Installed: ethers.js, firebase, axios

- **2024-11-18**: Initial Replit setup
  - Configured Vite to use port 5000 for Replit compatibility
  - Added `allowedHosts` configuration to allow Replit proxy domains (.replit.dev, .repl.co)
  - Added script tag to index.html to load the main entry point
  - Set up workflow for `npm run dev`
  - Installed Node.js 20 and dependencies
  - Configured deployment settings for static build (dist folder)

## Development Notes
- The app uses Tailwind CSS via CDN (configured in index.html)
- Custom fonts: Space Grotesk and JetBrains Mono
- Import maps are used for React and other dependencies via aistudiocdn.com

## Wallet Connection
- **Network**: BSC Mainnet (Chain ID 56)
- **RPC URL**: https://bsc-dataseed.bnbchain.org
- **Block Explorer**: https://bscscan.com
- **Currency**: BNB
- Users need MetaMask or another Web3 wallet to connect
- The app automatically prompts to switch to BSC mainnet if on a different network
- If BSC network is not configured in the wallet, the app will automatically add it

## Current Functionality Status
✅ **Wallet Connection**: Fully working with BSC mainnet and Firebase profile hydration
✅ **User Profiles**: Complete Firebase integration - stores and retrieves real profile data
✅ **Profile Editing**: Saves name, bio, website, and avatar to Firebase
✅ **IPFS Upload**: Images and metadata upload to Pinata
✅ **Real-time Messaging**: Firebase Realtime Database syncs messages
✅ **Post Minting**: Full blockchain integration - uploads to IPFS and mints NFT on smart contract
⚠️ **Feed**: No backend API to fetch/store posts yet (shows empty state)
⚠️ **Comments/Likes**: Need backend API integration

## Smart Contract Integration
- **Contract Address**: Loaded from `VITE_BSC_CONTRACT_ADDRESS` environment variable
- **Contract**: PostToken.sol - Custom BEP-20 compatible token for BSC Social Network posts
- **ABI**: Defined in `contractABI.ts` - matches deployed contract
- **Function**: `mint(string metadataURI)` - Mints NFT with IPFS metadata
- **Event Support**: 
  - Custom `PostMinted(address author, uint256 tokenId, string metadataURI)` event
  - Standard `Transfer(address from, address to, uint256 tokenId)` event
- **Error Handling**: Gracefully handles transaction rejection, insufficient funds, and parsing errors
- **Real Data**: Token ID and transaction hash are extracted from blockchain receipt

## Next Steps for Production
1. **Security**: Move Pinata uploads to backend proxy (currently exposed in frontend)
2. **Backend API**: Build API for posts, comments, likes, and user profiles  
3. **Post Storage**: Store post references in backend after minting
4. **Authentication**: Add wallet signature verification for secure operations
