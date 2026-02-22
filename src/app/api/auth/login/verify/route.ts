import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import db from '@/utils/db';
import { getChallenge, clearChallenge, getUserByUsername, createSession, applySessionCookie, getOriginFromRequest, getRpIdFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const credential = body.credential;

  const { ipAddress, userAgent } = extractRequestInfo(req);

  if (!username || !credential) {
    writeAuditLog(null, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { reason: 'missing_fields' });
    return NextResponse.json({ error: 'Missing username or credential data' }, { status: 400 });
  }

  const challenge = getChallenge(username);
  if (!challenge || challenge.type !== 'authentication') {
    writeAuditLog(null, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { username, reason: 'no_challenge' });
    return NextResponse.json({ error: 'Authentication challenge missing' }, { status: 400 });
  }

  const user = getUserByUsername(username);
  if (!user) {
    clearChallenge(username);
    writeAuditLog(null, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { username, reason: 'user_not_found' });
    return NextResponse.json({ error: 'Unable to authenticate' }, { status: 401 });
  }

  interface StoredCredential {
    id: number;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    device_type: string | null;
    transports: string | null;
    backed_up: number;
    created_at: string;
  }

  const stored = db
    .prepare('SELECT * FROM webauthn_credentials WHERE user_id = ? AND credential_id = ?')
    .get(user.id, credential.id) as StoredCredential | undefined;

  if (!stored) {
    clearChallenge(username);
    writeAuditLog(user.id, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { username, reason: 'credential_not_found' });
    return NextResponse.json({ error: 'Credential not registered' }, { status: 404 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getOriginFromRequest(req),
      expectedRPID: getRpIdFromRequest(req),
      requireUserVerification: false,
      credential: {
        id: stored.credential_id,
        publicKey: Buffer.from(stored.public_key, 'base64'),
        counter: stored.counter,
        transports: stored.transports ? JSON.parse(stored.transports) : undefined,
      },
    });
  } catch (err) {
    console.error('Authentication verification error:', err);
    clearChallenge(username);
    writeAuditLog(user.id, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { username, reason: 'verification_exception' });
    return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
  }

  if (!verification.verified) {
    clearChallenge(username);
    writeAuditLog(user.id, AuditAction.AUTH_LOGIN_FAILURE, ipAddress, userAgent, { username, reason: 'verification_failed' });
    return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
  }

  db.prepare('UPDATE webauthn_credentials SET counter = ? WHERE id = ?')
    .run(verification.authenticationInfo.newCounter, stored.id);

  const session = createSession(user.id);
  const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  applySessionCookie(response, session.id);
  clearChallenge(username);
  writeAuditLog(user.id, AuditAction.AUTH_LOGIN_SUCCESS, ipAddress, userAgent, { username });
  return response;
}
