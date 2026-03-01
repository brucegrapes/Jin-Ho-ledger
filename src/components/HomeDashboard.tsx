"use client";
import dynamic from 'next/dynamic';
import DeleteDataButton from './DeleteDataButton';
import InsightsPanel from './InsightsPanel';

const SpendingReport = dynamic(() => import('../components/SpendingReport'), { ssr: false });
const BudgetTracker = dynamic(() => import('../components/BudgetTracker'), { ssr: false });

export default function HomeDashboard() {
  return (
    <div className="space-y-8">
      {/* Budget & Tracking Section */}
      <section className="trust-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Budget & Tracking
          </h2>
        </div>
        <BudgetTracker />
      </section>

      {/* Spending Report Section */}
      <section className="trust-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Spending Report
          </h2>
          <span className="secure-badge">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            We cannot see your spending.
          </span>
        </div>
        <SpendingReport />
      </section>

      {/* AI Insights Section */}
      <InsightsPanel />

      {/* Danger Zone */}
      <section className="trust-card p-6">
        <DeleteDataButton />
      </section>
    </div>
  );
}
