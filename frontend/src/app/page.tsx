'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getAllVerified, getVerification, getSubmissionCount, type ArticleVerification } from '@/lib/contracts';
import { REGISTRY_ADDRESS } from '@/lib/contracts';

// ── Mock data for when contracts not configured ───────────────────────────────
const MOCK_ARTICLES: ArticleVerification[] = [
  {
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
  {
    article_id: 'demo-002',
    article_title: 'New COVID Variant Study: What the Data Really Shows',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor987654321FEDCBA',
    verified: true,
    article_hash: 'sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    verification: {
      source_accuracy: 0.88,
      context_integrity: true,
      ai_generated_risk: 0.22,
      verdict: 'VERIFIED',
      reason: 'WHO and peer-reviewed sources support all key claims. Some speculative framing noted.',
      issues_found: ['Minor speculative framing in conclusion section'],
      sources_checked: 2,
      sources_ok: 2,
    },
  },
  {
    article_id: 'demo-003',
    article_title: 'Tech Giant Earnings Report: Breaking Down the Actual Numbers',
    status: 'VERIFIED',
    author_address: '0xDemoAuthor555666777888ABC',
    verified: true,
    article_hash: 'sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    verification: {
      source_accuracy: 0.95,
      context_integrity: true,
      ai_generated_risk: 0.08,
      verdict: 'VERIFIED',
      reason: 'Official SEC filings and company press releases confirm all financial figures.',
      issues_found: [],
      sources_checked: 3,
      sources_ok: 3,
    },
  },
];

