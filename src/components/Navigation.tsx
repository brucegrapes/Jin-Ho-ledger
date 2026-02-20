import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-black dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
            📊 MyLedger
          </h1>
        </Link>
        <div className="flex gap-6">
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
        </div>
      </div>
    </nav>
  );
}
