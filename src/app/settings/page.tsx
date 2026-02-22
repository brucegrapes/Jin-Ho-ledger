import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserFromSessionToken, SESSION_COOKIE_NAME } from '@/utils/auth';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = getUserFromSessionToken(token ?? undefined);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10 sm:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure how transactions are categorised and tagged during import.
          </p>
        </div>
        <SettingsClient />
      </div>
    </main>
  );
}
