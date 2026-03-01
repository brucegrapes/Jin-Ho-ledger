"use client";

import { useState } from 'react';
import type { SpendingSummary } from '@/utils/ollama';


export default function InsightsPanel() {
  const [insight, setInsight] = useState<string | null>(null);
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFinancialYear, setUseFinancialYear] = useState(false);
  
  // Month selector state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    setInsight(null);
    setSummary(null);

    try {
      const requestBody: Record<string, unknown> = { financialYear: useFinancialYear };

      if (!useFinancialYear) {
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        requestBody.start = startDate.toISOString().split('T')[0];
        requestBody.end = endDate.toISOString().split('T')[0];
      }

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setError((err as any).error ?? 'Request failed');
        setLoading(false);
        return;
      }

      // Read NDJSON stream — each line is {type, data}
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as { type: string; data?: any };
            if (msg.type === 'summary') {
              setSummary(msg.data);
            } else if (msg.type === 'token') {
              setInsight(prev => (prev ?? '') + msg.data);
            } else if (msg.type === 'error') {
              setError(msg.data ?? 'Unknown error');
            }
          } catch {
            // malformed line — ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  // Month names for display
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Generate list of past years (last 3 years)
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).sort((a, b) => a - b);

  // Render markdown bullet points (• ...) as <li> elements
  function renderInsight(text: string) {
    const lines = text.split('\n').filter(l => l.trim());
    return (
      <ul className="space-y-2 mt-3">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-secondary leading-relaxed">
            <span className="text-accent mt-0.5 shrink-0">•</span>
            <span>{line.replace(/^[•\-*]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="trust-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          AI Spending Insights
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseFinancialYear(!useFinancialYear)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              useFinancialYear
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-secondary border-border hover:border-primary hover:text-primary'
            }`}
            title="Toggle between specific month and full financial year"
          >
            {useFinancialYear ? 'FY' : 'Month'}
          </button>
          <span className="text-xs text-text-tertiary bg-surface-muted px-2 py-1 rounded-full border border-border-light">
            phi3 · local
          </span>
        </div>
      </div>

      {/* Month/Year selector */}
      {!useFinancialYear && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-surface-muted rounded-lg border border-border-light">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-primary focus:ring-2 focus:ring-primary/20"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-primary focus:ring-2 focus:ring-primary/20"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
              className="text-xs px-2 py-1 rounded border border-primary/30 bg-primary-surface text-primary hover:bg-primary hover:text-white transition-colors"
              title="Current month"
            >
              {monthNames[now.getMonth()]}
            </button>
            <button
              onClick={() => {
                const prev = new Date();
                prev.setMonth(prev.getMonth() - 1);
                setSelectedMonth(prev.getMonth());
                setSelectedYear(prev.getFullYear());
              }}
              className="text-xs px-2 py-1 rounded border border-border bg-surface text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors"
              title="Previous month"
            >
              Prev
            </button>
          </div>
        </div>
      )}

      {/* Summary stats — appear instantly before AI streams */}
      {summary && (
        <div className="mb-4 p-3 bg-surface-muted rounded-lg border border-border-light space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-text-tertiary font-medium">{summary.period}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
            <span className="text-accent">▲ ₹{summary.totalIncome.toFixed(0)}</span>
            <span className="text-error">▼ ₹{Math.abs(summary.totalExpenses).toFixed(0)}</span>
            <span className="text-primary font-medium">
              Saved ₹{summary.netSavings.toFixed(0)}
              <span className="text-text-tertiary font-normal"> ({summary.savingsRate.toFixed(1)}%)</span>
            </span>
          </div>

          {summary.investments.totalInvestments > 0 && (
            <div className="text-xs text-text-secondary">
              Invested ₹{summary.investments.totalInvestments.toFixed(0)}
              <span className="text-text-tertiary"> ({summary.investments.investmentPercentageOfIncome.toFixed(1)}% of income)</span>
            </div>
          )}

          {summary.topCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {summary.topCategories.slice(0, 3).map(cat => (
                <span key={cat.category}
                  className="text-xs px-2 py-0.5 rounded-full border border-border bg-surface text-text-secondary">
                  {cat.category} <span className="text-text-tertiary">{cat.percentage.toFixed(0)}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Streaming insight text */}
      {(insight || loading) && (
        <div className="border-t border-border-light pt-3">
          {insight && renderInsight(insight)}
          {loading && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse rounded-sm align-middle" />
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-error mt-3 bg-error-surface border border-error/20 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Action button */}
      <button
        onClick={fetchInsights}
        disabled={loading}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                   bg-primary text-white text-sm font-medium transition-colors
                   hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Analyzing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {insight ? 'Refresh Insights' : 'Get AI Insights'}
          </>
        )}
      </button>
    </div>
  );
}
