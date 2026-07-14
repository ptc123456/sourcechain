'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingConsensus from '@/components/LoadingConsensus';
import { challengeArticle, getVerification, type ArticleVerification, REGISTRY_ADDRESS } from '@/lib/contracts';
import { loadStoredWallet, getTxExplorerUrl } from '@/lib/genlayer';

type ChallengeStage = 'form' | 'processing' | 'done' | 'error';

export default function ChallengePage() {
  const params   = useParams<{ id: string }>();
  const articleId = params.id;

  const [article, setArticle]         = useState<ArticleVerification | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [walletAddress, setWalletAddress]   = useState<string | null>(null);

  const [evidenceUrl, setEvidenceUrl]       = useState('');
  const [stage, setStage]                   = useState<ChallengeStage>('form');
  const [txHash, setTxHash]                 = useState('');
  const [challengeVerdict, setChallengeVerdict] = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const [elapsed, setElapsed]               = useState(0);

  useEffect(() => {
    const addr = loadStoredWallet();
    setWalletAddress(addr);
  }, []);

  useEffect(() => {
    async function loadArticle() {
      if (!REGISTRY_ADDRESS) {
        setArticle({
          article_id: articleId,
          article_title: 'Demo Article (Challenge Mode)',
          status: 'VERIFIED',
          author_address: '0xDemoAuthor123456',
          verified: true,
          verification: {
            source_accuracy: 0.85,
            context_integrity: true,
            ai_generated_risk: 0.2,
            verdict: 'VERIFIED',
            reason: 'Demo verification result.',
            issues_found: [],
          },
        });
        setLoadingArticle(false);
        return;
      }

      try {
        const data = await getVerification(articleId);
        if (data.status !== 'VERIFIED') {
          setErrorMsg(`Only VERIFIED articles can be challenged. Status: ${data.status}`);
          setStage('error');
        }
        setArticle(data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load article');
        setStage('error');
      } finally {
        setLoadingArticle(false);
      }
    }

    if (articleId) loadArticle();
  }, [articleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletAddress) {
      setErrorMsg('Please connect your wallet first.');
      setStage('error');
      return;
    }
    if (!evidenceUrl.startsWith('http')) {
      setErrorMsg('Please enter a valid evidence URL starting with http/https.');
      setStage('error');
      return;
    }

    try {
      setStage('processing');
      setElapsed(0);
      const timer = setInterval(() => setElapsed(e => e + 1), 1000);

      try {
        const tx = await challengeArticle(articleId, walletAddress, evidenceUrl);
        setTxHash(tx);

        const updated = await getVerification(articleId);
        if (updated.status === 'CHALLENGED') {
          setChallengeVerdict('CHALLENGE_UPHELD');
        } else {
          setChallengeVerdict('CHALLENGE_REJECTED');
        }
      } finally {
        clearInterval(timer);
      }

      setStage('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Challenge failed');
      setStage('error');
    }
  }

  if (loadingArticle) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div style={{ height: 300 }} className="skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        {/* Breadcrumb */}
        <div className="animate-in" style={{ marginBottom: 32, display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Feed</Link>
          <span>/</span>
          <Link href={`/article/${articleId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Article
          </Link>
          <span>/</span>
          <span>Challenge</span>
        </div>

        {/* Header */}
        <div className="animate-in" style={{ marginBottom: 40 }}>
          <h1 style={{ marginBottom: 12 }}>
            Challenge{' '}
            <span className="gradient-text">This Article</span>
          </h1>
          <p className="text-muted" style={{ lineHeight: 1.7 }}>
            Submit evidence that contradicts this verified article. GenLayer&apos;s AI will
            re-evaluate with your new source. A successful challenge earns a reward.
          </p>
          {article && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <p className="text-xs text-muted">Challenging article:</p>
              <p style={{ fontWeight: 600 }}>{article.article_title}</p>
            </div>
          )}
        </div>

        {/* Loading state */}
        {stage === 'processing' && (
          <LoadingConsensus stage="analyzing" elapsed={elapsed} />
        )}

        {/* Done state */}
        {stage === 'done' && (
          <div className="animate-in" style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>
              {challengeVerdict === 'CHALLENGE_UPHELD' ? '⚑' : '✅'}
            </div>
            <h2 style={{ marginBottom: 8 }}>
              {challengeVerdict === 'CHALLENGE_UPHELD' ? (
                <span className="text-challenged">Challenge Upheld!</span>
              ) : (
                <span className="text-verified">Challenge Rejected</span>
              )}
            </h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              {challengeVerdict === 'CHALLENGE_UPHELD'
                ? 'Your evidence was credible. The article has been marked as CHALLENGED. A reward has been credited from the author\'s stake.'
                : 'The AI determined your evidence does not sufficiently contradict the original article.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/article/${articleId}`} className="btn btn-secondary" id="view-updated-article-btn">
                View Updated Article
              </Link>
              <Link href="/" className="btn btn-ghost" id="back-home-btn">
                ← Home
              </Link>
            </div>
            {txHash && (
              <div style={{ marginTop: 16 }}>
                <a href={getTxExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer" className="tx-badge" id="challenge-tx-link">
                  🔗 Challenge TX: {txHash.slice(0, 14)}…
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {stage === 'error' && (
          <div className="error-banner mb-6" role="alert" id="challenge-error">
            <span>⚠️</span>
            <div>
              <strong>Error</strong>
              <p style={{ marginTop: 2 }}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Challenge form */}
        {stage !== 'processing' && stage !== 'done' && (
          <form onSubmit={handleSubmit} className="animate-in animate-in-delay-1" id="challenge-form">
            <div className="card card-body">
              {!walletAddress && (
                <div className="error-banner mb-6" role="alert">
                  <span>🔒</span>
                  <p>Connect your wallet to submit a challenge.</p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="evidence-url">Evidence URL</label>
                <p className="form-hint">
                  A URL that directly contradicts or disproves claims in the original article.
                  The AI will fetch this URL and compare it against the article.
                </p>
                <input
                  id="evidence-url"
                  type="url"
                  className="form-control"
                  placeholder="https://credible-source.com/contradicting-evidence"
                  value={evidenceUrl}
                  onChange={e => setEvidenceUrl(e.target.value)}
                  required
                  style={{ marginTop: 8 }}
                />
              </div>

              {/* Warning */}
              <div
                style={{
                  padding: '14px 16px',
                  background: 'rgba(245,158,11,0.07)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 24,
                }}
              >
                <strong style={{ color: 'var(--challenged)' }}>⚠ Note:</strong> Only submit
                challenges backed by credible evidence. Frivolous challenges may result in
                a penalty to your own stake.
              </div>

              <button
                type="submit"
                className="btn btn-danger w-full"
                id="submit-challenge-btn"
                disabled={!walletAddress || !evidenceUrl}
              >
                ⚑ Submit Challenge
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
