import HomeDashboard from '../components/HomeDashboard';

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-10 text-black dark:text-zinc-50">Dashboard</h1>
        <HomeDashboard />
      </div>
    </main>
  );
}
