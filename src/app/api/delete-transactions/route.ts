import db from '@/utils/db';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function DELETE(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/delete-transactions' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = db.prepare('DELETE FROM transactions WHERE user_id = ?').run(auth.user.id);

    writeAuditLog(auth.user.id, AuditAction.DATA_DELETE_TRANSACTIONS, ipAddress, userAgent, {
      deleted_count: result.changes,
    });
    return NextResponse.json({
      success: true,
      message: `${result.changes} transaction(s) deleted successfully`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
