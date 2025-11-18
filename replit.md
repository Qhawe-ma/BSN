# BSN - Blockchain Social Network

## Overview
BSN is a decentralized social network application built with React, TypeScript, and Vite. It features a modern UI for blockchain-based social interactions including posts, messaging, profiles, and analytics.

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 19.2.0
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
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
- **2024-11-18**: Initial Replit setup
  - Configured Vite to use port 5000 for Replit compatibility
  - Set up workflow for `npm run dev`
  - Installed Node.js 20 and dependencies

## Development Notes
- The app uses Tailwind CSS via CDN (configured in index.html)
- Custom fonts: Space Grotesk and JetBrains Mono
- Import maps are used for React and other dependencies via aistudiocdn.com
