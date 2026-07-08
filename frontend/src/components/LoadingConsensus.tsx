'use client';

import React from 'react';

interface LoadingConsensusProps {
  stage?: 'submitting' | 'fetching' | 'analyzing' | 'consensus';
  elapsed?: number; // seconds elapsed
}

const STAGES = [
  { key: 'submitting', label: 'Submitting article to blockchain…', icon: '📝' },
  { key: 'fetching',   label: 'AI validators fetching source URLs…', icon: '🌐' },
  { key: 'analyzing',  label: 'LLM analyzing citation accuracy…', icon: '🔍' },
  { key: 'consensus',  label: 'Validators reaching consensus…', icon: '⚡' },
];

export default function LoadingConsensus({ stage = 'fetching', elapsed = 0 }: LoadingConsensusProps) {
  const stageIndex = STAGES.findIndex(s => s.key === stage);
  const current = STAGES[stageIndex] ?? STAGES[1];

  return (
    <div className="consensus-loader animate-in" role="status" aria-live="polite">
      {/* Animated validator nodes */}
      <div style={{ marginBottom: 24 }}>
        <p className="text-xs text-muted" style={{ marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          GenLayer Multi-Validator Consensus
        </p>
        <div className="consensus-orbs" aria-hidden="true">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="consensus-orb" title={`Validator ${i}`} />
          ))}
        </div>
      </div>

      {/* Stage indicator */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '2rem', marginBottom: 8 }}>{current.icon}</p>
        <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
          {current.label}
        </p>
        <p className="text-sm text-muted">
          {stage === 'fetching'
            ? 'Reading source URLs directly from the internet — impossible on standard blockchains'
            : stage === 'analyzing'
            ? 'Checking citation accuracy, context integrity, and AI-generated content signals'
            : stage === 'consensus'
            ? 'Multiple independent validators must agree before the verdict is recorded'
            : 'Transaction being confirmed on GenLayer testnet'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="consensus-progress-track">
        <div className="consensus-progress-fill" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Processing…</span>
        {elapsed > 0 && <span>{elapsed}s elapsed</span>}
      </div>

      {/* Stage steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        marginTop: 24,
        flexWrap: 'wrap',
      }}>
        {STAGES.map((s, i) => (
          <div
            key={s.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              background: i < stageIndex
                ? 'rgba(16, 185, 129, 0.1)'
                : i === stageIndex
                  ? 'rgba(99, 102, 241, 0.15)'
                  : 'rgba(255,255,255,0.03)',
              border: `1px solid ${
                i < stageIndex
                  ? 'rgba(16, 185, 129, 0.2)'
                  : i === stageIndex
                    ? 'rgba(99, 102, 241, 0.3)'
                    : 'rgba(255,255,255,0.06)'
              }`,
              color: i < stageIndex
                ? 'var(--verified)'
                : i === stageIndex
                  ? 'var(--text-accent)'
                  : 'var(--text-muted)',
            }}
          >
            {i < stageIndex ? '✓' : i === stageIndex ? (
              <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }} />
            ) : '○'}
            <span>{s.label.replace('…', '')}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted" style={{ marginTop: 24 }}>
        AI consensus typically takes <strong style={{ color: 'var(--text-secondary)' }}>30–90 seconds</strong>
        {' '}— this is GenLayer reading real URLs and running LLM analysis on-chain.
      </p>
    </div>
  );
}
