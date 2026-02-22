'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UserSummary {
  username: string;
}

export default function Navigation() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/status', { cache: 'no-store', credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (mounted && data?.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // ignore polling errors
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setMenuOpen(false);
    window.location.reload();
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-surface border-b border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <Link href="/" onClick={closeMenu} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-text-primary group-hover:text-primary transition-colors">
            Monark
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/upload" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
            Upload
          </Link>
          <Link
            href="/security"
            className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Security
          </Link>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-surface flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{user.username.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-text-primary">{user.username}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-text-tertiary hover:text-error transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: user avatar + hamburger */}
        <div className="flex sm:hidden items-center gap-3">
          {user && (
            <div className="w-7 h-7 rounded-full bg-primary-surface flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{user.username.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 text-text-secondary hover:text-primary hover:bg-surface-muted transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-surface px-4 py-3 space-y-1">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-surface transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/upload"
            onClick={closeMenu}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-surface transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload
          </Link>
          <Link
            href="/security"
            onClick={closeMenu}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-surface transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Security
          </Link>

          <div className="border-t border-border my-2" />

          {user ? (
            <>
              <div className="px-3 py-2">
                <p className="text-xs text-text-tertiary">Signed in as</p>
                <p className="text-sm font-semibold text-text-primary">{user.username}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-error hover:bg-error-surface transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2 px-1 pt-1">
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex-1 text-center px-4 py-2.5 border border-border text-sm font-medium text-text-secondary hover:text-primary hover:border-primary transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex-1 text-center px-4 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
