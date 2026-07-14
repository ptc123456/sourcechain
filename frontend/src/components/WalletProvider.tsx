'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectWallet, disconnectWallet, setWalletAddress } from '@/lib/genlayer';

interface WalletContextValue {
  address: string | null;
  isInitializing: boolean;
  isConnecting: boolean;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [address, setAddressState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Sync state helper
  const updateAddress = useCallback((addr: string | null) => {
    setAddressState(addr);
    setWalletAddress(addr);
  }, []);

  // Initial provider check (non-popup)
  useEffect(() => {
    let active = true;

    async function checkInitialConnection() {
      if (typeof window === 'undefined' || !window.ethereum) {
        if (active) {
          updateAddress(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (active) {
          if (accounts && accounts.length > 0) {
            const activeAcc = accounts[0];
            updateAddress(activeAcc);
            localStorage.setItem('sc_wallet', activeAcc);
          } else {
            updateAddress(null);
            localStorage.removeItem('sc_wallet');
          }
        }
      } catch (err) {
        console.error('Initial eth_accounts check failed:', err);
        if (active) {
          updateAddress(null);
          localStorage.removeItem('sc_wallet');
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }

    checkInitialConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (!active) return;
        if (accounts.length > 0) {
          const newAddr = accounts[0];
          updateAddress(newAddr);
          localStorage.setItem('sc_wallet', newAddr);
        } else {
          updateAddress(null);
          localStorage.removeItem('sc_wallet');
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        active = false;
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }

    return () => {
      active = false;
    };
  }, [updateAddress]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Ethereum wallet extension detected. Please install MetaMask or another compatible wallet.');
    }

    setIsConnecting(true);
    try {
      const addr = await connectWallet();
      updateAddress(addr);
      return addr;
    } catch (err) {
      console.error('Wallet connect request failed:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [updateAddress]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (err) {
      console.warn('Vercel disconnect action error:', err);
    } finally {
      updateAddress(null);
    }
  }, [updateAddress]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isInitializing,
        isConnecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
