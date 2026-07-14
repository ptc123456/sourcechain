'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletConnect from './WalletConnect';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/',          label: 'Feed' },
    { href: '/submit',    label: 'Submit Article' },
  ];

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo" id="logo-link">
          <div className="logo-icon" aria-hidden="true">SC</div>
          <span>
            Source<span className="gradient-text">Chain</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="navbar-links" role="list">
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname === l.href ? 'active' : ''}
                aria-current={pathname === l.href ? 'page' : undefined}
                id={`nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Wallet + mobile toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <WalletConnect />

          {/* Mobile burger */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '4px',
            }}
            className="navbar-mobile-show"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          style={{
            borderTop: '1px solid var(--glass-border)',
            padding: '8px 24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '10px 0',
                color: pathname === l.href ? 'var(--text-accent)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
