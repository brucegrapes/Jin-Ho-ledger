import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

interface MonthSpending {
  month: string;      // e.g. "2026-02"
  month_label: string; // e.g. "Feb 2026"
  spent: number;
  budget: number | null; // null if no budget existed that month
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * GET /api/budget-history?category=Food&months=6
 * Returns monthly spending for a category going back N months,
 * along with the budget amount if one existed for each month.
 */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const category = req.nextUrl.searchParams.get('category') || null;
  const tag = req.nextUrl.searchParams.get('tag') || null;
  const monthsParam = req.nextUrl.searchParams.get('months');
  const months = Math.min(Math.max(parseInt(monthsParam || '6', 10) || 6, 1), 24);

  if (!category && !tag) {
    return NextResponse.json({ error: 'category or tag is required' }, { status: 400 });
  }

  const userId = auth.user.id;
  const now = new Date();
  const history: MonthSpending[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const mon = d.getMonth(); // 0-indexed
    const lastDay = new Date(year, mon + 1, 0).getDate();
    const startDate = `${year}-${String(mon + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(mon + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let spent = 0;
    let budgetRow: { amount: number } | undefined;

    if (tag) {
      const spentRow = db
        .prepare(
          `SELECT SUM(t.amount) as total FROM transactions t
           WHERE EXISTS (
             SELECT 1 FROM json_each(t.tags) WHERE value = ?
           )
           AND t.date >= ? AND t.date <= ? AND t.user_id = ?`
        )
        .get(tag, startDate, endDate, userId) as { total: number | null };
      spent = Math.abs(spentRow.total || 0);

      budgetRow = db
        .prepare(
          'SELECT amount FROM budgets WHERE tag = ? AND start_date <= ? AND end_date >= ? AND user_id = ? LIMIT 1'
        )
        .get(tag, endDate, startDate, userId) as { amount: number } | undefined;
    } else {
      const spentRow = db
        .prepare(
          'SELECT SUM(amount) as total FROM transactions WHERE category = ? AND date >= ? AND date <= ? AND user_id = ?'
        )
        .get(category, startDate, endDate, userId) as { total: number | null };
      spent = Math.abs(spentRow.total || 0);

      budgetRow = db
        .prepare(
          "SELECT amount FROM budgets WHERE category = ? AND (tag IS NULL OR tag = '') AND start_date <= ? AND end_date >= ? AND user_id = ? LIMIT 1"
        )
        .get(category, endDate, startDate, userId) as { amount: number } | undefined;
    }

    history.push({
      month: `${year}-${String(mon + 1).padStart(2, '0')}`,
      month_label: `${MONTH_NAMES[mon]} ${year}`,
      spent: parseFloat(spent.toFixed(2)),
      budget: budgetRow ? budgetRow.amount : null,
    });
  }

  return NextResponse.json({ label: tag || category, history });
}
