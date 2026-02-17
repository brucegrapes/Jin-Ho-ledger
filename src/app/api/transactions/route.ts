import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params: string[] = [];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (start) {
    query += ' AND date >= ?';
    params.push(start);
  }
  if (end) {
    query += ' AND date <= ?';
    params.push(end);
  }
  query += ' ORDER BY date DESC';

  const transactions = db.prepare(query).all(...params);
  return NextResponse.json({ transactions });
}
