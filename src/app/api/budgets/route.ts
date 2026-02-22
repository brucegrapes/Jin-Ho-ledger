import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

/**
 * For recurring budgets, auto-create the current month's budget if it doesn't
 * already exist. Called on GET so the user always sees an active budget.
 */
function ensureRecurringBudgets(userId: string) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Category recurring budgets
  const recurringCat = db
    .prepare("SELECT DISTINCT category, tag, amount FROM budgets WHERE user_id = ? AND recurring = 1")
    .all(userId) as { category: string; tag: string | null; amount: number }[];

  if (recurringCat.length === 0) return;

  const checkCat = db.prepare(
    'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND (tag IS NULL OR tag = ?) AND start_date = ? AND end_date = ?'
  );
  const insertBudget = db.prepare(
    'INSERT INTO budgets (category, tag, amount, start_date, end_date, user_id, recurring) VALUES (?, ?, ?, ?, ?, ?, 1)'
  );

  const tx = db.transaction(() => {
    for (const r of recurringCat) {
      const exists = checkCat.get(userId, r.category, r.tag ?? '', monthStart, monthEnd);
      if (!exists) {
        insertBudget.run(r.category, r.tag ?? null, r.amount, monthStart, monthEnd, userId);
      }
    }
  });
  tx();
}

export async function GET(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/budgets' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure recurring budgets exist for the current month
  ensureRecurringBudgets(auth.user.id);

  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ? ORDER BY start_date DESC').all(auth.user.id);
  writeAuditLog(auth.user.id, AuditAction.BUDGET_LIST, ipAddress, userAgent, { count: (budgets as unknown[]).length });
  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/budgets' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { amount, start_date, end_date } = body;
  const category: string = body.category || '';
  const tag: string | null = body.tag || null;
  const recurring = body.recurring ? 1 : 0;

  if ((!category && !tag) || !amount || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing fields: provide category or tag, amount, start_date, end_date' }, { status: 400 });
  }
  db.prepare('INSERT INTO budgets (category, tag, amount, start_date, end_date, user_id, recurring) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(category, tag, amount, start_date, end_date, auth.user.id, recurring);
  writeAuditLog(auth.user.id, AuditAction.BUDGET_CREATE, ipAddress, userAgent, { category, tag, start_date, end_date, recurring });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/budgets' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const info = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, auth.user.id);
  if (info.changes === 0) return NextResponse.json({ error: 'Budget not found' }, { status: 404 });

  writeAuditLog(auth.user.id, AuditAction.BUDGET_DELETE, ipAddress, userAgent, { id });
  return NextResponse.json({ success: true });
}
