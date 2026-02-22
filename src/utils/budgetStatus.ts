import db from './db';

interface Budget {
  id: number;
  category: string;
  tag: string | null;
  amount: number;
  start_date: string;
  end_date: string;
}

interface BudgetStatus {
  label: string;       // category name or tag name
  budget_type: 'category' | 'tag';
  // keep 'category' field for backward compat
  category: string;
  budget: number;
  spent: number;
  remaining: number;
}

export function getBudgetStatus(today: string, userId: string): BudgetStatus[] {
  // Get all budgets active today for this user
  const budgets = db
    .prepare('SELECT * FROM budgets WHERE start_date <= ? AND end_date >= ? AND user_id = ?')
    .all(today, today, userId) as Budget[];

  const status = budgets.map((b) => {
    let spent = 0;

    if (b.tag) {
      // Tag budget: match transactions where the tags JSON array contains this tag
      const result = db
        .prepare(
          `SELECT SUM(t.amount) as total FROM transactions t
           WHERE EXISTS (
             SELECT 1 FROM json_each(t.tags) WHERE value = ?
           )
           AND t.date >= ? AND t.date <= ? AND t.user_id = ?`
        )
        .get(b.tag, b.start_date, today, userId) as { total: number | null };
      spent = Math.abs(result.total || 0);
    } else {
      // Category budget
      const result = db
        .prepare(
          'SELECT SUM(amount) as total FROM transactions WHERE category = ? AND date >= ? AND date <= ? AND user_id = ?'
        )
        .get(b.category, b.start_date, today, userId) as { total: number | null };
      spent = Math.abs(result.total || 0);
    }

    const label = b.tag || b.category;
    return {
      label,
      budget_type: b.tag ? ('tag' as const) : ('category' as const),
      category: label, // backward compat for BudgetTracker status cards
      budget: b.amount,
      spent,
      remaining: b.amount - spent,
    };
  });

  return status;
}
