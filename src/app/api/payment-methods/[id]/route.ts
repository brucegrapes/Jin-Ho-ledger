import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { type, name, last_four, upi_id, bank_name, color } = body;

  const existing = db
    .prepare('SELECT id FROM payment_methods WHERE id = ? AND user_id = ?')
    .get(Number(id), auth.user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare(
    'UPDATE payment_methods SET type=?, name=?, last_four=?, upi_id=?, bank_name=?, color=? WHERE id=? AND user_id=?'
  ).run(type, name, last_four ?? null, upi_id ?? null, bank_name ?? null, color ?? '#1F4E79', Number(id), auth.user.id);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Unlink subscriptions rather than cascade-delete them
  db.prepare('UPDATE subscriptions SET payment_method_id = NULL WHERE payment_method_id = ? AND user_id = ?')
    .run(Number(id), auth.user.id);

  db.prepare('DELETE FROM payment_methods WHERE id = ? AND user_id = ?')
    .run(Number(id), auth.user.id);

  return NextResponse.json({ success: true });
}
