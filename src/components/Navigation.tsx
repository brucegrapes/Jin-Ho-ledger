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
    <nav className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-black dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
            📊 MyLedger
          </h1>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
          >
            Upload
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Hi, {user.username}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
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
