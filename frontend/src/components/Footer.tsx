import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>⛓ SourceChain</span>
          <span className="text-muted">·</span>
          <span className="text-muted">Built on</span>
          <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer">
            GenLayer
          </a>
          <span className="text-muted">·</span>
          <Link href="/submit">Submit Article</Link>
          <span className="text-muted">·</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <p className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 480, margin: '0 auto' }}>
          SourceChain ceases to exist without GenLayer — no other blockchain can fetch live URLs,
          run LLM analysis, and record an immutable verdict without a trusted third party.
        </p>
      </div>
    </footer>
  );
}
