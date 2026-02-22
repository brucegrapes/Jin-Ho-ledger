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
    <main className="w-full min-h-screen bg-white dark:bg-black">
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center text-black dark:text-white">Login with WebAuthn</h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
          Authenticate with your biometric key or security token to unlock the dashboard.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Username
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
          {status && <p className="text-sm text-center text-red-600 dark:text-red-400">{status}</p>}
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Need to register a credential?{' '}
            <Link href="/register" className="text-blue-600 dark:text-blue-400 font-semibold">
              Create one now
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
