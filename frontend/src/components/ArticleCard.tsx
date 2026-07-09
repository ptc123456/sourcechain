'use client';

import React from 'react';
import Link from 'next/link';
import type { ArticleVerification } from '@/lib/contracts';
import { shortAddress } from '@/lib/genlayer';

interface ArticleCardProps {
  verification: ArticleVerification;
  animate?: boolean;
  index?: number;
}

export default function ArticleCard({ verification, animate = true, index = 0 }: ArticleCardProps) {
  const { article_id, article_title, status, author_address, verified, verification: v } = verification;

  const getStatusBadge = () => {
    switch (status) {
      case 'VERIFIED':
        return <span className="badge badge-verified">✓ Verified</span>;
      case 'REJECTED':
        return <span className="badge badge-rejected">✗ Rejected</span>;
      case 'CHALLENGED':
        return <span className="badge badge-challenged">✦ Challenged</span>;
      case 'PENDING':
        return <span className="badge badge-pending">● Pending</span>;
      default:
        return null;
    }
  };

  const accuracyPct = v ? Math.round(v.source_accuracy * 100) : 0;
  const aiRiskPct   = v ? Math.round(v.ai_generated_risk * 100) : 0;

  const accuracyClass = accuracyPct >= 80 ? 'good' : accuracyPct >= 50 ? 'mid' : 'bad';
  const aiRiskClass   = aiRiskPct  <= 30 ? 'good' : aiRiskPct  <= 60 ? 'mid' : 'bad';

  const displayTitle = article_title || article_id;

  return (
    <Link
      href={`/article/${article_id}`}
      className={`article-card ${animate ? `animate-in animate-in-delay-${Math.min(index + 1, 3)}` : ''}`}
      id={`article-card-${article_id}`}
      aria-label={`View article: ${displayTitle}`}
    >
      <div className="article-card-header">
        <h3 className="article-card-title">{displayTitle}</h3>
        {getStatusBadge()}
      </div>

      <div className="article-card-meta">
        <span title={author_address}>
          By {shortAddress(author_address)}
        </span>
        {v && (
          <>
            <span>·</span>
            <span>{v.sources_checked ?? 0} sources</span>
          </>
        )}
        {status === 'VERIFIED' && (
          <>
            <span>·</span>
            <span className="text-verified">On-chain ✓</span>
          </>
        )}
      </div>

      {v && verified && (
        <div className="article-card-scores">
          <div className="score-meter">
            <div className="score-label">
              <span>Source Accuracy</span>
              <span className={accuracyClass === 'good' ? 'text-verified' : accuracyClass === 'bad' ? 'text-rejected' : 'text-muted'}>
                {accuracyPct}%
              </span>
            </div>
            <div className="score-track">
              <div
                className={`score-fill ${accuracyClass}`}
                style={{ width: `${accuracyPct}%` }}
              />
            </div>
          </div>

          <div className="score-meter">
            <div className="score-label">
              <span>AI Risk</span>
              <span className={aiRiskClass === 'good' ? 'text-verified' : aiRiskClass === 'bad' ? 'text-rejected' : 'text-muted'}>
                {aiRiskPct}%
              </span>
            </div>
            <div className="score-track">
              <div
                className={`score-fill ${aiRiskClass}`}
                style={{ width: `${aiRiskPct}%` }}
              />
            </div>
          </div>

          {v.reason && (
            <p className="text-xs text-muted" style={{ marginTop: 8, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {v.reason}
            </p>
          )}
        </div>
      )}

      {status === 'PENDING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          <span className="spinner" />
          Awaiting AI verification…
        </div>
      )}
    </Link>
  );
}
