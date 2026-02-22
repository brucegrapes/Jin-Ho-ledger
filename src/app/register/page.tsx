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
    <main className="w-full min-h-screen bg-white dark:bg-black">
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-bold text-center text-black dark:text-white">Register a WebAuthn Key</h1>
        <p className="text-center text-gray-600 dark:text-gray-300">
          Create a biometric or hardware security key credential so you can authenticate securely without passwords.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow">
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
            className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {isLoading ? 'Registering...' : 'Create Credential'}
          </button>
          {status && <p className="text-sm text-center text-red-600 dark:text-red-400">{status}</p>}
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Already registered?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold">
              Login instead
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
