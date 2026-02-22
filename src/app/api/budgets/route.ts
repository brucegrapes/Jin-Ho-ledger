import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function GET(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/budgets' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(auth.user.id);
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

  const { category, amount, start_date, end_date } = await req.json();
  if (!category || !amount || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  db.prepare('INSERT INTO budgets (category, amount, start_date, end_date, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(category, amount, start_date, end_date, auth.user.id);
  writeAuditLog(auth.user.id, AuditAction.BUDGET_CREATE, ipAddress, userAgent, { category, start_date, end_date });
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