export default function HomePage() {
  const [articles, setArticles]     = useState<ArticleVerification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [count, setCount]           = useState(0);
  const [isDemo, setIsDemo]         = useState(false);

  useEffect(() => {
    async function load() {
      if (!REGISTRY_ADDRESS) {
        setArticles([]);
        setCount(0);
        setIsDemo(true);
        setLoading(false);
        return;
      }

      try {
        const [ids, total] = await Promise.all([
          getAllVerified(),
          getSubmissionCount(),
        ]);
        setCount(total);

        // Fetch verification data for each article (up to 20)
        const limited = ids.slice(0, 20);
        const results = await Promise.allSettled(
          limited.map(id => getVerification(id))
        );

        const verified = results
          .filter((r): r is PromiseFulfilledResult<ArticleVerification> => r.status === 'fulfilled')
          .map(r => r.value);

        setArticles(verified);
      } catch (err) {
        console.error('Feed load error:', err);
        setArticles([]);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const verifiedCount = articles.filter(a => a.status === 'VERIFIED').length;

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="hero section" style={{ padding: '80px 0 40px 0' }}>
        <div className="container grid-2" style={{ alignItems: 'center', textAlign: 'left', gap: 48 }}>
          <div className="hero-content">
            <div className="hero-badge animate-in">
              <span className="dot" />
              Powered by GenLayer AI Consensus
            </div>

            <h1 className="animate-in animate-in-delay-1" style={{ margin: '0 0 16px 0', textAlign: 'left' }}>
              Journalism That&apos;s{' '}
              <span className="gradient-text">Impossible to Fake</span>
            </h1>

            <p className="animate-in animate-in-delay-2" style={{ margin: '0 0 36px 0', textAlign: 'left', maxWidth: 'none' }}>
              SourceChain verifies every citation in real-time — fetching source URLs directly
              on the blockchain, running LLM fact-checking, and recording immutable verdicts.
              No trusted third party. No compromise.
            </p>

            <div className="hero-actions animate-in animate-in-delay-3" style={{ justifyContent: 'flex-start' }}>
              <Link href="/submit" className="btn btn-primary btn-lg" id="hero-submit-btn">
                🔍 Verify Your Article
              </Link>
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-lg"
                id="hero-genlayer-btn"
              >
                What is GenLayer?
              </a>
            </div>
          </div>

          {/* Floating Validation Card Mockup */}
          <div className="hero-visual animate-in animate-in-delay-2" style={{ position: 'relative' }}>
            <div className="card card-body" style={{ border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-hover)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="badge badge-verified">✓ Active Audit</span>
                <span className="mono" style={{ color: 'var(--text-accent)', fontSize: '0.75rem' }}>Node #12_Validator</span>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: 8 }} className="mono">
                  <span style={{ fontWeight: 600 }}>url_render() consensus</span>
                  <span className="text-verified">SUCCESS (3/3 votes)</span>
                </div>
                <pre className="mono" style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {`GET https://nasa.gov/arctic-ice-2026\n=> Status: 200 OK\n=> SHA256 matches on-chain submit_hash`}
                </pre>
              </div>

              <div className="score-meter" style={{ marginBottom: 12 }}>
                <div className="score-label">
                  <span>Source Citation Match</span>
                  <span className="text-verified" style={{ fontWeight: 'bold' }}>95%</span>
                </div>
                <div className="score-track">
                  <div className="score-fill good" style={{ width: '95%' }} />
                </div>
              </div>

              <div className="score-meter">
                <div className="score-label">
                  <span>AI Hallucination Risk</span>
                  <span className="text-verified" style={{ fontWeight: 'bold' }}>8%</span>
                </div>
                <div className="score-track">
                  <div className="score-fill good" style={{ width: '8%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="container">
          <div className="stats-strip animate-in" style={{ marginTop: 64 }}>
            <div className="stat-item">
              <div className="stat-value gradient-text">{verifiedCount}</div>
              <div className="stat-label">Articles Verified</div>
            </div>
            <div className="stat-item">
              <div className="stat-value gradient-text">{count}</div>
              <div className="stat-label">Total Submissions</div>
            </div>
            <div className="stat-item">
              <div className="stat-value gradient-text">3+</div>
              <div className="stat-label">Validators / Article</div>
            </div>
            <div className="stat-item">
              <div className="stat-value gradient-text">0</div>
              <div className="stat-label">Trusted 3rd Parties</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Features Section ──────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-title">Why GenLayer Changes Everything</p>
            <h2>Only GenLayer Can Do This</h2>
          </div>

          <div className="bento-grid">
            {/* Cell 1: Spans 7 columns */}
            <div className="card card-body bento-cell-large animate-in animate-in-delay-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>🌐</div>
              <h3 style={{ marginBottom: 12, fontSize: '1.25rem' }}>Decentralized Live URL Fetching</h3>
              <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
                Reads and renders actual source URLs from the internet directly during smart contract execution. 
                GenLayer validators use WASI secure sandboxes to reach consensus on real-time web content, 
                completely bypassing the limitations of traditional deterministic blockchains.
              </p>
            </div>

            {/* Cell 2: Spans 5 columns */}
            <div className="card card-body bento-cell-medium animate-in animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>🤖</div>
              <h3 style={{ marginBottom: 12, fontSize: '1.25rem' }}>On-Chain LLM Semantic Verdicts</h3>
              <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
                Executes secure prompt-consensus cycles inside the contract validation phase. 
                Compares article claims semantically against web evidence, detecting context manipulations 
                and AI-generated hallucination threats instantly.
              </p>
            </div>

            {/* Cell 3: Spans 12 columns (Full-width details) */}
            <div className="card card-body bento-cell-full animate-in animate-in-delay-3" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚡</div>
                  <h3 style={{ marginBottom: 12, fontSize: '1.25rem' }}>No-Trust Consensus Verification Pipeline</h3>
                  <p className="text-sm text-secondary" style={{ lineHeight: 1.6, marginBottom: 16 }}>
                    Instead of relying on a single validator, GenLayer selects multiple validator nodes to perform the audit in parallel. 
                    Verdicts are recorded permanently to the blockchain ledger only after validator nodes match consensus bounds.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }} className="mono">
                    <span className="badge badge-verified">No central control</span>
                    <span className="badge badge-verified">Immutable records</span>
                  </div>
                </div>
                <div style={{ flex: '1 1 320px', background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
                  <div className="mono text-[10px]" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-accent)', marginBottom: 12 }}>
                    <span>VALIDATOR MATRIX CONSENSUS</span>
                    <span className="animate-pulse">● ACTIVE</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="mono text-xs">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Validator Node #1</span>
                      <span className="text-verified">✓ AGREE (verified)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Validator Node #2</span>
                      <span className="text-verified">✓ AGREE (verified)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Validator Node #3</span>
                      <span className="text-verified">✓ AGREE (verified)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Verified Feed ────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 32,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <p className="section-title">Verified Feed</p>
              <h2>On-Chain Verified Articles</h2>
            </div>
            <Link href="/submit" className="btn btn-primary btn-sm" id="feed-submit-btn">
              Submit Yours →
            </Link>
          </div>

          {isDemo && (
            <div className="success-banner mb-6" role="note" id="demo-banner">
              <span>ℹ️</span>
              <p>
                Demo mode: no contract is configured, so {MOCK_ARTICLES.length} sample records are hidden rather than presented as on-chain evidence. Add deployed contract
                addresses to <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8em' }}>.env.local</code> to load verified data.
              </p>
            </div>
          )}

          {loading ? (
            <div className="grid-3">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div
              className="card card-body"
              style={{ textAlign: 'center', padding: '64px 32px' }}
              id="empty-feed"
            >
              <p style={{ fontSize: '3rem', marginBottom: 16 }}>📰</p>
              <h3 style={{ marginBottom: 8 }}>No verified articles yet</h3>
              <p className="text-muted" style={{ marginBottom: 24 }}>
                Be the first to submit and verify an article on SourceChain.
              </p>
              <Link href="/submit" className="btn btn-primary" id="empty-feed-submit-btn">
                Submit the First Article
              </Link>
            </div>
          ) : (
            <div className="grid-3">
              {articles.map((article, i) => (
                <ArticleCard key={article.article_id} verification={article} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 'var(--radius-xl)',
              padding: '56px 40px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ marginBottom: 16 }}>
              Ready to Prove Your Article is Real?
            </h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto 32px', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Submit your article and let GenLayer&apos;s AI validators verify every citation
              against live sources. Get an immutable on-chain verification record.
            </p>
            <Link href="/submit" className="btn btn-primary btn-lg" id="cta-submit-btn">
              🚀 Get Verified Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
