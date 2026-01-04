import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, SendOptions } from '@solana/web3.js';

// Get Helius RPC URL from environment
const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=06a14782-5204-4c28-9164-9ca1511202ec'; // Fallback to a working public Helius RPC
const PREMIUM_PAYMENT_ADDRESS = import.meta.env.VITE_PREMIUM_PAYMENT_ADDRESS;

// Create Solana connection with Helius RPC
export const connection = new Connection(HELIUS_RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
});

console.log('🔗 Solana connection initialized with Helius RPC:', HELIUS_RPC_URL);

/**
 * Get SOL balance for a wallet address
 */
export const getSolBalance = async (publicKey: PublicKey): Promise<number> => {
    try {
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return 0;
    }
};

/**
 * Send SOL to premium payment address
 * @param fromWallet - Wallet adapter instance
 * @param amountSol - Amount in SOL (default 0.05)
 * @returns Transaction signature
 */
export const sendPremiumPayment = async (
    fromWallet: any,
    amountSol: number = 0.05
): Promise<string> => {
    if (!PREMIUM_PAYMENT_ADDRESS) {
        throw new Error('Premium payment address not configured');
    }

    if (!fromWallet.publicKey) {
        throw new Error('Wallet not connected');
    }

    try {
        const recipientPubkey = new PublicKey(PREMIUM_PAYMENT_ADDRESS);
        const lamports = amountSol * LAMPORTS_PER_SOL;

        // Create transfer instruction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: recipientPubkey,
                lamports,
            })
        );

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromWallet.publicKey;

        console.log(`💸 Sending ${amountSol} SOL to ${PREMIUM_PAYMENT_ADDRESS}...`);

        // Sign and send transaction
        const signed = await fromWallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        } as SendOptions);

        console.log('📡 Transaction sent:', signature);

        // Confirm transaction
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        console.log('✅ Premium payment confirmed:', signature);
        return signature;
    } catch (error: any) {
        console.error('Error sending premium payment:', error);
        throw new Error(error.message || 'Failed to send premium payment');
    }
};

/**
 * Format Solana address for display
 */
export const formatSolanaAddress = (address: string): string => {
    if (address.length < 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

/**
 * Validate Solana address
 */
export const isValidSolanaAddress = (address: string): boolean => {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
};

/**
 * Get transaction details
 */
export const getTransaction = async (signature: string) => {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
        return tx;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
};

/**
 * Get recent transactions for an address
 */
export const getRecentTransactions = async (publicKey: PublicKey, limit: number = 10) => {
    try {
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
        return signatures;
    } catch (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
    }
};

export const SolanaService = {
    connection,
    getSolBalance,
    sendPremiumPayment,
    formatSolanaAddress,
    isValidSolanaAddress,
    getTransaction,
    getRecentTransactions,
};
