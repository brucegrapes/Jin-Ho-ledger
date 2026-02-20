"use client";
import dynamic from 'next/dynamic';
import DeleteDataButton from './DeleteDataButton';

const SpendingReport = dynamic(() => import('../components/SpendingReport'), { ssr: false });
const BudgetTracker = dynamic(() => import('../components/BudgetTracker'), { ssr: false });

export default function HomeDashboard() {
  return (
    <>
      <section className="mb-8 w-full">
        <h2 className="text-xl font-semibold mb-2">📊 Spending Report</h2>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
          <SpendingReport />
        </div>
      </section>
      <section className="mb-8 w-full">
        <h2 className="text-xl font-semibold mb-2">💰 Budget & Tracking</h2>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4">
          <BudgetTracker />
        </div>
      </section>
      <section className="w-full bg-white dark:bg-zinc-900 rounded p-4">
        <DeleteDataButton />
      </section>
    </>
  );
}
