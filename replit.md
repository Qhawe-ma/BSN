# BSN - Blockchain Social Network

## Overview
BSN is a decentralized social network application built with React, TypeScript, and Vite. It aims to provide a modern user interface for blockchain-based social interactions, including posts, messaging, user profiles, and analytics. The project integrates with the BSC mainnet for blockchain operations and utilizes IPFS for content storage, along with Firebase for real-time data needs.

## User Preferences
The user wants the agent to focus on high-level features and architectural decisions, avoiding granular implementation details where possible. The user prefers concise summaries and consolidation of redundant information. The user wants the agent to prioritize information based on the specified order: Overview, User Preferences, System Architecture, and External Dependencies. The user does not want any changelogs or date-wise entries in the compressed output.

## System Architecture
BSN is a React application built with Vite and TypeScript. It uses Tailwind CSS for styling, Lucide React for icons, and Recharts for data visualization. Key architectural patterns include wallet-based authentication (Solana), IPFS integration for content, and blockchain interaction via Solana Web3.js and Metaplex for features like post minting. Firebase Realtime Database is used for dynamic content such as user profiles and real-time messaging. The application is structured with distinct components for UI, views, and services for modularity. It connects to the Solana Mainnet and supports automatic network switching and addition for Web3 wallets. On-chain posts are handled via Metaplex NFT minting.

## Landing Page
The app features a responsive landing page (LandingPage.tsx) that:
- Shows on first visit for new users (stored in localStorage)
- Features animated floating particles and mouse-following glow effects
- Explains key features: wallet messaging, end-to-end encryption, NFT posts, decentralized identity
- Includes a chat preview mockup demonstrating encrypted messaging
- Has "Launch App" button that enters the main application
- Matches the app's dark theme with gold/yellow primary colors
- **Prefetches feed data** in background while user is viewing landing page - when they click "Launch App", posts are already loaded (no skeleton loading)

## Feed Performance
The feed is optimized for fast loading:
- **Progressive loading**: Posts stream in as they arrive from blockchain, newest first
- **Background prefetching**: Feed starts loading while on landing page
- **Cache-first rendering**: FeedView initializes with cached data immediately, no skeleton if data exists
- **Lazy loading images**: LazyImage component with blur placeholder and fade-in transitions
- **Infinite scroll**: Uses IntersectionObserver to load more posts as user scrolls

## Optimistic Post System
Posts appear instantly like X.com/Facebook using an optimistic UI pattern:
- **OptimisticPostService**: Manages pending posts separately from cache, survives feed refreshes
- **Instant display**: When user creates a post, it appears immediately at the top of the feed with a "Confirming..." indicator
- **Visual feedback**: Pending posts show at 70% opacity with disabled interactions until blockchain confirms
- **Automatic confirmation**: When blockchain transaction completes, optimistic post is replaced with the confirmed version (matching by internalId)
- **Error recovery**: If transaction fails, optimistic post is removed and user is notified
- **No skeleton regression**: Cache is never invalidated during post creation - avoids 1-2 minute loading states

## Admin Panel Security
The admin panel uses two separate passwords:
- **ADMIN_PASSWORD**: For logging into the admin panel
- **BADGE_PASSWORD**: For assigning or removing user badges (separate from login password)

Both are stored as secrets in the Replit environment.

## External Dependencies
- **Blockchain Integration**: Solana Web3.js, Metaplex SDK (for Solana mainnet)
- **Decentralized Storage**: Pinata (for IPFS metadata and images)
- **Real-time Database/Messaging**: Firebase Realtime Database
- **HTTP Client**: Axios
- **UI Libraries**: Tailwind CSS (via CDN), Lucide React, Recharts
- **Development Tooling**: Vite