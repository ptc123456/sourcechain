'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingConsensus from './LoadingConsensus';
import {
  submitArticle,
  verifyArticle,
  getArticleStatus,
  generateArticleId,
  hashArticle,
  type ArticleStatus,
} from '@/lib/contracts';
import { getWalletAddress, getTxExplorerUrl } from '@/lib/genlayer';

interface SubmitFormProps {
  walletAddress: string | null;
}

type FormStage = 'form' | 'submitting' | 'fetching' | 'analyzing' | 'consensus' | 'done' | 'error';

export default function SubmitForm({ walletAddress }: SubmitFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle]     = useState('');
  const [text, setText]       = useState('');
  const [urls, setUrls]       = useState(['']);
  const [stage, setStage]     = useState<FormStage>('form');
  const [txHash, setTxHash]   = useState('');
  const [verifyTxHash, setVerifyTxHash] = useState('');
  const [finalStatus, setFinalStatus]   = useState<ArticleStatus | null>(null);
  const [errorMsg, setErrorMsg]         = useState('');
  const [articleId, setArticleId]       = useState('');
  const [elapsed, setElapsed]           = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // URL list management
  function addUrl() {
    if (urls.length < 10) setUrls(u => [...u, '']);
  }

  function removeUrl(i: number) {
    setUrls(u => u.filter((_, idx) => idx !== i));
  }

  function updateUrl(i: number, val: string) {
    setUrls(u => u.map((v, idx) => idx === i ? val : v));
  }

  function startElapsedTimer() {
    setElapsed(0);
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    setElapsedTimer(t);
    return t;
  }

  function stopElapsedTimer(t: ReturnType<typeof setInterval> | null) {
    if (t) clearInterval(t);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) {
      setErrorMsg('Please connect your wallet first.');
      setStage('error');
      return;
    }

    const validUrls = urls.filter(u => u.trim().startsWith('http'));
    if (validUrls.length === 0) {
      setErrorMsg('Please add at least one valid source URL (must start with http/https).');
      setStage('error');
      return;
    }
    if (text.trim().length < 50) {
      setErrorMsg('Article text must be at least 50 characters.');
      setStage('error');
      return;
    }

    try {
      // ── Step 1: Submit ───────────────────────────────────
      setStage('submitting');
      const id   = generateArticleId(title, walletAddress);
      const hash = await hashArticle(text);
      setArticleId(id);

      const tx = await submitArticle({
        article_id:      id,
        article_hash:    hash,
        article_title:   title,
        article_text:    text,
        source_urls:     validUrls,
        author_address:  walletAddress,
      });
      setTxHash(tx);

      // ── Step 2: Trigger verification ─────────────────────
      setStage('fetching');
      const timer = startElapsedTimer();

      // Automatically advance UX steps while waiting for real on-chain transaction consensus
      const progressInterval = setInterval(() => {
        setStage(currentStage => {
          if (currentStage === 'fetching') return 'analyzing';
          if (currentStage === 'analyzing') return 'consensus';
          return currentStage;
        });
      }, 8000);

      try {
        const verifyTx = await verifyArticle(id);
        setVerifyTxHash(verifyTx);
      } finally {
        clearInterval(progressInterval);
      }

      // ── Step 3: Complete ─────────────────────────────────
      setStage('consensus');
      const status = await getArticleStatus(id);
      setFinalStatus(status);
      stopElapsedTimer(timer);
      setStage('done');
    } catch (err: unknown) {
      stopElapsedTimer(elapsedTimer);
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setStage('error');
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (stage !== 'form' && stage !== 'error' && stage !== 'done') {
    return (
      <div>
        <LoadingConsensus
          stage={stage as 'submitting' | 'fetching' | 'analyzing' | 'consensus'}
          elapsed={elapsed}
        />
        {txHash && (
          <div className="mt-4 text-center">
            <a
              href={getTxExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-badge"
              id="submit-tx-link"
            >
              🔗 Submit TX: {txHash.slice(0, 12)}…
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (stage === 'done' && finalStatus) {
    const isVerified = finalStatus === 'VERIFIED';
    return (
      <div className="animate-in" style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>
          {isVerified ? '✅' : '❌'}
        </div>
        <h2 style={{ marginBottom: 8 }}>
          <span className={isVerified ? 'text-verified' : 'text-rejected'}>
            {isVerified ? 'Article Verified!' : 'Article Rejected'}
          </span>
        </h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          {isVerified
            ? 'Your article has been verified and added to the SourceChain public record.'
            : 'Your article did not pass the AI verification checks. Review the detailed report.'}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <a
            href={`/article/${articleId}`}
            className="btn btn-primary"
            id="view-article-btn"
          >
            View Full Report →
          </a>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setStage('form');
              setTitle(''); setText(''); setUrls(['']);
              setTxHash(''); setVerifyTxHash(''); setFinalStatus(null);
            }}
            id="submit-another-btn"
          >
            Submit Another
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {txHash && (
            <a href={getTxExplorerUrl(txHash)} target="_blank" rel="noopener noreferrer" className="tx-badge" id="result-submit-tx">
              🔗 Submit TX
            </a>
          )}
          {verifyTxHash && (
            <a href={getTxExplorerUrl(verifyTxHash)} target="_blank" rel="noopener noreferrer" className="tx-badge" id="result-verify-tx">
              🔗 Verify TX
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate id="submit-article-form">
      {stage === 'error' && (
        <div className="error-banner mb-6" role="alert" id="submit-error-banner">
          <span>⚠️</span>
          <div>
            <strong>Error</strong>
            <p style={{ marginTop: 2 }}>{errorMsg}</p>
          </div>
        </div>
      )}

      {!walletAddress && (
        <div className="error-banner mb-6" role="alert">
          <span>🔒</span>
          <p>Connect your wallet before submitting an article.</p>
        </div>
      )}

      {/* Article Title */}
      <div className="form-group">
        <label className="form-label" htmlFor="article-title">Article Title</label>
        <input
          id="article-title"
          type="text"
          className="form-control"
          placeholder="Enter the full article title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      {/* Article Text */}
      <div className="form-group">
        <label className="form-label" htmlFor="article-text">Article Text</label>
        <p className="form-hint">
          Paste the full article or a representative excerpt (min 50 chars).
          The AI will analyze this text against your cited sources.
        </p>
        <textarea
          id="article-text"
          className="form-control"
          placeholder="Paste your article content here…"
          value={text}
          onChange={e => setText(e.target.value)}
          required
          minLength={50}
          style={{ minHeight: 200 }}
        />
        <p className="form-hint" style={{ textAlign: 'right' }}>
          {text.length} chars {text.length < 50 && <span className="text-rejected">(min 50)</span>}
        </p>
      </div>

      {/* Source URLs */}
      <div className="form-group">
        <label className="form-label">Source URLs</label>
        <p className="form-hint">
          Add URLs of your cited sources. The AI will fetch and verify them on-chain.
          Up to 10 URLs; first 3 are analyzed by AI.
        </p>
        <div className="url-list" style={{ marginTop: 8 }}>
          {urls.map((url, i) => (
            <div className="url-item" key={i}>
              <input
                id={`source-url-${i}`}
                type="url"
                className="form-control"
                placeholder={`https://source-${i + 1}.com/article`}
                value={url}
                onChange={e => updateUrl(i, e.target.value)}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  className="url-remove"
                  onClick={() => removeUrl(i)}
                  aria-label={`Remove URL ${i + 1}`}
                  id={`remove-url-${i}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {urls.length < 10 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-4"
            onClick={addUrl}
            id="add-url-btn"
          >
            + Add Source URL
          </button>
        )}
      </div>

      {/* Submit */}
      <div style={{ marginTop: 8 }}>
        <button
          type="submit"
          className="btn btn-primary btn-lg w-full"
          id="submit-btn"
          disabled={!walletAddress || !title || text.length < 50}
        >
          🔍 Submit for AI Verification
        </button>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 12 }}>
          Verification uses GenLayer AI consensus — expect 30–90 seconds.
        </p>
      </div>
    </form>
  );
}
