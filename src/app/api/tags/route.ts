import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

/**
 * GET /api/tags
 * Returns all distinct tags used across the user's transactions.
 */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = db
    .prepare(
      `SELECT DISTINCT jt.value AS tag
       FROM transactions t, json_each(t.tags) jt
       WHERE t.user_id = ? AND jt.value IS NOT NULL AND jt.value != ''
       ORDER BY jt.value`
    )
    .all(auth.user.id) as { tag: string }[];

  const tags = rows.map(r => r.tag);
  return NextResponse.json({ tags });
}
