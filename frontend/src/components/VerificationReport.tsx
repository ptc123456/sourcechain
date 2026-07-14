'use client';

import React from 'react';
import type { ArticleVerification } from '@/lib/contracts';
import { shortAddress, getTxExplorerUrl } from '@/lib/genlayer';

interface VerificationReportProps {
  verification: ArticleVerification;
  txHash?: string;
}

function ScoreBox({
  value,
  label,
  invert = false,
}: {
  value: number;
  label: string;
  invert?: boolean;
}) {
  const pct = Math.round(value * 100);
  // For AI risk: low is good (inverted)
  const isGood = invert ? pct <= 30 : pct >= 70;
  const isMid  = invert ? pct <= 60 : pct >= 40;

  const color = isGood
    ? 'var(--verified)'
    : isMid
      ? 'var(--challenged)'
      : 'var(--rejected)';

  return (
    <div className="score-box">
      <div className="score-box-value" style={{ color }}>
        {pct}%
      </div>
      <div className="score-box-label">{label}</div>
    </div>
  );
}

export default function VerificationReport({ verification, txHash }: VerificationReportProps) {
  const { article_id, status, author_address, verification: v, article_hash } = verification;

  if (!v) {
    return (
      <div className="report-card">
        <p className="text-muted text-sm">No verification result available yet.</p>
      </div>
    );
  }

  const verdictClass = status === 'VERIFIED' ? 'verified' : status === 'CHALLENGED' ? 'challenged' : 'rejected';
  const verdictIcon  = status === 'VERIFIED' ? '✅' : status === 'CHALLENGED' ? '⚑' : '❌';
  const verdictLabel = status === 'VERIFIED' ? 'VERIFIED' : status === 'CHALLENGED' ? 'CHALLENGED' : 'REJECTED';

  const accuracyPct = Math.round(v.source_accuracy * 100);
  const aiRiskPct   = Math.round(v.ai_generated_risk * 100);

  const accuracyClass = accuracyPct >= 80 ? 'good' : accuracyPct >= 50 ? 'mid' : 'bad';
  const aiRiskClass   = aiRiskPct  <= 30 ? 'good' : aiRiskPct  <= 60 ? 'mid' : 'bad';

  return (
    <div className="report-card animate-in">
      {/* Verdict Header */}
      <div className={`report-verdict ${verdictClass}`}>
        <span className="verdict-icon">{verdictIcon}</span>
        <div>
          <div className="verdict-title">{verdictLabel}</div>
          <div className="verdict-reason">{v.reason}</div>
        </div>
      </div>

      {/* Score Grid */}
      <div className="scores-grid mb-6">
        <ScoreBox value={v.source_accuracy}    label="Source Accuracy" />
        <ScoreBox value={v.ai_generated_risk}  label="AI Risk"  invert />
        <div className="score-box">
          <div
            className="score-box-value"
            style={{ color: v.context_integrity ? 'var(--verified)' : 'var(--rejected)' }}
          >
            {v.context_integrity ? 'INTACT' : 'BROKEN'}
          </div>
          <div className="score-box-label">Context Integrity</div>
        </div>
      </div>

      {/* Score Meters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div className="score-meter">
          <div className="score-label">
            <span>Source Accuracy</span>
            <span>{accuracyPct}% — must be ≥70% for VERIFIED</span>
          </div>
          <div className="score-track">
            <div className={`score-fill ${accuracyClass}`} style={{ width: `${accuracyPct}%` }} />
          </div>
        </div>
        <div className="score-meter">
          <div className="score-label">
            <span>AI-Generated Content Risk</span>
            <span>{aiRiskPct}% — must be ≤60% for VERIFIED</span>
          </div>
          <div className="score-track">
            <div className={`score-fill ${aiRiskClass}`} style={{ width: `${aiRiskPct}%` }} />
          </div>
        </div>
      </div>

      {/* Sources Checked */}
      {v.sources_checked !== undefined && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            marginBottom: 20,
            fontSize: '0.875rem',
          }}
        >
          <div>
            <span className="text-muted">Sources Fetched: </span>
            <strong>{v.sources_ok ?? 0}/{v.sources_checked}</strong>
          </div>
          <div>
            <span className="text-muted">Context Integrity: </span>
            <strong style={{ color: v.context_integrity ? 'var(--verified)' : 'var(--rejected)' }}>
              {v.context_integrity ? 'OK' : 'Violated'}
            </strong>
          </div>
        </div>
      )}

      {/* Issues Found */}
      {v.issues_found && v.issues_found.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Issues Detected</p>
          <ul className="issues-list">
            {v.issues_found.map((issue, i) => (
              <li key={i} className="issue-item">
                <span className="issue-dot" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Challenge result */}
      {v.challenge && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(245, 158, 11, 0.07)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
          }}
        >
          <p style={{ fontWeight: 700, color: 'var(--challenged)', marginBottom: 8, fontSize: '0.875rem' }}>
            ⚑ Community Challenge Filed
          </p>
          <p className="text-sm text-muted">
            Verdict: <strong style={{ color: 'var(--text-primary)' }}>
              {v.challenge.challenge_result.challenge_verdict}
            </strong>
          </p>
          <p className="text-sm text-muted">{v.challenge.challenge_result.reason}</p>
        </div>
      )}

      {/* On-chain metadata */}
      <div className="divider" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
        <p className="section-title">On-Chain Record</p>
        {article_hash && (
          <div className="flex gap-2 items-center">
            <span className="text-muted">Content Hash:</span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {article_hash}
            </span>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <span className="text-muted">Author:</span>
          <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            {shortAddress(author_address)}
          </span>
        </div>
        {txHash && (
          <div className="flex gap-2 items-center">
            <span className="text-muted">Transaction:</span>
            <a
              href={getTxExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-badge"
              id={`tx-link-${article_id}`}
            >
              🔗 {txHash.slice(0, 12)}…{txHash.slice(-6)}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
