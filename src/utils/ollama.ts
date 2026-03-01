/**
 * Ollama integration using the official `ollama` npm package.
 *
 * Configuration (set in .env.local):
 *   OLLAMA_BASE_URL  – Ollama server URL (default: http://localhost:11434)
 *   OLLAMA_MODEL     – Model to use          (default: phi3)
 */

import { Ollama } from 'ollama';

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'phi3';

// Singleton client – reused across requests in the same process
const ollamaClient = new Ollama({ host: BASE_URL });

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaOptions {
  model?: string;
  temperature?: number;
  /** Maximum tokens to generate */
  num_predict?: number;
}

/**
 * Send a chat request to Ollama (non-streaming).
 * Returns the assistant's reply as a string.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  options: OllamaOptions = {}
): Promise<string> {
  const { model = DEFAULT_MODEL, temperature = 0.2, num_predict = 450 } = options;

  const response = await ollamaClient.chat({
    model,
    messages,
    options: { temperature, num_predict },
  });

  return response.message.content;
}

/**
 * Stream a chat request to Ollama.
 * Yields text tokens as they are generated — use this to avoid HTTP timeouts
 * on low-VRAM hardware (e.g. GT 1030).
 */
export async function* ollamaChatStream(
  messages: OllamaMessage[],
  options: OllamaOptions = {}
): AsyncGenerator<string> {
  const { model = DEFAULT_MODEL, temperature = 0.2, num_predict = 450 } = options;

  const stream = await ollamaClient.chat({
    model,
    messages,
    stream: true,
    options: { temperature, num_predict },
  });

  for await (const chunk of stream) {
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
  }
}

/**
 * Check that Ollama is reachable and return the list of available models.
 * Returns { ok: true, models } or { ok: false, error }.
 */
export async function ollamaHealth(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    const { models } = await ollamaClient.list();
    return { ok: true, models: models.map(m => m.name) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a spending-insights prompt from transaction summary data
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TagBreakdown {
  tag: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface InvestmentSummary {
  totalInvestments: number;
  topInvestmentTags: TagBreakdown[];
  investmentPercentageOfIncome: number;
}

export interface SpendingSummary {
  period: string;              // e.g. "FY 2025-26 (Apr 2025 - Mar 2026)"
  financialYear: string;       // e.g. "2025-26"
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;         // Percentage
  
  // Category insights
  topCategories: CategoryBreakdown[];
  categoryCount: number;
  
  // Tag insights
  topTags: TagBreakdown[];
  
  // Investment data
  investments: InvestmentSummary;
  
  // Monthly trends
  monthlyTrends: MonthlyTrend[];
  highestSpendMonth: string;
  highestIncomeMonth: string;
  
  // Budget tracking
  budgets: { 
    category: string; 
    budget: number; 
    spent: number; 
    percentage: number;
    status: 'on-track' | 'exceeded' | 'low-usage';
  }[];
  
  // Average metrics
  averageMonthlyExpense: number;
  averageMonthlyIncome: number;
}

const SYSTEM_PROMPT = `You are a personal finance assistant for MyLedger.
Analyze the spending data and return exactly 4-5 short bullet points using • as the bullet character.
Rules: reference actual numbers; mention top spending category and investment activity; flag any budget overages; give one saving tip.
No introductions, no conclusions, no generic advice — only data-backed points.`;

export function buildInsightsPrompt(summary: SpendingSummary): OllamaMessage[] {
  const r = (n: number) => `₹${Math.abs(n).toFixed(0)}`;

  // Top 5 expense categories only
  const categories = summary.topCategories
    .slice(0, 5)
    .map(c => `${c.category} ${r(c.amount)} (${c.percentage.toFixed(0)}%)`)
    .join(', ');

  // Top 4 tags
  const tags = summary.topTags
    .slice(0, 4)
    .map(t => `${t.tag} ${r(t.amount)}`)
    .join(', ');

  // Investments one-liner
  const investLine = summary.investments.totalInvestments > 0
    ? `Invested ${r(summary.investments.totalInvestments)} (${summary.investments.investmentPercentageOfIncome.toFixed(1)}% of income) via ${summary.investments.topInvestmentTags.slice(0, 2).map(i => i.tag).join(', ') || 'various'}`
    : 'No investments tracked';

  // Exceeded budgets only
  const exceededBudgets = summary.budgets
    .filter(b => b.percentage > 100)
    .map(b => `${b.category} ${b.percentage.toFixed(0)}% used`)
    .join(', ');

  // Monthly trend summary (only if FY; skip for single month)
  const monthTrend = summary.monthlyTrends.length > 1
    ? `High-spend: ${summary.highestSpendMonth}, High-income: ${summary.highestIncomeMonth}.`
    : '';

  const userMessage = `Period: ${summary.period}
Income: ${r(summary.totalIncome)} | Expenses: ${r(summary.totalExpenses)} | Saved: ${r(summary.netSavings)} (${summary.savingsRate.toFixed(1)}%) | Avg monthly expense: ${r(summary.averageMonthlyExpense)}
Top categories: ${categories || 'none'}
Top tags: ${tags || 'none'}
${investLine}
${exceededBudgets ? `Over budget: ${exceededBudgets}` : 'All budgets on track'}
${monthTrend}
Give 4-5 concise bullet insights.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];
}
