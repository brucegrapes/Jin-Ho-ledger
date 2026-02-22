'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UserSummary {
  username: string;
}

export default function Navigation() {
  const [user, setUser] = useState<UserSummary | null>(null);

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
    window.location.reload();
  };

  return (
    <nav className="bg-surface border-b border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-text-primary group-hover:text-primary transition-colors">
            Monark
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            Upload
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
              <Link
                href="/login"
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
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
      </div>
    </nav>
  );
}
