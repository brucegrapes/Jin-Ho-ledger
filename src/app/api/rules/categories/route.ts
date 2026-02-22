import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

interface CategoryRuleRow {
  id: number;
  user_id: string;
  category: string;
  keyword: string;
  match_type: string;
  priority: number;
  color: string | null;
  created_at: string;
}

/** GET /api/rules/categories — list all rules for the authenticated user */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = db
    .prepare(
      `SELECT id, category, keyword, match_type, priority, color, created_at
       FROM category_rules
       WHERE user_id = ?
       ORDER BY category ASC, priority DESC, keyword ASC`
    )
    .all(auth.user.id) as CategoryRuleRow[];

  return NextResponse.json({ rules: rows });
}

/** POST /api/rules/categories — create a new rule */
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const keyword   = typeof body.keyword   === 'string' ? body.keyword.trim().toLowerCase() : '';
  const matchType = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'].includes(body.match_type)
    ? body.match_type
    : 'contains';
  const priority = Number.isInteger(body.priority) ? body.priority : 0;
  const color    = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;

  if (!category || !keyword) {
    return NextResponse.json({ error: 'category and keyword are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO category_rules (user_id, category, keyword, match_type, priority, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(auth.user.id, category, keyword, matchType, priority, color, now);

  return NextResponse.json(
    { id: result.lastInsertRowid, category, keyword, match_type: matchType, priority, color, created_at: now },
    { status: 201 }
  );
}

/** PUT /api/rules/categories — update an existing rule (send id in body) */
export async function PUT(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id       = Number(body.id);
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const keyword  = typeof body.keyword  === 'string' ? body.keyword.trim().toLowerCase() : '';
  const matchType = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'].includes(body.match_type)
    ? body.match_type
    : 'contains';
  const priority = Number.isInteger(body.priority) ? body.priority : 0;
  const color    = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;

  if (!id || !category || !keyword) {
    return NextResponse.json({ error: 'id, category and keyword are required' }, { status: 400 });
  }

  const info = db
    .prepare(
      `UPDATE category_rules
       SET category = ?, keyword = ?, match_type = ?, priority = ?, color = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(category, keyword, matchType, priority, color, id, auth.user.id);

  if (info.changes === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

/** DELETE /api/rules/categories?id=123 */
export async function DELETE(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const info = db
    .prepare('DELETE FROM category_rules WHERE id = ? AND user_id = ?')
    .run(id, auth.user.id);

  if (info.changes === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
