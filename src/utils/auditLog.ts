import { NextRequest } from 'next/server';
import db from '@/utils/db';

// ─── Action Catalogue ──────────────────────────────────────────────────────────
export const AuditAction = {
  // Authentication
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_REGISTER_SUCCESS: 'AUTH_REGISTER_SUCCESS',
  AUTH_REGISTER_FAILURE: 'AUTH_REGISTER_FAILURE',
  // Data access
  TRANSACTION_ACCESS: 'TRANSACTION_ACCESS',
  // Mutations
  FILE_UPLOAD_SUCCESS: 'FILE_UPLOAD_SUCCESS',
  FILE_UPLOAD_FAILURE: 'FILE_UPLOAD_FAILURE',
  BUDGET_LIST: 'BUDGET_LIST',
  BUDGET_CREATE: 'BUDGET_CREATE',
  BUDGET_DELETE: 'BUDGET_DELETE',
  DATA_DELETE_ALL: 'DATA_DELETE_ALL',
  // Misc
  UNAUTHENTICATED_ACCESS: 'UNAUTHENTICATED_ACCESS',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// ─── Types ─────────────────────────────────────────────────────────────────────
type Metadata = Record<string, string | number | boolean | null | undefined>;

export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Metadata | string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

// ─── Core writer — pure server-side, no HTTP dependency ───────────────────────
export function writeAuditLog(
  userId: string | null,
  action: AuditActionType,
  ipAddress: string | null,
  userAgent: string | null,
  metadata?: Metadata,
): void {
  try {
    const metaJson = metadata ? JSON.stringify(metadata) : null;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(userId, action, ipAddress, userAgent, metaJson, now);
  } catch (err) {
    // Audit logging must never crash the application — log to stderr and continue.
    console.error('[audit] Failed to write audit log entry:', err);
  }
}

// ─── Request-context helper (call sites in API routes) ────────────────────────
export function extractRequestInfo(req: NextRequest): { ipAddress: string; userAgent: string | null } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.headers.get('x-real-ip') ?? 'unknown');
  const userAgent = req.headers.get('user-agent') ?? null;
  return { ipAddress, userAgent };
}

// ─── Server-side query — no HTTP, direct DB access ────────────────────────────
export function queryAuditLogs(
  userId: string,
  filters: AuditLogFilters = {},
): { logs: AuditLogEntry[]; total: number } {
  const { action, start, end, limit = 100, offset = 0 } = filters;
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);

  let query = 'SELECT * FROM audit_logs WHERE user_id = ?';
  const params: (string | number)[] = [userId];
  let countQuery = 'SELECT COUNT(*) AS total FROM audit_logs WHERE user_id = ?';
  const countParams: (string | number)[] = [userId];

  if (action) {
    query += ' AND action = ?';
    countQuery += ' AND action = ?';
    params.push(action);
    countParams.push(action);
  }
  if (start) {
    query += ' AND created_at >= ?';
    countQuery += ' AND created_at >= ?';
    params.push(start);
    countParams.push(start);
  }
  if (end) {
    query += ' AND created_at <= ?';
    countQuery += ' AND created_at <= ?';
    params.push(end);
    countParams.push(end);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);

  const rows = db.prepare(query).all(...params) as AuditLogEntry[];
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  const logs = rows.map(row => ({
    ...row,
    metadata: row.metadata
      ? (() => { try { return JSON.parse(row.metadata as string); } catch { return row.metadata; } })()
      : null,
  }));

  return { logs, total };
}
