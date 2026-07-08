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
        setArticles(MOCK_ARTICLES);
        setCount(MOCK_ARTICLES.length);
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
        setArticles(MOCK_ARTICLES);
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
      <section className="hero section">
        <div className="container">
          <div className="hero-badge animate-in">
            <span className="dot" />
            Powered by GenLayer AI Consensus
          </div>

          <h1 className="animate-in animate-in-delay-1">
            Journalism That&apos;s{' '}
            <span className="gradient-text">Impossible to Fake</span>
          </h1>

          <p className="animate-in animate-in-delay-2">
            SourceChain verifies every citation in real-time — fetching source URLs directly
            on the blockchain, running LLM fact-checking, and recording immutable verdicts.
            No trusted third party. No compromise.
          </p>

          <div className="hero-actions animate-in animate-in-delay-3">
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

          {/* Stats */}
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

      {/* ── How it works ────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="section-title">Why GenLayer Changes Everything</p>
            <h2>Only GenLayer Can Do This</h2>
          </div>
          <div className="grid-3">
            {[
              {
                icon: '🌐',
                title: 'Live URL Fetching',
                desc: 'Reads actual source URLs from the internet during contract execution. Ethereum cannot do this.',
              },
              {
                icon: '🤖',
                title: 'On-Chain LLM Analysis',
                desc: 'Runs semantic citation analysis using exec_prompt — comparing article claims to real source content.',
              },
              {
                icon: '⚡',
                title: 'Consensus Verdicts',
                desc: 'Multiple validators independently verify and must agree. No single point of manipulation.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`card card-body animate-in animate-in-delay-${i + 1}`}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>{item.title}</h3>
                <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
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
                Demo mode — no contract configured. Deploy to testnet and add your contract
                addresses to <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8em' }}>.env.local</code> to see real data.
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
