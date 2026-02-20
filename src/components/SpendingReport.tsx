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
  Coffee: '#8B4513',
  Food: '#FF6347',
  Shopping: '#FF69B4',
  Transfers: '#4169E1',
  Investments: '#DAA520',
  Utilities: '#DC143C',
  Salary: '#228B22',
  Entertainment: '#FF1493',
  Personal: '#696969',
  Uncategorized: '#A9A9A9',
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Total Transactions</div>
          <div className="text-3xl font-bold mt-2">{filteredTransactions.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Income</div>
          <div className="text-3xl font-bold mt-2">₹{totalIncome.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-semibold opacity-90">Expenses</div>
          <div className="text-3xl font-bold mt-2">₹{totalExpense.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">🔍 Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Min Amount
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={e => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Max Amount
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={e => setMaxAmount(e.target.value)}
              placeholder="100000"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Search Description
          </label>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search transactions..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-zinc-800 dark:text-white"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(category => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Transaction Types
          </label>
          <div className="flex flex-wrap gap-2">
            {allTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {allTags.length > 0 ? (
              allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No tags available</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        {categorySummary.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">📊 Spending by Category</h3>
              <button
                onClick={() => setExpandedChart('category')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Expand chart"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">📈 Daily Income vs Expense</h3>
              <button
                onClick={() => setExpandedChart('daily')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Expand chart"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12-4h4v4M6 18h4v-4m12 4h-4v-4" />
                </svg>
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" />
                <Bar dataKey="expense" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Spending Line Chart */}
        {dailySummary.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">📉 Cumulative Spending Trend</h3>
              <button
                onClick={() => setExpandedChart('cumulative')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Expand chart"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-black dark:text-white">🧾 Transactions</h3>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm dark:bg-zinc-800 dark:text-white"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="category">Sort by Category</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm dark:bg-zinc-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-700">
                <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((t, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      <td className="p-3 text-gray-900 dark:text-gray-100">{t.date}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100 truncate">{t.description}</td>
                      <td className="p-3 text-gray-900 dark:text-gray-100 font-mono text-xs bg-gray-50 dark:bg-zinc-800 rounded px-2 py-1">
                        {t.reference_number ? t.reference_number : '-'}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-1 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: categoryColors[t.category] || '#666' }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          t.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500 dark:text-gray-400">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredTransactions.length > itemsPerPage && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 dark:bg-zinc-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(filteredTransactions.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 rounded text-sm ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 dark:border-gray-600 dark:bg-zinc-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTransactions.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 dark:bg-zinc-800 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg w-full h-full max-w-6xl max-h-screen flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold text-black dark:text-white">
                {expandedChart === 'category' && '📊 Spending by Category'}
                {expandedChart === 'daily' && '📈 Daily Income vs Expense'}
                {expandedChart === 'cumulative' && '📉 Cumulative Spending Trend'}
              </h2>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" />
                    <Bar dataKey="expense" fill="#ef4444" />
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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444' }}
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
