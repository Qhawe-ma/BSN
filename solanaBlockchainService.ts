// Simplified BlockchainService for Solana
// This replaces the EVM-based BlockchainService

import { User, Post } from './types';
import { FirebaseService } from './firebaseService';
import { IPFSService } from './ipfsService';
import { MetaplexService } from './metaplexService';
import { generateAvatar } from './services';

// Store current connected user
let CURRENT_USER: User | null = null;

export const SolanaBlockchainService = {
    /**
     * Silent reconnect for Solana wallet (used on page load)
     * This will be called from App.tsx with wallet adapter
     */
    silentReconnect: async (walletPublicKey: string | null): Promise<User | null> => {
        if (!walletPublicKey) {
            return null;
        }

        try {
            // Try to load existing user from Firebase
            let user = await FirebaseService.getUserProfile(walletPublicKey);

            if (!user) {
                // If no profile exists, create a basic one
                user = {
                    address: walletPublicKey,
                    followers: 0,
                    following: 0,
                    totalPosts: 0,
                    avatarUrl: generateAvatar(walletPublicKey),
                    createdAt: Date.now()
                };
                await FirebaseService.saveUserProfile(user);
            }

            CURRENT_USER = user;
            console.log('✅ Silent reconnect successful:', walletPublicKey);

            return user;
        } catch (error) {
            console.warn('Silent reconnect failed:', error);
            return null;
        }
    },

    /**
     * Connect wallet (called when user clicks connect button)
     * Wallet connection is handled by Solana wallet adapter
     */
    connectWallet: async (walletPublicKey: string): Promise<User> => {
        try {
            // Try to load existing user from Firebase
            let user = await FirebaseService.getUserProfile(walletPublicKey);

            // If user doesn't exist in Firebase, create new profile
            if (!user) {
                console.log('🆕 Creating new user profile...');
                user = {
                    address: walletPublicKey,
                    followers: 0,
                    following: 0,
                    totalPosts: 0,
                    avatarUrl: generateAvatar(walletPublicKey),
                    createdAt: Date.now()
                };

                // Save new user to Firebase
                await FirebaseService.saveUserProfile(user);
                console.log('✅ New user profile created in Firebase');
            } else {
                console.log('✅ Loaded existing user profile from Firebase');
            }

            CURRENT_USER = user;
            console.log('✅ Connected to Solana:', walletPublicKey);

            return user;
        } catch (error: any) {
            console.error('Wallet connection error:', error);
            throw new Error(error.message || 'Failed to connect wallet');
        }
    },

    /**
     * Mint post as NFT using Metaplex
     */
    mintPost: async (wallet: any, content: string, attachment?: File): Promise<Post> => {
        if (!CURRENT_USER) {
            throw new Error('Please connect your wallet first');
        }

        try {
            let attachmentUrl: string | undefined;

            // Step 1: Upload image to IPFS if present
            if (attachment) {
                console.log('📤 Uploading image to IPFS...');
                const ipfsImageUri = await IPFSService.uploadImage(attachment);
                attachmentUrl = IPFSService.getIPFSUrl(ipfsImageUri.replace('ipfs://', ''));
            }

            // Step 2: Mint post as NFT using Metaplex
            console.log('🎨 Minting post as NFT on Solana...');
            const nftResult = await MetaplexService.mintPostNFT(wallet, content, attachmentUrl);

            // Step 3: Create post object with NFT data
            const post: Post = {
                id: Date.now(),
                tokenId: nftResult.mintAddress,
                internalId: nftResult.mintAddress,
                author: CURRENT_USER,
                content,
                timestamp: Date.now(),
                likes: 0,
                commentsCount: 0,
                repostsCount: 0,
                ipfsHash: nftResult.metadataUri,
                txHash: nftResult.signature,
                attachmentUrl,
            };

            console.log('🎉 Post NFT minted successfully!');
            console.log('NFT Mint Address:', nftResult.mintAddress);
            console.log('Transaction:', nftResult.signature);
            console.log('View on Solscan:', `https://solscan.io/tx/${nftResult.signature}`);

            // Save transaction hash AND full post to Firebase
            await FirebaseService.savePostTxHash(nftResult.mintAddress, nftResult.signature);
            await FirebaseService.savePost(post);

            return post;
        } catch (error: any) {
            console.error('Error minting post:', error);

            // The metaplexService already provides detailed error messages,
            // so we just re-throw them as-is for better user experience
            if (error.message) {
                throw error; // Re-throw with the detailed message from metaplexService
            }

            throw new Error(error.message || 'Failed to mint post on Solana');
        }
    },

    /**
     * Repost functionality (mint new NFT referencing original)
     */
    repostPost: async (wallet: any, originalPost: Post): Promise<Post> => {
        if (!CURRENT_USER) {
            throw new Error('Please connect your wallet first');
        }

        try {
            // Check if user already reposted this post
            const alreadyReposted = await FirebaseService.hasReposted(originalPost.tokenId, CURRENT_USER.address);
            if (alreadyReposted) {
                throw new Error('You have already reposted this post');
            }

            // Mint repost as new NFT
            console.log('🔁 Minting repost as NFT...');
            const nftResult = await MetaplexService.mintPostNFT(
                wallet,
                `Repost: ${originalPost.content}`,
                originalPost.attachmentUrl
            );

            // Record the repost in Firebase
            await FirebaseService.recordRepost(originalPost.internalId, CURRENT_USER.address, nftResult.mintAddress);

            // Create the repost object
            const repost: Post = {
                id: Date.now(),
                tokenId: nftResult.mintAddress,
                internalId: nftResult.mintAddress,
                author: CURRENT_USER,
                content: originalPost.content,
                timestamp: Date.now(),
                likes: 0,
                commentsCount: 0,
                repostsCount: 0,
                ipfsHash: nftResult.metadataUri,
                txHash: nftResult.signature,
                attachmentUrl: originalPost.attachmentUrl,
                isRepost: true,
                originalPostId: originalPost.tokenId,
                originalAuthor: originalPost.author,
            };

            console.log('🎉 Repost NFT minted successfully!');
            await FirebaseService.savePostTxHash(nftResult.mintAddress, nftResult.signature);
            await FirebaseService.savePost(repost);

            return repost;
        } catch (error: any) {
            console.error('Error reposting:', error);

            if (error.message?.includes('User rejected')) {
                throw new Error('Repost rejected by user');
            } else if (error.message?.includes('insufficient')) {
                throw new Error('Insufficient SOL for transaction fees');
            }

            throw new Error(error.message || 'Failed to repost on Solana');
        }
    },

    getCurrentUser: () => CURRENT_USER,
    setCurrentUser: (user: User | null) => { CURRENT_USER = user; },
};
