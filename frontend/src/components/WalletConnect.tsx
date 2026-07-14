'use client';

import React, { useState } from 'react';
import { useWallet } from '@/components/WalletProvider';
import { shortAddress } from '@/lib/genlayer';

export default function WalletConnect() {
  const { address, isInitializing, isConnecting, connect, disconnect } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  async function handleConnect() {
    try {
      await connect();
    } catch (e) {
      console.error('Wallet connect failed:', e);
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setShowMenu(false);
  }

  if (isInitializing) {
    return (
      <button
        id="wallet-connect-btn"
        className="wallet-btn"
        disabled
        aria-label="Loading wallet connection"
      >
        <span className="spinner" style={{ width: 12, height: 12 }} />
        Loading…
      </button>
    );
  }

  if (!address) {
    return (
      <button
        id="wallet-connect-btn"
        className="wallet-btn"
        onClick={handleConnect}
        disabled={isConnecting}
        aria-label="Connect Wallet"
      >
        <span className="wallet-indicator" />
        {isConnecting ? (
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
