# BSN - Blockchain Social Network

## Overview
BSN is a decentralized social network application built with React, TypeScript, and Vite. It features a modern UI for blockchain-based social interactions including posts, messaging, profiles, and analytics.

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
- **Blockchain**: Ethers.js 6.x for BSC mainnet integration
- **UI Library**: Tailwind CSS (via CDN)
- **Icons**: Lucide React
- **Charts**: Recharts

### Project Structure
```
├── components/          # Reusable UI components
│   └── UIComponents.tsx
├── views/              # Main application views
│   ├── ChatView.tsx    # Encrypted messaging
│   ├── DashboardView.tsx # Analytics dashboard
│   ├── FeedView.tsx    # Social feed
│   └── ProfileView.tsx # User profiles
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── services.ts         # Blockchain services
├── types.ts            # TypeScript type definitions
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
- **2024-11-19**: Real BSC Mainnet Wallet Integration
  - ✅ Installed ethers.js for web3 wallet integration
  - ✅ Implemented real BSC mainnet wallet connection (Chain ID 56)
  - ✅ Removed ALL mock/dummy data (MOCK_USER, OTHER_USERS, POSTS_STORE)
  - ✅ Added proper error handling for wallet connection
  - ✅ All data services now return empty arrays or throw clear errors indicating backend integration needed
  - ✅ Created ethereum.d.ts for window.ethereum type declarations
  - 🔒 Wallet connection fully functional with MetaMask and other Web3 wallets
  - 🔗 Network auto-switches/adds BSC mainnet if not present
  - 📝 All services are backend-ready with TODO comments for API integration

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

## Next Steps for Full Functionality
The wallet connection is now working with real BSC mainnet. To complete the app, you'll need to:
1. **Backend API**: Implement backend endpoints for posts, comments, likes, and messaging
2. **Smart Contracts**: Deploy smart contracts on BSC for post minting (BEP-721 NFTs)
3. **IPFS Integration**: Set up IPFS for decentralized content storage
4. **Database**: Connect a database to store user profiles, posts, and chat messages
5. **Authentication**: Implement signature-based authentication for wallet users
