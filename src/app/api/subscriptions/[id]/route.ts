import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, amount, billing_cycle, next_charge_date, payment_method_id, status, category, url, notes } = body;

  const existing = db
    .prepare('SELECT id FROM subscriptions WHERE id = ? AND user_id = ?')
    .get(Number(id), auth.user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare(
    `UPDATE subscriptions
     SET name=?, amount=?, billing_cycle=?, next_charge_date=?, payment_method_id=?,
         status=?, category=?, url=?, notes=?
     WHERE id=? AND user_id=?`
  ).run(
    name, amount, billing_cycle,
    next_charge_date ?? null,
    payment_method_id ?? null,
    status ?? 'active',
    category ?? 'Other',
    url ?? null,
    notes ?? null,
    Number(id), auth.user.id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  db.prepare('DELETE FROM subscriptions WHERE id = ? AND user_id = ?')
    .run(Number(id), auth.user.id);

  return NextResponse.json({ success: true });
}
