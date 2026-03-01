import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const subs = db
    .prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY name ASC')
    .all(auth.user.id);
  return NextResponse.json({ subscriptions: subs });
}

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, amount, billing_cycle, next_charge_date, payment_method_id, status, category, url, notes } = body;

  if (!name || amount === undefined || !billing_cycle) {
    return NextResponse.json({ error: 'name, amount, billing_cycle are required' }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO subscriptions
        (user_id, name, amount, billing_cycle, next_charge_date, payment_method_id, status, category, url, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      auth.user.id,
      name,
      amount,
      billing_cycle,
      next_charge_date ?? null,
      payment_method_id ?? null,
      status ?? 'active',
      category ?? 'Other',
      url ?? null,
      notes ?? null,
      new Date().toISOString()
    );

  return NextResponse.json({ id: result.lastInsertRowid });
}
