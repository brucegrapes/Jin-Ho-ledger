import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { decryptString } from '@/utils/serverEncryption';
import { getUserFromRequest } from '@/utils/auth';
import {
  ollamaChatStream,
  ollamaHealth,
  buildInsightsPrompt,
  SpendingSummary,
  CategoryBreakdown,
  TagBreakdown,
  InvestmentSummary,
  MonthlyTrend,
} from '@/utils/ollama';

interface TransactionRow {
  id: number;
  date: string;
  description: string | null;
  category: string | null;
  tags: string | null;
  amount: number;
  user_id: string | null;
}

interface BudgetRow {
  id: number;
  category: string;
  amount: number;
  start_date: string;
  end_date: string;
}

// Investment-related tags that indicate money invested rather than spent
const INVESTMENT_TAGS = ['GROWW', 'MUTUAL_FUND', 'STOCKS', 'NEFT', 'SIP', 'ETF', 'INVESTMENT'];
const INVESTMENT_KEYWORDS = ['invest', 'mutual', 'stock', 'fund', 'sip', 'groww'];

function isInvestmentTransaction(description: string | null, tags: string[] | null): boolean {
  const desc = (description || '').toLowerCase();
  const tagsList = tags || [];
  
  return (
    INVESTMENT_TAGS.some(tag => tagsList.includes(tag)) ||
    INVESTMENT_KEYWORDS.some(keyword => desc.includes(keyword))
  );
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const { start, end, model, financialYear } = body as { 
    start?: string; 
    end?: string; 
    model?: string;
    financialYear?: boolean;
  };

  // Determine date range
  let rangeStart: string;
  let rangeEnd: string;
  let period: string;
  let fyYear: string;

  if (financialYear) {
    // Financial year: Apr - Mar
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // If before April, FY started previous year
    const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    const fyEndYear = fyStartYear + 1;
    
    rangeStart = `${fyStartYear}-04-01`;
    rangeEnd = `${fyEndYear}-03-31`;
    fyYear = `${fyStartYear}-${String(fyEndYear).slice(-2)}`;
    period = `FY ${fyYear} (Apr ${fyStartYear} - Mar ${fyEndYear})`;
  } else {
    // Default to current month
    const now = new Date();
    rangeStart = start || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    rangeEnd = end || now.toISOString().slice(0, 10);
    const dateObj = new Date(rangeStart);
    period = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    fyYear = 'N/A';
  }

  // ── Check Ollama health ──────────────────────────────────────
  const health = await ollamaHealth();
  if (!health.ok) {
    return NextResponse.json(
      { error: `Ollama is not reachable: ${health.error}. Start it with: docker compose up -d ollama` },
      { status: 503 }
    );
  }

  // ── Fetch transactions for the period (including tags) ───────
  const transactions = db
    .prepare(
      `SELECT id, date, description, category, tags, amount
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`
    )
    .all(auth.user.id, rangeStart, rangeEnd) as TransactionRow[];

  // ── Decrypt sensitive data ───────────────────────────────────
  const decrypted = transactions.map(t => ({
    ...t,
    description: decryptString(t.description) || t.description,
    tags: t.tags ? JSON.parse(t.tags) : [],
  }));

  // ── Calculate core metrics ───────────────────────────────────
  const totalIncome = decrypted
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = decrypted
    .filter(t => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0);

  const netSavings = totalIncome + totalExpenses; // expenses are negative
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // ── Category breakdown ───────────────────────────────────────
  const categoryMap: Record<string, { amount: number; count: number }> = {};
  for (const t of decrypted) {
    if (t.amount < 0 && t.category) {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { amount: 0, count: 0 };
      }
      categoryMap[t.category].amount += t.amount;
      categoryMap[t.category].count += 1;
    }
  }

  const totalExpensesAbs = Math.abs(totalExpenses);
  const topCategories: CategoryBreakdown[] = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalExpensesAbs > 0 ? (Math.abs(data.amount) / totalExpensesAbs) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // ── Tag breakdown ───────────────────────────────────────────
  const tagMap: Record<string, { amount: number; count: number }> = {};
  for (const t of decrypted) {
    if (t.tags && t.tags.length > 0) {
      for (const tag of t.tags) {
        if (!tagMap[tag]) {
          tagMap[tag] = { amount: 0, count: 0 };
        }
        tagMap[tag].amount += t.amount;
        tagMap[tag].count += 1;
      }
    }
  }

  const topTags: TagBreakdown[] = Object.entries(tagMap)
    .map(([tag, data]) => ({
      tag,
      amount: data.amount,
      percentage: totalExpensesAbs > 0 ? (Math.abs(data.amount) / totalExpensesAbs) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // ── Investment analysis ──––––––––––––––––––––––––––––––––––––
  const investmentTransactions = decrypted.filter(t => 
    isInvestmentTransaction(t.description, t.tags)
  );
  
  const totalInvestments = investmentTransactions
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const investmentTagMap: Record<string, { amount: number; count: number }> = {};
  for (const t of investmentTransactions) {
    if (t.tags && t.tags.length > 0) {
      for (const tag of t.tags) {
        if (!investmentTagMap[tag]) {
          investmentTagMap[tag] = { amount: 0, count: 0 };
        }
        investmentTagMap[tag].amount += t.amount;
        investmentTagMap[tag].count += 1;
      }
    }
  }

  const topInvestmentTags: TagBreakdown[] = Object.entries(investmentTagMap)
    .map(([tag, data]) => ({
      tag,
      amount: data.amount,
      percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const investments: InvestmentSummary = {
    totalInvestments,
    topInvestmentTags,
    investmentPercentageOfIncome: totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0,
  };

  // ── Monthly trends ───────────────────────────────────────────
  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  for (const t of decrypted) {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expenses: 0 };
    }
    if (t.amount > 0) {
      monthlyMap[monthKey].income += t.amount;
    } else {
      monthlyMap[monthKey].expenses += t.amount;
    }
  }

  const monthlyTrends: MonthlyTrend[] = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { 
        month: 'short', 
        year: 'numeric' 
      });
      return {
        month: monthName,
        income: data.income,
        expenses: data.expenses,
        savings: data.income + data.expenses,
      };
    });

  const highestSpendMonth = monthlyTrends.reduce((max, m) => 
    Math.abs(m.expenses) > Math.abs(max.expenses) ? m : max, 
    monthlyTrends[0]
  )?.month || 'N/A';

  const highestIncomeMonth = monthlyTrends.reduce((max, m) => 
    m.income > max.income ? m : max, 
    monthlyTrends[0]
  )?.month || 'N/A';

  // ── Budgets ──────────────────────────────────────────────────
  const budgetRows = db
    .prepare(
      `SELECT category, amount, start_date, end_date
       FROM budgets
       WHERE user_id = ? AND start_date <= ? AND end_date >= ?`
    )
    .all(auth.user.id, rangeEnd, rangeStart) as BudgetRow[];

  const budgets = budgetRows.map(b => {
    const spent = decrypted
      .filter(t => t.category === b.category && t.amount < 0)
      .reduce((s, t) => s + t.amount, 0);
    const spentAbs = Math.abs(spent);
    const percentage = b.amount > 0 ? (spentAbs / b.amount) * 100 : 0;
    const status: 'on-track' | 'exceeded' | 'low-usage' = 
      percentage > 100 ? 'exceeded' : percentage < 50 ? 'low-usage' : 'on-track';
    
    return { 
      category: b.category, 
      budget: b.amount, 
      spent,
      percentage,
      status,
    };
  });

  // ── Average metrics ──────────────────────────────────────────
  const monthCount = monthlyTrends.length || 1;
  const averageMonthlyIncome = totalIncome / monthCount;
  const averageMonthlyExpense = Math.abs(totalExpenses) / monthCount;

  // ── Build comprehensive summary ──––————————————––––————––––––
  const summary: SpendingSummary = {
    period,
    financialYear: fyYear,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    topCategories,
    categoryCount: Object.keys(categoryMap).length,
    topTags,
    investments,
    monthlyTrends,
    highestSpendMonth,
    highestIncomeMonth,
    budgets,
    averageMonthlyExpense,
    averageMonthlyIncome,
  };

  const messages = buildInsightsPrompt(summary);

  // ── Stream the response as NDJSON so low-VRAM GPUs never time out ────────
  // Each line is a JSON object: {type:"summary"|"token"|"error", data?:...}
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send the pre-computed summary immediately so the UI can render it
      controller.enqueue(
        encoder.encode(JSON.stringify({ type: 'summary', data: summary }) + '\n')
      );

      try {
        // 2. Stream tokens from Ollama — temperature 0.2, 450 tokens max
        for await (const token of ollamaChatStream(messages, { model, num_predict: 450, temperature: 0.2 })) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'token', data: token }) + '\n')
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', data: message }) + '\n')
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Quick health-check used by the InsightsPanel to decide whether to show the button. */
export async function GET() {
  const health = await ollamaHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
