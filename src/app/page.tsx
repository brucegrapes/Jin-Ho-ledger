

import DashboardClient from '../components/DashboardClient';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-8 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-zinc-50">MyLedger Dashboard</h1>
        <DashboardClient />
      </main>
    </div>
  );
}
