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
      <main className="w-full min-h-screen bg-white dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-6">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50">Secure Uploads</h1>
          <p className="text-base text-gray-600 dark:text-gray-300">
            Upload statements after logging in with your registered WebAuthn credential. This ensures only you can decrypt the transactions stored on the server.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold transition hover:bg-blue-700"
            >
              Login to Upload
            </Link>
            <Link
              href="/register"
              className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 transition hover:border-gray-500"
            >
              Register WebAuthn Key
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-white dark:bg-black">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <UploadClient />
      </div>
    </main>
  );
}
