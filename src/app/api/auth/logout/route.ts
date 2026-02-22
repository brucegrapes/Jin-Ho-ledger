import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, clearSessionCookie, deleteSession, getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function POST(req: NextRequest) {
  const auth = getUserFromRequest(req);
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    deleteSession(token);
  }
  const { ipAddress, userAgent } = extractRequestInfo(req);
  writeAuditLog(auth?.user.id ?? null, AuditAction.AUTH_LOGOUT, ipAddress, userAgent);
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
