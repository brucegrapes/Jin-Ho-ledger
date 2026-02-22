'use client';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      setStatus('Please provide a username.');
      return;
    }

    setIsLoading(true);
    setStatus('');
    try {
      const optionsResponse = await fetch('/api/auth/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.error || 'Unable to start authentication');
      }

      const options = await optionsResponse.json();
      const credential = await startAuthentication({ optionsJSON: options });

      const verifyResponse = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Authentication failed');
      }

      router.push('/');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary-surface flex items-center justify-center mb-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Authenticate with your biometric key or security token.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="trust-card p-6 space-y-5">
          <label className="block text-sm font-medium text-text-secondary">
            Username
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1.5 block w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 font-semibold text-sm hover:bg-primary-light disabled:opacity-60 transition-colors interactive-lift"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            {isLoading ? 'Authenticating...' : 'Sign in'}
          </button>
          {status && (
            <div className="p-3 bg-error-surface text-error text-sm text-center font-medium" style={{ borderRadius: 'var(--radius-sm)' }}>
              {status}
            </div>
          )}
          <p className="text-sm text-center text-text-tertiary">
            Need to register a credential?{' '}
            <Link href="/register" className="text-primary font-semibold hover:text-primary-light transition-colors">
              Create one now
            </Link>
          </p>
        </form>
        <p className="secure-badge justify-center mt-6">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Passwordless authentication
        </p>
      </div>
    </main>
  );
}
