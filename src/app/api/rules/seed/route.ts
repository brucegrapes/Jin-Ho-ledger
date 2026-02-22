import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/auth';
import { seedDefaultsForUser } from '@/utils/seedDefaults';

/** POST /api/rules/seed — seed default rules for the current user (idempotent) */
export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  seedDefaultsForUser(auth.user.id);
  return NextResponse.json({ success: true });
}
