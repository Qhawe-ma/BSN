import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, SendOptions } from '@solana/web3.js';

// Public mainnet keeps the app usable when no RPC is configured.
// A keyed Helius URL belongs in VITE_HELIUS_RPC_URL, never in source.
const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PREMIUM_PAYMENT_ADDRESS = import.meta.env.VITE_PREMIUM_PAYMENT_ADDRESS;

export const connection = new Connection(HELIUS_RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
});

export const getSolBalance = async (publicKey: PublicKey): Promise<number> => {
    try {
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return 0;
    }
};

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

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: recipientPubkey,
                lamports,
            })
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromWallet.publicKey;

        const signed = await fromWallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        } as SendOptions);

        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        return signature;
    } catch (error: any) {
        console.error('Error sending premium payment:', error);
        throw new Error(error.message || 'Failed to send premium payment');
    }
};

export const SolanaService = {
    connection,
    getSolBalance,
    sendPremiumPayment,
};
