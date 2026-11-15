import React, { FC, ReactNode, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletError } from '@solana/wallet-adapter-base';

import '@solana/wallet-adapter-react-ui/styles.css';

// Injected after the adapter stylesheet, which sets its own border radius.
const walletButtonStyles = `
  .wallet-button-rounded,
  .wallet-button-rounded *,
  .wallet-button-rounded button,
  .wallet-button-rounded .wallet-adapter-button,
  .wallet-adapter-button-trigger.wallet-button-rounded button,
  .wallet-adapter-button-trigger.wallet-button-rounded .wallet-adapter-button,
  .wallet-adapter-button-trigger.wallet-button-rounded > *,
  .wallet-adapter-button-trigger.wallet-button-rounded > button,
  .wallet-adapter-button-trigger.wallet-button-rounded .wallet-adapter-dropdown button {
    border-radius: 9999px !important;
    -webkit-border-radius: 9999px !important;
    -moz-border-radius: 9999px !important;
  }
  
  .wallet-button-rounded button,
  .wallet-button-rounded .wallet-adapter-button,
  .wallet-button-rounded [class*="wallet"],
  .wallet-button-rounded [class*="button"],
  .wallet-button-rounded .wallet-adapter-dropdown button {
    border-radius: 9999px !important;
    border-top-left-radius: 9999px !important;
    border-top-right-radius: 9999px !important;
    border-bottom-left-radius: 9999px !important;
    border-bottom-right-radius: 9999px !important;
    -webkit-border-radius: 9999px !important;
    -moz-border-radius: 9999px !important;
  }
  
  /* Mobile-specific overrides */
  @media (max-width: 768px) {
    .wallet-button-rounded,
    .wallet-button-rounded button,
    .wallet-button-rounded .wallet-adapter-button,
    .wallet-adapter-button-trigger.wallet-button-rounded button,
    .wallet-adapter-button-trigger.wallet-button-rounded .wallet-adapter-button,
    .wallet-adapter-button-trigger.wallet-button-rounded .wallet-adapter-dropdown button {
      border-radius: 9999px !important;
      -webkit-border-radius: 9999px !important;
      -moz-border-radius: 9999px !important;
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = walletButtonStyles;
  document.head.appendChild(styleSheet);
}

const HELIUS_RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new TorusWalletAdapter(),
            new LedgerWalletAdapter(),
        ],
        []
    );

    const onError = useCallback((error: WalletError) => {
        // Auto-connect failures are noisy and not actionable. The user can connect manually.
        if (error.name !== 'WalletConnectionError' || !error.message.includes('Unexpected error')) {
            console.warn('Wallet adapter error:', error);
        }
    }, []);

    return (
        <ConnectionProvider endpoint={HELIUS_RPC_URL}>
            <WalletProvider 
                wallets={wallets} 
                autoConnect={false}
                onError={onError}
            >
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
