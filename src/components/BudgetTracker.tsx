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
  const [category, setCategory] = useState('');
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

  useEffect(() => {
    fetchBudgets();
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    if (!category || !amount || !start || !end) {
      alert('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, amount: parseFloat(amount), start_date: start, end_date: end }),
      });
      if (res.ok) {
        setSuccessMessage('Budget added successfully!');
        setCategory('');
        setAmount('');
        setStart('');
        setEnd('');
        fetchBudgets();
        fetchStatus();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error adding budget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage <= 50) return 'bg-green-500';
    if (percentage <= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBgColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage <= 50) return 'bg-green-50 dark:bg-green-900/20';
    if (percentage <= 80) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const categories = Array.from(new Set(budgets.map(b => b.category)));

  return (
    <div className="space-y-6">
      {/* Add Budget Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">➕ Create Budget</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Select or type category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value={category}>{category}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="5000"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Budget'}
            </button>
          </div>
        </div>
        {successMessage && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded">
            ✅ {successMessage}
          </div>
        )}
      </div>

      {/* Today's Budget Status Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">📅 Today&apos;s Budget Status</h3>
        {status.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.map((s, i) => {
              const percentage = Math.min((s.spent / s.budget) * 100, 100);
              const isOverBudget = s.remaining < 0;
              return (
                <div
                  key={i}
                  className={`rounded-lg p-6 shadow-md ${getStatusBgColor(s.spent, s.budget)} border-l-4 ${
                    percentage <= 50
                      ? 'border-green-500'
                      : percentage <= 80
                        ? 'border-yellow-500'
                        : 'border-red-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-black dark:text-white">{s.category}</h4>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-zinc-800">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStatusColor(s.spent, s.budget)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Spent:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">₹{s.spent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Budget:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">₹{s.budget.toFixed(2)}</span>
                      </div>
                      <div
                        className={`flex justify-between font-semibold ${
                          isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        <span>Remaining:</span>
                        <span>₹{s.remaining.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-6 text-center text-gray-600 dark:text-gray-400">
            No active budgets for today. Create one to get started!
          </div>
        )}
      </div>

      {/* All Budgets Table */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">📊 All Budgets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-700">
                  <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Category</th>
                  <th className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Start Date</th>
                  <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">End Date</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{b.category}</td>
                    <td className="p-3 text-right text-gray-900 dark:text-gray-100">₹{b.amount.toFixed(2)}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{b.start_date}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{b.end_date}</td>
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
