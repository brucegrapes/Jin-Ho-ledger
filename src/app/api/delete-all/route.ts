import db from '@/utils/db';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function DELETE(req: NextRequest) {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  const auth = getUserFromRequest(req);
  if (!auth) {
    writeAuditLog(null, AuditAction.UNAUTHENTICATED_ACCESS, ipAddress, userAgent, { endpoint: '/api/delete-all' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Delete all transactions
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(auth.user.id);
    
    // Delete all budgets
    db.prepare('DELETE FROM budgets WHERE user_id = ?').run(auth.user.id);

    writeAuditLog(auth.user.id, AuditAction.DATA_DELETE_ALL, ipAddress, userAgent);
    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
