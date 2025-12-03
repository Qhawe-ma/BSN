# BSN - Blockchain Social Network

## Overview
BSN is a decentralized social network application built with React, TypeScript, and Vite. It aims to provide a modern user interface for blockchain-based social interactions, including posts, messaging, user profiles, and analytics. The project integrates with the BSC mainnet for blockchain operations and utilizes IPFS for content storage, along with Firebase for real-time data needs.

## User Preferences
The user wants the agent to focus on high-level features and architectural decisions, avoiding granular implementation details where possible. The user prefers concise summaries and consolidation of redundant information. The user wants the agent to prioritize information based on the specified order: Overview, User Preferences, System Architecture, and External Dependencies. The user does not want any changelogs or date-wise entries in the compressed output.

## System Architecture
BSN is a React application built with Vite and TypeScript. It uses Tailwind CSS for styling, Lucide React for icons, and Recharts for data visualization. Key architectural patterns include wallet-based authentication, IPFS integration for content, and blockchain interaction via Ethers.js for features like post minting. Firebase Realtime Database is used for dynamic content such as user profiles and real-time messaging. The application is structured with distinct components for UI, views, and services for modularity. It connects to the BSC Mainnet (Chain ID 56) and supports automatic network switching and addition for Web3 wallets. Smart contract interaction is handled via `PostToken.sol` for NFT minting, supporting both custom `PostMinted` and standard `Transfer` events.

## External Dependencies
- **Blockchain Integration**: Ethers.js (for BSC mainnet)
- **Decentralized Storage**: Pinata (for IPFS metadata and images)
- **Real-time Database/Messaging**: Firebase Realtime Database
- **HTTP Client**: Axios
- **UI Libraries**: Tailwind CSS (via CDN), Lucide React, Recharts
- **Development Tooling**: Vite