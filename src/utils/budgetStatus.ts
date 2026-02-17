import db from './db';

interface Budget {
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

export function getBudgetStatus(today: string): BudgetStatus[] {
  // Get all budgets active today
  const budgets = db.prepare('SELECT * FROM budgets WHERE start_date <= ? AND end_date >= ?').all(today, today) as Budget[];
  const status = budgets.map((b) => {
    const result = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE category = ? AND date >= ? AND date <= ?')
      .get(b.category, b.start_date, today) as { total: number | null };
    const spent = result.total || 0;
    return {
      category: b.category,
      budget: b.amount,
      spent,
      remaining: b.amount - spent,
    };
  });
  return status;
}
