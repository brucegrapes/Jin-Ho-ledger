import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

export async function GET() {
  const budgets = db.prepare('SELECT * FROM budgets').all();
  return NextResponse.json({ budgets });
}

export async function POST(req: NextRequest) {
  const { category, amount, start_date, end_date } = await req.json();
  if (!category || !amount || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  db.prepare('INSERT INTO budgets (category, amount, start_date, end_date) VALUES (?, ?, ?, ?)')
    .run(category, amount, start_date, end_date);
  return NextResponse.json({ success: true });
}
