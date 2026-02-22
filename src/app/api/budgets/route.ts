import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(auth.user.id);
  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { category, amount, start_date, end_date } = await req.json();
  if (!category || !amount || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  db.prepare('INSERT INTO budgets (category, amount, start_date, end_date, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(category, amount, start_date, end_date, auth.user.id);
  return NextResponse.json({ success: true });
}
