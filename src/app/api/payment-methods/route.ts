import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const methods = db
    .prepare('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC')
    .all(auth.user.id);
  return NextResponse.json({ methods });
}

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, name, last_four, upi_id, bank_name, color } = body;

  if (!type || !name) {
    return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
  }

  const result = db
    .prepare(
      'INSERT INTO payment_methods (user_id, type, name, last_four, upi_id, bank_name, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      auth.user.id,
      type,
      name,
      last_four ?? null,
      upi_id ?? null,
      bank_name ?? null,
      color ?? '#1F4E79',
      new Date().toISOString()
    );

  return NextResponse.json({ id: result.lastInsertRowid });
}
