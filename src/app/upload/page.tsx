import Link from 'next/link';
import UploadClient from '@/components/UploadClient';
import { cookies } from 'next/headers';
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from '@/utils/auth';

export default async function UploadPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = getUserFromSessionToken(token ?? undefined);

  if (!session) {
    return (
      <main className="w-full min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-6 py-28 text-center space-y-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-surface flex items-center justify-center" style={{ boxShadow: 'var(--shadow-md)' }}>
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Secure Uploads</h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
              Upload statements after logging in with your registered WebAuthn credential. Only you can decrypt the stored transactions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-5 py-3 bg-primary text-white text-sm font-semibold transition-colors hover:bg-primary-light interactive-lift"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Sign in to Upload
            </Link>
            <Link
              href="/register"
              className="px-5 py-3 border border-border text-sm font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Register Key
            </Link>
          </div>
          <p className="secure-badge justify-center pt-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            End-to-end encrypted
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10 sm:px-8">
        <UploadClient />
      </div>
    </main>
  );
}
