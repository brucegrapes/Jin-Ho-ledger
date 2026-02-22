'use client';
import { useEffect, useState, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────── */

interface Budget {
  id?: number;
  category: string;
  tag?: string | null;
  amount: number;
  start_date: string;
  end_date: string;
  recurring?: number;
}

interface BudgetStatus {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
}

interface MonthSpending {
  month: string;
  month_label: string;
  spent: number;
  budget: number | null;
}

type BudgetType = 'category' | 'tag';
type ViewTab = 'status' | 'history';

/* ─── Component ─────────────────────────────────────────────────── */

export default function BudgetTracker() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txCategories, setTxCategories] = useState<string[]>([]);
  const [txTags, setTxTags] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState<BudgetType>('category');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [status, setStatus] = useState<BudgetStatus[]>([]);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ── History tab state ── */
  const [viewTab, setViewTab] = useState<ViewTab>('status');
  const [historyCategory, setHistoryCategory] = useState('');
  const [historyTag, setHistoryTag] = useState('');
  const [historyType, setHistoryType] = useState<BudgetType>('category');
  const [historyMonths, setHistoryMonths] = useState(6);
  const [history, setHistory] = useState<MonthSpending[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── Auto-fill dates for recurring ── */
  useEffect(() => {
    if (recurring) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const endDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStart(firstDay);
      setEnd(endDay);
    }
  }, [recurring]);

  /* ─── Data fetching ──────────────────────────────────────────── */

  const fetchBudgets = async () => {
    const res = await fetch('/api/budgets', { credentials: 'include' });
    const data = await res.json();
    setBudgets(data.budgets || []);
  };

  const fetchStatus = async () => {
    const res = await fetch(`/api/budget-status?date=${today}`, { credentials: 'include' });
    const data = await res.json();
    setStatus(data.status || []);
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories', { credentials: 'include' });
    const data = await res.json();
    setTxCategories(data.categories || []);
  };

  const fetchTags = async () => {
    const res = await fetch('/api/tags', { credentials: 'include' });
    const data = await res.json();
    setTxTags(data.tags || []);
  };

  const fetchHistory = useCallback(async (cat: string | null, tag: string | null, months: number) => {
    if (!cat && !tag) return;
    setHistoryLoading(true);
    try {
      const param = tag
        ? `tag=${encodeURIComponent(tag)}`
        : `category=${encodeURIComponent(cat!)}`;
      const res = await fetch(`/api/budget-history?${param}&months=${months}`, { credentials: 'include' });
      const data = await res.json();
      setHistory(data.history || []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchStatus();
    fetchCategories();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* When history tab opens or category/months change, refetch */
  useEffect(() => {
    if (viewTab === 'history') {
      fetchHistory(
        historyType === 'category' ? historyCategory || null : null,
        historyType === 'tag' ? historyTag || null : null,
        historyMonths
      );
    }
  }, [viewTab, historyCategory, historyTag, historyType, historyMonths, fetchHistory]);

  /* Auto-select first budget category/tag for history when switching tabs */
  useEffect(() => {
    if (viewTab === 'history') {
      const cats = Array.from(new Set(budgets.filter(b => !b.tag).map(b => b.category)));
      const tags = Array.from(new Set(budgets.filter(b => b.tag).map(b => b.tag!)));
      if (!historyCategory && cats.length > 0) setHistoryCategory(cats[0]);
      if (!historyTag && tags.length > 0) setHistoryTag(tags[0]);
      // Set default historyType based on what budgets exist
      if (cats.length === 0 && tags.length > 0) setHistoryType('tag');
    }
  }, [viewTab, historyCategory, historyTag, budgets]);

  /* ─── Handlers ───────────────────────────────────────────────── */

  const flash = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAdd = async () => {
    const resolvedCategory = budgetType === 'category'
      ? (category === '__custom__' ? customCategory.trim() : category)
      : '';
    const resolvedTag = budgetType === 'tag' ? selectedTag : null;

    if (budgetType === 'category' && !resolvedCategory) {
      alert('Please select or enter a category');
      return;
    }
    if (budgetType === 'tag' && !resolvedTag) {
      alert('Please select a tag');
      return;
    }
    if (!amount || !start || !end) {
      alert('Please fill in amount and dates');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: resolvedCategory,
          tag: resolvedTag,
          amount: parseFloat(amount),
          start_date: start,
          end_date: end,
          recurring,
        }),
      });
      if (res.ok) {
        flash(recurring ? 'Recurring budget created!' : 'Budget added successfully!');
        setCategory('');
        setCustomCategory('');
        setSelectedTag('');
        setAmount('');
        setStart('');
        setEnd('');
        setRecurring(false);
        fetchBudgets();
        fetchStatus();
        fetchCategories();
        fetchTags();
      }
    } catch (err) {
      console.error('Error adding budget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this budget?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        flash('Budget removed.');
        fetchBudgets();
        fetchStatus();
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Merge categories from transactions with any categories already in budgets
  const allCategories = Array.from(
    new Set([...txCategories, ...budgets.filter(b => !b.tag).map((b) => b.category)].filter(Boolean))
  ).sort();

  const budgetCategories = Array.from(new Set(budgets.filter(b => !b.tag).map(b => b.category))).sort();
  const budgetTags = Array.from(new Set(budgets.filter(b => b.tag).map(b => b.tag!))).sort();

  /* ─── Render helpers ─────────────────────────────────────────── */

  const maxSpent = history.length > 0 ? Math.max(...history.map(h => h.spent), ...(history.map(h => h.budget ?? 0))) : 1;
  const representativeBudget = [...history].reverse().find(h => h.budget !== null)?.budget ?? null;
  const budgetLineY = representativeBudget !== null && maxSpent > 0 ? (representativeBudget / maxSpent) * 180 : null;

  return (
    <div className="space-y-6">
      {/* ── Create Budget Form ─────────────────────────────────── */}
      <div className="bg-surface-muted border border-border-light p-6" style={{ borderRadius: 'var(--radius-md)' }}>
        <h3 className="text-base font-semibold mb-4 text-text-primary flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Budget
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Budget type toggle */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">Budget For</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setBudgetType('category')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  budgetType === 'category' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setBudgetType('tag')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  budgetType === 'tag' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                Tag
              </button>
            </div>
          </div>
          {/* Category or Tag selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              {budgetType === 'category' ? 'Category' : 'Tag'}
            </label>
            {budgetType === 'category' ? (
              <>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="">Select category</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
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
              </>
            ) : (
              <select
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <option value="">Select tag</option>
                {txTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="5000"
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm tabular-nums"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          {/* Start */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">Start Date</label>
            <input
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
              disabled={recurring}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm disabled:opacity-50"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          {/* End */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">End Date</label>
            <input
              type="date"
              value={end}
              onChange={e => setEnd(e.target.value)}
              disabled={recurring}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm disabled:opacity-50"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          {/* Recurring toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm font-medium text-text-secondary">Monthly recurring</span>
            </label>
            {recurring && (
              <p className="text-xs text-text-tertiary mt-1">Auto-creates for each month</p>
            )}
          </div>
          {/* Submit */}
          <div>
            <button
              onClick={handleAdd}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-light text-white px-4 py-2.5 font-medium text-sm disabled:opacity-50 transition-colors interactive-lift"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {isLoading ? 'Adding...' : recurring ? 'Add Recurring' : 'Add Budget'}
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

      {/* ── Tab bar: Status / History ────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-muted rounded-lg w-fit">
        {(['status', 'history'] as ViewTab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setViewTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
              viewTab === t
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'status' ? 'Current Status' : 'Spending History'}
          </button>
        ))}
      </div>

      {/* ── STATUS TAB ──────────────────────────────────────────── */}
      {viewTab === 'status' && (
        <>
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
                  const percentage = s.budget > 0 ? Math.min((s.spent / s.budget) * 100, 100) : 0;
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
        </>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────── */}
      {viewTab === 'history' && (
        <div className="space-y-5">
          {/* Spending History controls */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Type toggle */}
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1">View</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHistoryType('category')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    historyType === 'category' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Category
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryType('tag')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    historyType === 'tag' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tag
                </button>
              </div>
            </div>
            {historyType === 'category' ? (
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Category</label>
                <select
                  value={historyCategory}
                  onChange={e => setHistoryCategory(e.target.value)}
                  className="border border-border bg-surface text-text-primary px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select…</option>
                  {budgetCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Tag</label>
                <select
                  value={historyTag}
                  onChange={e => setHistoryTag(e.target.value)}
                  className="border border-border bg-surface text-text-primary px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select…</option>
                  {budgetTags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1">Months</label>
              <select
                value={historyMonths}
                onChange={e => setHistoryMonths(parseInt(e.target.value))}
                className="border border-border bg-surface text-text-primary px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-primary/20"
              >
                {[3, 6, 9, 12].map(n => (
                  <option key={n} value={n}>Last {n} months</option>
                ))}
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-text-tertiary text-sm">Loading…</div>
          ) : (historyType === 'category' && !historyCategory) || (historyType === 'tag' && !historyTag) ? (
            <div className="bg-surface-muted border border-border-light p-8 text-center text-text-tertiary text-sm" style={{ borderRadius: 'var(--radius-md)' }}>
              Select a {historyType} above to view spending history.
            </div>
          ) : history.length === 0 ? (
            <div className="bg-surface-muted border border-border-light p-8 text-center text-text-tertiary text-sm" style={{ borderRadius: 'var(--radius-md)' }}>
              No transaction data found for <span className="font-medium">{historyType === 'tag' ? historyTag : historyCategory}</span>.
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="trust-card p-6">
                <h3 className="text-sm font-semibold text-text-primary mb-5 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {historyType === 'tag' ? historyTag : historyCategory} — Monthly Spending
                </h3>

                {/* Legend */}
                <div className="flex items-center gap-5 mb-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--primary)' }} /> Spent
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-6 h-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} /> Budget
                  </span>
                </div>

                {/* Amount labels row */}
                <div className="flex gap-2 mb-1">
                  {history.map((h, i) => (
                    <div key={i} className="flex-1 min-w-0 text-center">
                      <span className="text-[10px] tabular-nums text-text-tertiary">
                        ₹{h.spent >= 1000 ? `${(h.spent / 1000).toFixed(1)}k` : h.spent.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars area with spanning budget line */}
                <div className="relative flex gap-2 items-end" style={{ height: 180 }}>
                  {/* Single full-width budget line */}
                  {budgetLineY !== null && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none z-10 flex items-center"
                      style={{ bottom: budgetLineY }}
                    >
                      <div className="flex-1" style={{ height: 2, backgroundColor: 'var(--accent)', borderRadius: 1 }} />
                      <span
                        className="ml-1.5 text-[9px] font-bold tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--accent)' }}
                      >
                        ₹{representativeBudget! >= 1000 ? `${(representativeBudget! / 1000).toFixed(1)}k` : representativeBudget!.toFixed(0)}
                      </span>
                    </div>
                  )}
                  {history.map((h, i) => {
                    const barH = maxSpent > 0 ? (h.spent / maxSpent) * 180 : 0;
                    const overBudget = h.budget !== null && h.spent > h.budget;
                    return (
                      <div key={i} className="flex-1 relative flex justify-center min-w-0" style={{ height: 180 }}>
                        <div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-all duration-300"
                          style={{
                            width: '60%',
                            height: Math.max(barH, 2),
                            backgroundColor: overBudget ? 'var(--error)' : 'var(--primary)',
                            borderRadius: '4px 4px 0 0',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Month labels row */}
                <div className="flex gap-2 mt-1">
                  {history.map((h, i) => (
                    <div key={i} className="flex-1 min-w-0 text-center">
                      <span className="text-[10px] font-medium text-text-tertiary">
                        {h.month_label.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="trust-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted">
                      <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Month</th>
                      <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Spent</th>
                      <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Budget</th>
                      <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const diff = h.budget !== null ? h.budget - h.spent : null;
                      return (
                        <tr key={i} className="border-b border-border-light hover:bg-surface-muted/50 transition-colors">
                          <td className="p-3 font-medium text-text-primary">{h.month_label}</td>
                          <td className="p-3 text-right tabular-nums text-text-primary">₹{h.spent.toFixed(2)}</td>
                          <td className="p-3 text-right tabular-nums text-text-secondary">{h.budget !== null ? `₹${h.budget.toFixed(2)}` : '—'}</td>
                          <td className={`p-3 text-right tabular-nums font-medium ${diff === null ? 'text-text-tertiary' : diff >= 0 ? 'text-accent' : 'text-error'}`}>
                            {diff !== null ? `${diff >= 0 ? '+' : ''}₹${diff.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Average row */}
                  {history.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-surface-muted">
                        <td className="p-3 font-semibold text-text-primary text-xs uppercase tracking-wider">Average</td>
                        <td className="p-3 text-right tabular-nums font-semibold text-text-primary">
                          ₹{(history.reduce((s, h) => s + h.spent, 0) / history.length).toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums text-text-secondary">
                          {history.some(h => h.budget !== null)
                            ? `₹${(history.filter(h => h.budget !== null).reduce((s, h) => s + (h.budget ?? 0), 0) / history.filter(h => h.budget !== null).length).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="p-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── All Budgets Table ──────────────────────────────────── */}
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
                  <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Amount</th>                  <th className="p-3 text-center text-xs font-semibold text-text-tertiary uppercase tracking-wider">Budget For</th>                  <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Start Date</th>
                  <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">End Date</th>
                  <th className="p-3 text-center text-xs font-semibold text-text-tertiary uppercase tracking-wider">Type</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-light hover:bg-surface-muted transition-colors"
                  >
                    <td className="p-3 font-medium text-text-primary">{b.tag || b.category}</td>
                    <td className="p-3 text-right text-text-primary tabular-nums font-medium">₹{b.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{
                          backgroundColor: b.tag ? 'var(--warning-surface)' : 'var(--accent-surface)',
                          color: b.tag ? 'var(--warning)' : 'var(--accent)',
                        }}
                      >
                        {b.tag ? 'Tag' : 'Category'}
                      </span>
                    </td>
                    <td className="p-3 text-text-secondary tabular-nums">{b.start_date}</td>
                    <td className="p-3 text-text-secondary tabular-nums">{b.end_date}</td>
                    <td className="p-3 text-center">
                      {b.recurring ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-surface text-primary">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Recurring
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">One-time</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => b.id !== undefined && handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        className="text-xs font-medium text-error hover:text-error-light transition-colors disabled:opacity-40"
                      >
                        {deletingId === b.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
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
