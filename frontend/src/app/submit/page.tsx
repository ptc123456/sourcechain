'use client';

import React, { useState, useEffect } from 'react';
import SubmitForm from '@/components/SubmitForm';
import { checkConnectedWallet, setWalletAddress as setGlobalWalletAddress } from '@/lib/genlayer';

export default function SubmitPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initWallet() {
      const addr = await checkConnectedWallet();
      if (!active) return;
      setWalletAddress(addr);
    }

    initWallet();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (!active) return;
        const newAddr = accounts[0] || null;
        setGlobalWalletAddress(newAddr);
        setWalletAddress(newAddr);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        active = false;
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="animate-in" style={{ textAlign: 'center', marginBottom: 48 }}>
          <p className="section-title">Verification Request</p>
          <h1>
            Submit for{' '}
            <span className="gradient-text">AI Verification</span>
          </h1>
          <p className="text-muted" style={{ marginTop: 16, fontSize: '1.05rem', lineHeight: 1.7 }}>
            GenLayer&apos;s AI validators will fetch your source URLs directly from the internet,
            analyze citation accuracy, detect AI-generated content, and record an immutable
            verdict on-chain.
          </p>
        </div>

        {/* Info cards */}
        <div
          className="animate-in animate-in-delay-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 40,
          }}
        >
          {[
            { icon: '🌐', text: 'Sources fetched live' },
            { icon: '🤖', text: 'AI citation analysis' },
            { icon: '⛓', text: 'On-chain verdict' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 12px',
                textAlign: 'center',
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.icon}</div>
              {item.text}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div
          className="card card-body animate-in animate-in-delay-2"
          style={{ padding: '32px' }}
        >
          <SubmitForm walletAddress={walletAddress} />
        </div>

        {/* Verification criteria */}
        <div
          className="animate-in animate-in-delay-3"
          style={{
            marginTop: 24,
            padding: '20px 24px',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p className="section-title" style={{ marginBottom: 12 }}>Verification Criteria</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Source Accuracy', value: '≥ 70%', ok: true },
              { label: 'Context Integrity', value: 'Must be intact', ok: true },
              { label: 'AI-Generated Risk', value: '≤ 60%', ok: true },
            ].map((c, i) => (
              <div key={i} style={{ fontSize: '0.825rem' }}>
                <span className="text-muted">{c.label}: </span>
                <strong style={{ color: 'var(--text-accent)' }}>{c.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
