'use client';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      setStatus('Username cannot be empty');
      return;
    }

    setIsLoading(true);
    setStatus('');
    try {
      const optionsResponse = await fetch('/api/auth/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        throw new Error(error.error || 'Unable to start registration');
      }

      const options = await optionsResponse.json();
      console.log('Registration options received:', options);
      const credential = await startRegistration({
        optionsJSON: options,
      });

      const verifyResponse = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'Registration failed');
      }

      router.push('/');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-accent-surface flex items-center justify-center mb-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Create your credential</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Register a biometric or hardware security key for passwordless authentication.
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
            className="w-full bg-accent text-white py-2.5 font-semibold text-sm hover:bg-accent-light disabled:opacity-60 transition-colors interactive-lift"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            {isLoading ? 'Registering...' : 'Create Credential'}
          </button>
          {status && (
            <div className="p-3 bg-error-surface text-error text-sm text-center font-medium" style={{ borderRadius: 'var(--radius-sm)' }}>
              {status}
            </div>
          )}
          <p className="text-sm text-center text-text-tertiary">
            Already registered?{' '}
            <Link href="/login" className="text-primary font-semibold hover:text-primary-light transition-colors">
              Sign in instead
            </Link>
          </p>
        </form>
        <p className="secure-badge justify-center mt-6">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          WebAuthn FIDO2 standard
        </p>
      </div>
    </main>
  );
}
