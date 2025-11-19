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
- **Database**: Firebase Realtime Database for messaging
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
- **2024-11-19**: IPFS & Firebase Integration + Real Wallet + Smart Contract Minting
  - ✅ **Wallet**: Real BSC mainnet connection (Chain ID 56) with MetaMask
  - ✅ **IPFS/Pinata**: Post minting now uploads images and metadata to IPFS
  - ✅ **Firebase**: Real-time messaging with Firebase Realtime Database
  - ✅ **Smart Contract**: Real blockchain minting with actual NFT creation
  - ✅ Removed ALL mock/dummy data from services
  - ✅ Post creation uploads to IPFS and mints NFT on BSC smart contract
  - ✅ Transaction hash and token ID extracted from blockchain
  - ✅ Supports both custom PostMinted and standard ERC721 Transfer events
  - ✅ Chat messages sync in real-time across users via Firebase
  - ✅ Proper TypeScript definitions for all environment variables
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
✅ **Wallet Connection**: Fully working with BSC mainnet
✅ **IPFS Upload**: Images and metadata upload to Pinata
✅ **Real-time Messaging**: Firebase Realtime Database syncs messages
✅ **Post Minting**: Full blockchain integration - uploads to IPFS and mints NFT on smart contract
⚠️ **Feed**: No backend API to fetch/store posts yet
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
