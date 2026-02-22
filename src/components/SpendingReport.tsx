'use client';

import { useEffect, useState, useMemo } from 'react';
import { compareDates } from '@/utils/dateParser';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Transaction {
  date: string;
  description: string;
  category: string;
  type: string;
  tags: string[];
  amount: number;
  reference_number?: string | null;
}

interface CategorySummary {
  name: string;
  value: number;
  color: string;
}

interface DailySummary {
  date: string;
  income: number;
  expense: number;
}

const categoryColors: Record<string, string> = {
  Coffee: '#7C6144',
  Food: '#C75B3F',
  Shopping: '#B85C8A',
  Transfers: '#1F4E79',
  Investments: '#B8922E',
  Utilities: '#A8324A',
  Salary: '#2E7D32',
  Entertainment: '#C74080',
  Personal: '#5A6577',
  Uncategorized: '#8896A6',
};

export default function SpendingReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Chart data
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedChart, setExpandedChart] = useState<'category' | 'daily' | 'cumulative' | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      const transactions = (data.transactions || []).map((t: any) => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : []),
      }));
      setTransactions(transactions);

      // Set default date range to this month
      if (transactions && transactions.length > 0) {
        const dates = transactions.map((t: Transaction) => new Date(t.date));
        const minDate = new Date(Math.min(...(dates.map((d: Date) => d.getTime()) as number[])));
        const maxDate = new Date(Math.max(...(dates.map((d: Date) => d.getTime()) as number[])));
        setStartDate(minDate.toISOString().split('T')[0]);
        setEndDate(maxDate.toISOString().split('T')[0]);
      }
    };
    fetchData();
  }, []);

  // Update filters on dependency changes
  useEffect(() => {
    const filtered = transactions.filter(t => {
      const tDate = new Date(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && tDate < start) return false;
      if (end && tDate > end) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false;
      if (selectedTags.length > 0 && !t.tags.some(tag => selectedTags.includes(tag))) return false;
      if (minAmount && Math.abs(t.amount) < parseFloat(minAmount)) return false;
      if (maxAmount && Math.abs(t.amount) > parseFloat(maxAmount)) return false;
      if (searchText && !t.description.toLowerCase().includes(searchText.toLowerCase())) return false;

      return true;
    });

    // Sort
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let compareVal = 0;
      if (sortBy === 'date') {
        compareVal = compareDates(a.date, b.date);
      } else if (sortBy === 'amount') {
        compareVal = Math.abs(a.amount) - Math.abs(b.amount);
      } else if (sortBy === 'category') {
        compareVal = a.category.localeCompare(b.category);
      }
      return sortOrder === 'asc' ? compareVal : -compareVal;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setFilteredTransactions(sorted);
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, startDate, endDate, selectedCategories, selectedTypes, selectedTags, minAmount, maxAmount, searchText, sortBy, sortOrder]);

  // Calculate summaries
  useEffect(() => {
    const categoryMap = new Map<string, number>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    filteredTransactions.forEach(t => {
      const category = t.category || 'Uncategorized';
      const amount = t.amount;

      // Category summary
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);

      // Daily summary
      const dateKey = t.date;
      const dailyData = dailyMap.get(dateKey) || { income: 0, expense: 0 };
      if (amount > 0) {
        dailyData.income += amount;
      } else {
        dailyData.expense += Math.abs(amount);
      }
      dailyMap.set(dateKey, dailyData);
    });

    // Format category summary
    const categories = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name] || '#666',
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    setCategorySummary(categories);

    // Format daily summary
    const daily = Array.from(dailyMap.entries())
      .map(([date, { income, expense }]) => ({
        date,
        income,
        expense,
      }))
      .sort((a, b) => compareDates(a.date, b.date));

    setDailySummary(daily);
  }, [filteredTransactions]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category))).sort();
  }, [transactions]);

  const allTypes = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.type))).sort();
  }, [transactions]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => {
      t.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [transactions]);

  const totalIncome = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedTypes.length +
    selectedTags.length +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (searchText ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards — "Where am I?" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Total Transactions</div>
          <div className="text-2xl font-semibold text-text-primary mt-2 tabular-nums">{filteredTransactions.length}</div>
        </div>
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Income</div>
          <div className="text-2xl font-semibold text-accent mt-2 tabular-nums">₹{totalIncome.toFixed(2)}</div>
        </div>
        <div className="trust-card p-5 interactive-lift" style={{ borderLeft: '3px solid var(--error)' }}>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Expenses</div>
          <div className="text-2xl font-semibold text-error mt-2 tabular-nums">₹{totalExpense.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters — "What can I do?" */}
      <div className="trust-card">
        <button
          type="button"
          onClick={() => setFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-muted transition-colors"
          style={{ borderRadius: filtersOpen ? '0' : 'inherit' }}
        >
          <span className="text-base font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span
                className="ml-1 px-2 py-0.5 bg-primary text-white text-xs font-semibold"
                style={{ borderRadius: '999px' }}
              >
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {filtersOpen && (
        <div className="px-5 pb-5 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
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
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Min Amount
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={e => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm tabular-nums"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">
              Max Amount
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={e => setMaxAmount(e.target.value)}
              placeholder="100000"
              className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm tabular-nums"
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5 text-text-secondary">
            Search Description
          </label>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search transactions..."
            className="w-full border border-border bg-surface text-text-primary px-3 py-2.5 text-sm"
            style={{ borderRadius: 'var(--radius-sm)' }}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-primary text-white'
                    : 'bg-surface-muted text-text-secondary hover:text-primary hover:bg-primary-surface'
                }`}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            Transaction Types
          </label>
          <div className="flex flex-wrap gap-2">
            {allTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-primary text-white'
                    : 'bg-surface-muted text-text-secondary hover:text-primary hover:bg-primary-surface'
                }`}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {allTags.length > 0 ? (
              allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-surface-muted text-text-secondary hover:text-primary hover:bg-primary-surface'
                  }`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {tag}
                </button>
              ))
            ) : (
              <p className="text-sm text-text-tertiary">No tags available</p>
            )}
          </div>
        </div>
        </div>
        )}
      </div>

      {/* Charts — "What happened?" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        {categorySummary.length > 0 && (
          <div className="trust-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-text-primary">Spending by Category</h3>
              <button
                onClick={() => setExpandedChart('category')}
                className="p-2 hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
                title="Expand chart"
              >
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12-4h4v4M6 18h4v-4m12 4h-4v-4" />
                </svg>
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySummary.map(c => ({ ...c, value: Math.abs(c.value) }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily Bar Chart */}
        {dailySummary.length > 0 && (
          <div className="trust-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-text-primary">Daily Income vs Expense</h3>
              <button
                onClick={() => setExpandedChart('daily')}
                className="p-2 hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
                title="Expand chart"
              >
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12-4h4v4M6 18h4v-4m12 4h-4v-4" />
                </svg>
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="income" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--error)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Spending Line Chart */}
        {dailySummary.length > 0 && (
          <div className="trust-card p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-text-primary">Cumulative Spending Trend</h3>
              <button
                onClick={() => setExpandedChart('cumulative')}
                className="p-2 hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
                title="Expand chart"
              >
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12-4h4v4M6 18h4v-4m12 4h-4v-4" />
                </svg>
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dailySummary.map((d, i, arr) => ({
                  ...d,
                  cumulative: arr.slice(0, i + 1).reduce((sum, x) => sum + x.expense, 0),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--primary)', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="trust-card p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Transactions
          </h3>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
              className="border border-border bg-surface text-text-primary px-3 py-1.5 text-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="category">Sort by Category</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-border bg-surface text-text-primary px-3 py-1.5 text-sm hover:bg-surface-muted transition-colors"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Desktop table — fixed layout, no horizontal scroll */}
        <div className="hidden sm:block">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '42%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Date</th>
                <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Description</th>
                <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Reference</th>
                <th className="p-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider">Category</th>
                <th className="p-3 text-right text-xs font-semibold text-text-tertiary uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((t, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedTx(t)}
                      className="border-b border-border-light hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-text-primary tabular-nums text-sm whitespace-nowrap">{t.date}</td>
                      <td className="p-3 max-w-0">
                        <p className="text-text-primary text-sm truncate">{t.description}</p>
                      </td>
                      <td className="p-3 max-w-0">
                        <span className="block truncate text-text-secondary font-mono text-xs bg-surface-muted px-2 py-1" style={{ borderRadius: '4px' }}>
                          {t.reference_number ? t.reference_number : '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2.5 py-1 text-white text-xs font-medium"
                          style={{ backgroundColor: categoryColors[t.category] || '#5A6577', borderRadius: 'var(--radius-sm)' }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td
                        className={`p-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                          t.amount > 0 ? 'text-accent' : 'text-error'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-tertiary">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden">
          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTransactions
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedTx(t)}
                    className="w-full flex items-start justify-between gap-3 py-3.5 px-1 text-left hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary tabular-nums">{t.date}</span>
                        <span
                          className="px-2 py-0.5 text-white text-xs font-medium"
                          style={{ backgroundColor: categoryColors[t.category] || '#5A6577', borderRadius: '4px' }}
                        >
                          {t.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-semibold tabular-nums ${t.amount > 0 ? 'text-accent' : 'text-error'}`}
                      >
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}
                      </span>
                      <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-text-tertiary text-sm">No transactions found</p>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredTransactions.length > itemsPerPage && (() => {
          const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
          return (
            <div className="mt-4 space-y-3">
              {/* Prev / page indicator / Next — always visible on all screen sizes */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-border bg-surface text-text-primary text-sm disabled:opacity-40 hover:bg-surface-muted transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  ← Prev
                </button>
                <span className="text-sm text-text-tertiary tabular-nums text-center">
                  Page <span className="font-semibold text-text-primary">{currentPage}</span> of {totalPages}
                  <span className="hidden sm:inline">&nbsp;·&nbsp;{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-border bg-surface text-text-primary text-sm disabled:opacity-40 hover:bg-surface-muted transition-colors"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Next →
                </button>
              </div>
              {/* Numbered page buttons — desktop only */}
              {totalPages > 1 && (
                <div className="hidden sm:flex flex-wrap justify-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1.5 text-sm font-medium ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface text-text-secondary hover:bg-surface-muted'
                      }`}
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-md sm:rounded-2xl overflow-hidden"
            style={{ borderRadius: '20px 20px 0 0', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border" style={{ borderRadius: '2px' }} />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-text-primary">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-2 hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Amount — most prominent */}
              <div className="text-center py-3">
                <div
                  className={`text-3xl font-bold tabular-nums ${selectedTx.amount > 0 ? 'text-accent' : 'text-error'}`}
                >
                  {selectedTx.amount > 0 ? '+' : ''}₹{Math.abs(selectedTx.amount).toFixed(2)}
                </div>
                <div className="mt-1">
                  <span
                    className="px-2.5 py-1 text-white text-xs font-medium"
                    style={{ backgroundColor: categoryColors[selectedTx.category] || '#5A6577', borderRadius: 'var(--radius-sm)' }}
                  >
                    {selectedTx.category}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-surface-muted px-4 py-3" style={{ borderRadius: 'var(--radius-md)' }}>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Description</p>
                  <p className="text-sm text-text-primary">{selectedTx.description}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Date</p>
                    <p className="text-sm text-text-primary tabular-nums">{selectedTx.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Type</p>
                    <p className="text-sm text-text-primary">{selectedTx.type}</p>
                  </div>
                </div>
                {selectedTx.reference_number && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Reference</p>
                    <p className="text-sm font-mono text-text-secondary bg-surface px-2 py-1 inline-block" style={{ borderRadius: '4px' }}>
                      {selectedTx.reference_number}
                    </p>
                  </div>
                )}
                {selectedTx.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTx.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-primary-surface text-primary text-xs font-medium"
                          style={{ borderRadius: '4px' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-6">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full py-3 border border-border text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface w-full h-full max-w-6xl max-h-screen flex flex-col" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-text-primary">
                {expandedChart === 'category' && 'Spending by Category'}
                {expandedChart === 'daily' && 'Daily Income vs Expense'}
                {expandedChart === 'cumulative' && 'Cumulative Spending Trend'}
              </h2>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-surface-muted transition-colors"
                style={{ borderRadius: 'var(--radius-sm)' }}
                title="Close"
              >
                <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {expandedChart === 'category' && (
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={categorySummary.map(c => ({ ...c, value: Math.abs(c.value) }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categorySummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {expandedChart === 'daily' && (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={dailySummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="income" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--error)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {expandedChart === 'cumulative' && (
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart
                    data={dailySummary.map((d, i, arr) => ({
                      ...d,
                      cumulative: arr.slice(0, i + 1).reduce((sum, x) => sum + x.expense, 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--primary)', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
