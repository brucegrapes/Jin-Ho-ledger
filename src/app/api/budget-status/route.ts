import { NextRequest, NextResponse } from 'next/server';
import { getBudgetStatus } from '@/utils/budgetStatus';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const today = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const status = getBudgetStatus(today, auth.user.id);
  return NextResponse.json({ status });
}
