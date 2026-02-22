import Link from 'next/link';
import HomeDashboard from '../components/HomeDashboard';
import { cookies } from 'next/headers';
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from '@/utils/auth';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = getUserFromSessionToken(token ?? undefined);

  if (!session) {
    return (
      <main className="w-full min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-6 py-28 text-center space-y-8">
          {/* Trust-centered icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-surface flex items-center justify-center" style={{ boxShadow: 'var(--shadow-md)' }}>
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Welcome to Monark Vaulet</h1>
            <p className="text-base text-text-secondary leading-relaxed max-w-md mx-auto">
              Sign in with WebAuthn to access your personal dashboard. Your data is protected with biometric or security-key authentication.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 bg-primary text-white text-sm font-semibold transition-colors hover:bg-primary-light interactive-lift"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 border border-border text-sm font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Create account
            </Link>
          </div>
          <p className="secure-badge justify-center pt-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your data is encrypted before it leaves your device. We cannot see your spending.
          </p>
          <Link href="/security" className="text-xs text-primary hover:text-primary-light transition-colors">
            How security works &rarr;
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-sm text-text-tertiary mt-1">Your financial overview at a glance</p>
          </div>
          <span className="secure-badge">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your data is encrypted before it leaves your device
          </span>
        </div>
        <HomeDashboard />
      </div>
    </main>
  );
}
