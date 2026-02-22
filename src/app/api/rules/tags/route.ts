import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

interface TagRuleRow {
  id: number;
  user_id: string;
  tag_name: string;
  pattern: string;
  match_type: string;
  priority: number;
  created_at: string;
}

/** GET /api/rules/tags — list all tag rules for the authenticated user */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = db
    .prepare(
      `SELECT id, tag_name, pattern, match_type, priority, created_at
       FROM tag_rules
       WHERE user_id = ?
       ORDER BY tag_name ASC, priority DESC, pattern ASC`
    )
    .all(auth.user.id) as TagRuleRow[];

  return NextResponse.json({ rules: rows });
}

/** POST /api/rules/tags — create a new tag rule */
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const tagName  = typeof body.tag_name === 'string' ? body.tag_name.trim().toUpperCase() : '';
  const pattern  = typeof body.pattern  === 'string' ? body.pattern.trim().toLowerCase() : '';
  const matchType = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'].includes(body.match_type)
    ? body.match_type
    : 'contains';
  const priority = Number.isInteger(body.priority) ? body.priority : 0;

  if (!tagName || !pattern) {
    return NextResponse.json({ error: 'tag_name and pattern are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO tag_rules (user_id, tag_name, pattern, match_type, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(auth.user.id, tagName, pattern, matchType, priority, now);

  return NextResponse.json(
    { id: result.lastInsertRowid, tag_name: tagName, pattern, match_type: matchType, priority, created_at: now },
    { status: 201 }
  );
}

/** PUT /api/rules/tags — update an existing tag rule (send id in body) */
export async function PUT(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id       = Number(body.id);
  const tagName  = typeof body.tag_name === 'string' ? body.tag_name.trim().toUpperCase() : '';
  const pattern  = typeof body.pattern  === 'string' ? body.pattern.trim().toLowerCase() : '';
  const matchType = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'].includes(body.match_type)
    ? body.match_type
    : 'contains';
  const priority = Number.isInteger(body.priority) ? body.priority : 0;

  if (!id || !tagName || !pattern) {
    return NextResponse.json({ error: 'id, tag_name and pattern are required' }, { status: 400 });
  }

  const info = db
    .prepare(
      `UPDATE tag_rules
       SET tag_name = ?, pattern = ?, match_type = ?, priority = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(tagName, pattern, matchType, priority, id, auth.user.id);

  if (info.changes === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

/** DELETE /api/rules/tags?id=123 */
export async function DELETE(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const info = db
    .prepare('DELETE FROM tag_rules WHERE id = ? AND user_id = ?')
    .run(id, auth.user.id);

  if (info.changes === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
