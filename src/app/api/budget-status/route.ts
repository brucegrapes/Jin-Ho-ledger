import { NextRequest, NextResponse } from 'next/server';
import { getBudgetStatus } from '@/utils/budgetStatus';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const today = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const status = getBudgetStatus(today);
  return NextResponse.json({ status });
}
