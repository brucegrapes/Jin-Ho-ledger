'use client';
import { useEffect, useState } from 'react';

interface Budget {
  id?: number;
  category: string;
  amount: number;
  start_date: string;
  end_date: string;
}

interface BudgetStatus {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
}

export default function BudgetTracker() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txCategories, setTxCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<BudgetStatus[]>([]);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchBudgets = async () => {
    const res = await fetch('/api/budgets');
    const data = await res.json();
    setBudgets(data.budgets || []);
  };

  const fetchStatus = async () => {
    const res = await fetch(`/api/budget-status?date=${today}`);
    const data = await res.json();
    setStatus(data.status || []);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setTxCategories(data.categories || []);
  };

  useEffect(() => {
    fetchBudgets();
    fetchStatus();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    const resolvedCategory = category === '__custom__' ? customCategory.trim() : category;
    if (!resolvedCategory || !amount || !start || !end) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: resolvedCategory, amount: parseFloat(amount), start_date: start, end_date: end }),
      });
      if (res.ok) {
        setSuccessMessage('Budget added successfully!');
        setCategory('');
        setCustomCategory('');
        setAmount('');
        setStart('');
        setEnd('');
        fetchBudgets();
        fetchStatus();
        fetchCategories();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error adding budget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Merge categories from transactions with any categories already in budgets
  const allCategories = Array.from(
    new Set([...txCategories, ...budgets.map((b) => b.category)].filter(Boolean))
  ).sort();

  return (
    <div className="space-y-6">
      {/* Add Budget Form */}
      <div className="bg-surface-muted border border-border-light p-6" style={{ borderRadius: 'var(--radius-md)' }}>
        <h3 className="text-base font-semibold mb-4 text-text-primary flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Budget
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <option value="">Select category</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ Custom category…</option>
            </select>
            {category === '__custom__' && (
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Enter category name"
                className="mt-2 w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="5000"
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm tabular-nums"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Start Date
            </label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              End Date
            </label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-light text-white px-4 py-2.5 font-medium text-sm disabled:opacity-50 transition-colors interactive-lift"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {isLoading ? 'Adding...' : 'Add Budget'}
            </button>
          </div>
        </div>
        {successMessage && (
          <div className="mt-4 p-3 bg-accent-surface text-accent border border-accent/20 text-sm font-medium flex items-center gap-2" style={{ borderRadius: 'var(--radius-sm)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}
      </div>

      {/* Today's Budget Status Cards */}
      <div>
        <h3 className="text-base font-semibold mb-4 text-text-primary flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Today&apos;s Budget Status
        </h3>
        {status.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.map((s, i) => {
              const percentage = Math.min((s.spent / s.budget) * 100, 100);
              const isOverBudget = s.remaining < 0;
              return (
                <div
                  key={i}
                  className="trust-card p-5 interactive-lift"
                  style={{
                    borderLeft: `3px solid ${percentage <= 50 ? 'var(--accent)' : percentage <= 80 ? 'var(--warning)' : 'var(--error)'}`,
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-text-primary text-sm">{s.category}</h4>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 tabular-nums"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: percentage <= 50 ? 'var(--accent-surface)' : percentage <= 80 ? 'var(--warning-surface)' : 'var(--error-surface)',
                        color: percentage <= 50 ? 'var(--accent)' : percentage <= 80 ? 'var(--warning)' : 'var(--error)',
                      }}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full bg-surface-muted h-2 overflow-hidden" style={{ borderRadius: '4px' }}>
                      <div
                        className="h-full progress-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: percentage <= 50 ? 'var(--accent)' : percentage <= 80 ? 'var(--warning)' : 'var(--error)',
                        }}
                      />
                    </div>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between text-text-secondary">
                        <span>Spent</span>
                        <span className="font-medium text-text-primary tabular-nums">₹{s.spent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-text-secondary">
                        <span>Budget</span>
                        <span className="font-medium text-text-primary tabular-nums">₹{s.budget.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-border-light">
                        <span className={isOverBudget ? 'text-error' : 'text-accent'}>Remaining</span>
                        <span className={`tabular-nums ${isOverBudget ? 'text-error' : 'text-accent'}`}>₹{s.remaining.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-muted border border-border-light p-8 text-center text-text-tertiary text-sm" style={{ borderRadius: 'var(--radius-md)' }}>
            No active budgets for today. Create one above to get started.
          </div>
        )}
      </div>

      {/* All Budgets Table */}
      {budgets.length > 0 && (
        <div className="trust-card p-6">
          <h3 className="text-base font-semibold mb-4 text-text-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All Budgets
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Category</th>
                  <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Amount</th>
                  <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Start Date</th>
                  <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">End Date</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-light hover:bg-surface-muted transition-colors"
                  >
                    <td className="p-3 font-medium text-text-primary">{b.category}</td>
                    <td className="p-3 text-right text-text-primary tabular-nums font-medium">₹{b.amount.toFixed(2)}</td>
                    <td className="p-3 text-text-secondary tabular-nums">{b.start_date}</td>
                    <td className="p-3 text-text-secondary tabular-nums">{b.end_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
