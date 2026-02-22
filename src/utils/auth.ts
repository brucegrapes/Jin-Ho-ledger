import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import { encryptString } from './serverEncryption';

export interface UserRecord {
  id: string;
  username: string;
  created_at: string;
  encryption_key: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export const SESSION_COOKIE_NAME = 'myledger_session';
const defaultSessionTTL = 24 * 60 * 60;
const configuredTTL = Number.parseInt(process.env.SESSION_MAX_AGE_SECONDS || '', 10);
export const SESSION_MAX_AGE_SECONDS = Number.isFinite(configuredTTL) ? configuredTTL : defaultSessionTTL;
export const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
export const RP_ID = new URL(APP_ORIGIN).hostname;
export const RP_NAME = 'MyLedger';

const secureCookies = process.env.NODE_ENV === 'production' || APP_ORIGIN.startsWith('https');

/**
 * Derive the actual origin from the incoming request.
 * In development the port can shift (e.g. 3000 -> 3001), so we read the
 * Origin or Host header instead of relying solely on the env var.
 * In production APP_ORIGIN is authoritative.
 */
export function getOriginFromRequest(req: NextRequest): string {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const host = req.headers.get('host');
  if (host) {
    const protocol = req.headers.get('x-forwarded-proto') || (secureCookies ? 'https' : 'http');
    return `${protocol}://${host}`;
  }
  return APP_ORIGIN;
}

/** Derive RP ID from a request (hostname only). */
export function getRpIdFromRequest(req: NextRequest): string {
  const origin = getOriginFromRequest(req);
  return new URL(origin).hostname;
}

type ChallengeType = 'registration' | 'authentication';

interface ChallengeRecord {
  type: ChallengeType;
  challenge: string;
  userId: string;
  createdAt: string;
}

export function storeChallenge(username: string, payload: Omit<ChallengeRecord, 'createdAt'>) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO webauthn_challenges (username, user_id, challenge, type, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       user_id = excluded.user_id,
       challenge = excluded.challenge,
       type = excluded.type,
       created_at = excluded.created_at`
  ).run(username, payload.userId, payload.challenge, payload.type, now);
  return {
    ...payload,
    createdAt: now,
  };
}

export function getChallenge(username: string) {
  const row = db
    .prepare('SELECT user_id AS userId, challenge, type, created_at AS createdAt FROM webauthn_challenges WHERE username = ?')
    .get(username);
  if (!row) return null;
  return row as ChallengeRecord;
}

export function clearChallenge(username: string) {
  db.prepare('DELETE FROM webauthn_challenges WHERE username = ?').run(username);
}

export function getUserByUsername(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRecord | undefined;
}

export function getUserById(id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined;
}

export function assignLegacyDataToUser(userId: string) {
  db.prepare('UPDATE transactions SET user_id = ? WHERE user_id IS NULL').run(userId);
  db.prepare('UPDATE budgets SET user_id = ? WHERE user_id IS NULL').run(userId);
}

export function createUser(userId: string, username: string): UserRecord {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const encryptedKey = encryptString(rawKey);
  if (!encryptedKey) {
    throw new Error('Failed to encrypt per-user key');
  }
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO users (id, username, created_at, encryption_key) VALUES (?, ?, ?, ?)')
    .run(userId, username, createdAt, encryptedKey);
  assignLegacyDataToUser(userId);
  return {
    id: userId,
    username,
    created_at: createdAt,
    encryption_key: encryptedKey,
  };
}

export function createSession(userId: string): SessionRecord {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sessionId, userId, now.toISOString(), expiresAt.toISOString());
  return {
    id: sessionId,
    user_id: userId,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }; 
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
}

export function getSessionByToken(token?: string) {
  if (!token) return null;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(token) as SessionRecord | undefined;
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) {
    deleteSession(token);
    return null;
  }
  return session;
}

export function getUserFromSessionToken(token?: string) {
  const session = getSessionByToken(token);
  if (!session) return null;
  const user = getUserById(session.user_id);
  if (!user) {
    deleteSession(token!);
    return null;
  }
  return { session, user } as { session: SessionRecord; user: UserRecord };
}

export function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return getUserFromSessionToken(token);
}

export function applySessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: secureCookies,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'strict',
    secure: secureCookies,
  });
}