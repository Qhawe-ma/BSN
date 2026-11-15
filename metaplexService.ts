import * as MetaplexSDK from '@metaplex-foundation/js';
// Handle CJS/ESM interop for Vite alias
const { Metaplex, walletAdapterIdentity } = (MetaplexSDK as any).default || MetaplexSDK;
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection, getSolBalance } from './solanaService';
import { IPFSService } from './ipfsService';

// Metadata is uploaded through Pinata before the mint, so Metaplex storage is unused.
export const createMetaplex = (wallet: any) => {
    const metaplex = Metaplex.make(connection, { cluster: 'mainnet-beta' })
        .use(walletAdapterIdentity(wallet));

    return metaplex;
};

export const mintPostNFT = async (
    wallet: any,
    content: string,
    imageUrl?: string
): Promise<{
    mintAddress: string;
    metadataUri: string;
    signature: string;
}> => {
    try {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (!wallet.signTransaction || !wallet.signAllTransactions) {
            throw new Error('Wallet adapter missing required signing methods');
        }

        // Ensure publicKey is a PublicKey object
        const ownerPublicKey = wallet.publicKey instanceof PublicKey 
            ? wallet.publicKey 
            : new PublicKey(wallet.publicKey);

        // Check balance before attempting mint (standard NFT requires ~0.015 SOL minimum)
        const MINIMUM_SOL_REQUIRED = 0.02; // ~0.015 for rent + buffer
        const balance = await getSolBalance(ownerPublicKey);
        
        console.log('Minting post as NFT with Metaplex...');
        console.log('Wallet publicKey:', ownerPublicKey.toString());
        console.log(`Current balance: ${balance.toFixed(4)} SOL`);

        if (balance < MINIMUM_SOL_REQUIRED) {
            const needed = (MINIMUM_SOL_REQUIRED - balance).toFixed(4);
            throw new Error(
                `Insufficient SOL balance. You have ${balance.toFixed(4)} SOL, but need at least ${MINIMUM_SOL_REQUIRED.toFixed(4)} SOL to mint an NFT. Please add ${needed} SOL to your wallet.`
            );
        }

        // Create Metaplex instance
        const metaplex = createMetaplex(wallet);

        // Prepare metadata object
        const metadata = {
            name: `SSN Post ${Date.now()}`,
            description: content.substring(0, 200), // First 200 chars
            image: imageUrl || '',
            attributes: [
                {
                    trait_type: 'Content',
                    value: content,
                },
                {
                    trait_type: 'Timestamp',
                    value: Date.now().toString(),
                },
                {
                    trait_type: 'Platform',
                    value: 'SSN - Solana Social Network',
                },
            ],
            properties: {
                files: imageUrl ? [
                    {
                        uri: imageUrl,
                        type: 'image/png',
                    },
                ] : [],
                category: 'image',
            },
        };

        console.log('Uploading metadata to Pinata/IPFS...', metadata);

        // Manually upload metadata to Pinata (IPFS)
        const ipfsHash = await IPFSService.uploadMetadata(metadata as any);
        const metadataUri = IPFSService.getIPFSUrl(ipfsHash);

        console.log('Metadata uploaded to:', metadataUri);

        // Mint NFT using the pre-uploaded metadata URI
        // Using optimized settings for cost efficiency:
        // - isMutable: false (saves on rent)
        // - maxSupply: 1 (single edition, cheaper)
        // - sellerFeeBasisPoints: 0 (no royalties, simpler)
        const { nft, response } = await metaplex.nfts().create({
            uri: metadataUri,
            name: metadata.name,
            sellerFeeBasisPoints: 0, // No royalties (cheaper)
            symbol: 'SSNPOST',
            creators: [
                {
                    address: ownerPublicKey,
                    share: 100,
                },
            ],
            tokenOwner: ownerPublicKey, // Explicitly set token owner
            isMutable: false, // Immutable posts (saves rent)
            maxSupply: 1, // Only one copy (cheaper than collection)
        });

        console.log('Post NFT minted successfully!');
        console.log('Mint Address:', nft.address.toString());
        console.log('Metadata URI:', nft.uri);
        console.log('Transaction:', response.signature);

        return {
            mintAddress: nft.address.toString(),
            metadataUri: nft.uri,
            signature: response.signature,
        };
    } catch (error: any) {
        console.error('Error minting post NFT:', error);
        
        // Parse error for better user messages
        const errorMessage = error.message || error.toString() || 'Failed to mint post as NFT';
        
        // Check for insufficient funds error
        if (errorMessage.includes('insufficient') || errorMessage.includes('lamports')) {
            // Try to extract amounts from error
            const lamportsMatch = errorMessage.match(/insufficient lamports (\d+), need (\d+)/i);
            if (lamportsMatch) {
                const have = parseInt(lamportsMatch[1]) / LAMPORTS_PER_SOL;
                const need = parseInt(lamportsMatch[2]) / LAMPORTS_PER_SOL;
                const required = (need - have).toFixed(4);
                throw new Error(
                    `Insufficient SOL balance. You have ${have.toFixed(4)} SOL, but need ${need.toFixed(4)} SOL to mint this NFT. Please add at least ${required} SOL to your wallet.`
                );
            }
            
            // Generic insufficient funds message
            if (errorMessage.toLowerCase().includes('insufficient')) {
                throw new Error(
                    'Insufficient SOL balance. You need at least 0.02 SOL to mint an NFT. Please add SOL to your wallet and try again.'
                );
            }
        }
        
        // Check for user rejection
        if (errorMessage.includes('User rejected') || errorMessage.includes('user reject')) {
            throw new Error('Transaction was cancelled. Please try again when ready.');
        }
        
        // Re-throw with original message if it's already user-friendly
        throw new Error(errorMessage);
    }
};

export const MetaplexService = {
    createMetaplex,
    mintPostNFT,
};
