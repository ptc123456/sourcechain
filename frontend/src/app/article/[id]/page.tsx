'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import VerificationReport from '@/components/VerificationReport';
import { getVerification, type ArticleVerification, REGISTRY_ADDRESS } from '@/lib/contracts';
import { shortAddress } from '@/lib/genlayer';

// Demo data for unconfigured deployments
const DEMO_DATA: Record<string, ArticleVerification> = {
  'demo-001': {
    article_id: 'demo-001',
    article_title: 'Record Arctic Ice Melt Confirmed by Multiple Research Institutions',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor123456789ABCDEF',
    verified: true,
    article_hash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    verification: {
      source_accuracy: 0.92,
      context_integrity: true,
      ai_generated_risk: 0.15,
      verdict: 'VERIFIED',
      reason: 'All cited facts confirmed in NASA and NSIDC sources. Clear human authorship detected.',
      issues_found: [],
      sources_checked: 3,
      sources_ok: 3,
    },
  },
};

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;

  const [data, setData]       = useState<ArticleVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function load() {
      if (!REGISTRY_ADDRESS) {
        const demo = DEMO_DATA[articleId];
        if (demo) {
          setData(demo);
        } else {
          setError('Article not found');
        }
        setLoading(false);
        return;
      }

      try {
        const result = await getVerification(articleId);
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    }

    if (articleId) load();
  }, [articleId]);

  if (loading) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ height: 40, width: 200, marginBottom: 32 }} className="skeleton" />
          <div style={{ height: 300 }} className="skeleton" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 760, textAlign: 'center' }}>
          <p style={{ fontSize: '3rem' }}>🔍</p>
          <h1 style={{ margin: '16px 0 8px', fontSize: '2rem' }}>Article Not Found</h1>
          <p className="text-muted" style={{ marginBottom: 24 }}>{error || 'This article ID does not exist on-chain.'}</p>
          <Link href="/" className="btn btn-secondary" id="not-found-back-btn">← Back to Feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        {/* Breadcrumb */}
        <div className="animate-in" style={{ marginBottom: 32, display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Feed</Link>
          <span>/</span>
          <span className="truncate" style={{ maxWidth: 300 }}>{data.article_title}</span>
        </div>

        {/* Title */}
        <div className="animate-in" style={{ marginBottom: 32 }}>
          <h1 style={{ marginBottom: 12 }}>{data.article_title || data.article_id}</h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.875rem' }}>
            <span className="text-muted">
              By <span className="font-mono">{shortAddress(data.author_address)}</span>
            </span>
            {data.status === 'VERIFIED' && (
              <span className="badge badge-verified">✓ On-Chain Verified</span>
            )}
            {data.status === 'REJECTED' && (
              <span className="badge badge-rejected">✗ Rejected</span>
            )}
            {data.status === 'CHALLENGED' && (
              <span className="badge badge-challenged">⚑ Challenged</span>
            )}
          </div>
        </div>

        {/* Verification Report */}
        <div className="animate-in animate-in-delay-1" style={{ marginBottom: 32 }}>
          <VerificationReport verification={data} />
        </div>

        {/* Challenge button — only for VERIFIED articles */}
        {data.status === 'VERIFIED' && (
          <div
            className="animate-in animate-in-delay-2"
            style={{
              padding: '24px',
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Spotted a Problem?</p>
              <p className="text-sm text-muted">
                If you have evidence this article is inaccurate, submit a challenge.
                A successful challenge earns a reward from the author&apos;s stake.
              </p>
            </div>
            <Link
              href={`/challenge/${data.article_id}`}
              className="btn btn-danger btn-sm"
              id="challenge-article-btn"
            >
              ⚑ Challenge This Article
            </Link>
          </div>
        )}

        {/* Back */}
        <div className="animate-in" style={{ marginTop: 32 }}>
          <Link href="/" className="btn btn-ghost btn-sm" id="back-to-feed-btn">
            ← Back to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
