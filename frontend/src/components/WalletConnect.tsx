'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { checkConnectedWallet, connectWallet, disconnectWallet, shortAddress, fundAccount, setWalletAddress } from '@/lib/genlayer';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundMsg, setFundMsg] = useState('');

  useEffect(() => {
    let active = true;

    async function initWallet() {
      const addr = await checkConnectedWallet();
      if (!active) return;
      setAddress(addr);
      if (addr) {
        onConnect?.(addr);
      } else {
        onDisconnect?.();
      }
    }

    initWallet();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (!active) return;
        if (accounts.length > 0) {
          const newAddr = accounts[0];
          setWalletAddress(newAddr);
          setAddress(newAddr);
          localStorage.setItem('sc_wallet', newAddr);
          onConnect?.(newAddr);
        } else {
          setWalletAddress(null);
          setAddress(null);
          localStorage.removeItem('sc_wallet');
          onDisconnect?.();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        active = false;
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [onConnect, onDisconnect]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      onConnect?.(addr);
    } catch (e) {
      console.error('Wallet connect failed:', e);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    setAddress(null);
    setShowMenu(false);
    onDisconnect?.();
  }

  async function handleFund() {
    if (!address) return;
    setFunding(true);
    setFundMsg('Requesting GEN…');
    try {
      await fundAccount(address, 10);
      setFundMsg('Funded! +10 GEN');
      setTimeout(() => setFundMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setFundMsg('Funding failed');
      setTimeout(() => setFundMsg(''), 3000);
    } finally {
      setFunding(false);
    }
  }

  if (!address) {
    return (
      <button
        id="wallet-connect-btn"
        className="wallet-btn"
        onClick={handleConnect}
        disabled={connecting}
        aria-label="Connect Wallet"
      >
        <span className="wallet-indicator" />
        {connecting ? (
          <>
            <span className="spinner" style={{ width: 12, height: 12 }} />
            Connecting…
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        id="wallet-address-btn"
        className="wallet-btn connected"
        onClick={() => setShowMenu(v => !v)}
        aria-label="Wallet menu"
      >
        <span className="wallet-indicator connected" />
        <span className="font-mono">{shortAddress(address)}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {showMenu && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            minWidth: '200px',
            boxShadow: 'var(--shadow-card)',
            zIndex: 200,
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)' }}>
            <p className="text-xs text-muted" style={{ marginBottom: 2 }}>Connected wallet</p>
            <p className="font-mono text-sm" style={{ wordBreak: 'break-all' }}>{address}</p>
          </div>
          
          <button
            id="wallet-fund-btn"
            onClick={handleFund}
            disabled={funding}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-accent)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            {funding ? 'Requesting…' : fundMsg || 'Request Faucet (10 GEN)'}
          </button>

          <button
            id="wallet-disconnect-btn"
            onClick={handleDisconnect}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--rejected)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
