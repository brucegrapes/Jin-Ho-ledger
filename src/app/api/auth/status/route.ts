import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: auth.user.id,
      username: auth.user.username,
    },
  });
}
