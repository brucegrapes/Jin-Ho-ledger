import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, clearSessionCookie, deleteSession } from '@/utils/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    deleteSession(token);
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
