import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Distinct non-empty categories from transactions
  const rows = db
    .prepare(
      `SELECT DISTINCT category FROM transactions
       WHERE user_id = ? AND category IS NOT NULL AND category != ''
       ORDER BY category ASC`
    )
    .all(auth.user.id) as { category: string }[];

  const categories = rows.map((r) => r.category);
  return NextResponse.json({ categories });
}
