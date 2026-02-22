import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import db from '@/utils/db';
import { applySessionCookie, clearChallenge, createSession, createUser, getChallenge, getUserByUsername, getOriginFromRequest, getRpIdFromRequest } from '@/utils/auth';
import { writeAuditLog, extractRequestInfo, AuditAction } from '@/utils/auditLog';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const credential = body.credential;

  const { ipAddress, userAgent } = extractRequestInfo(req);

  if (!username || !credential) {
    return NextResponse.json({ error: 'Missing username or credential data' }, { status: 400 });
  }

  const challenge = getChallenge(username);
  if (!challenge || challenge.type !== 'registration') {
    writeAuditLog(null, AuditAction.AUTH_REGISTER_FAILURE, ipAddress, userAgent, { username, reason: 'no_challenge' });
    return NextResponse.json({ error: 'Registration challenge not found' }, { status: 400 });
  }

  if (getUserByUsername(username)) {
    clearChallenge(username);
    writeAuditLog(null, AuditAction.AUTH_REGISTER_FAILURE, ipAddress, userAgent, { username, reason: 'username_taken' });
    return NextResponse.json({ error: 'Username already registered' }, { status: 409 });
  }

  let verification;
  try {
    const expectedOrigin = getOriginFromRequest(req);
    const expectedRPID = getRpIdFromRequest(req);
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error('Registration verification error:', err);
    clearChallenge(username);
    return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    clearChallenge(username);
    writeAuditLog(null, AuditAction.AUTH_REGISTER_FAILURE, ipAddress, userAgent, { username, reason: 'verification_failed' });
    return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
  }

  const { credential: registeredCredential } = verification.registrationInfo;
  const publicKey = Buffer.from(registeredCredential.publicKey).toString('base64');

  const user = createUser(challenge.userId, username);

  db.prepare(
    'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, transports, backed_up, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    user.id,
    registeredCredential.id,
    publicKey,
    registeredCredential.counter,
    verification.registrationInfo.credentialDeviceType ?? null,
    JSON.stringify(registeredCredential.transports ?? []),
    verification.registrationInfo.credentialBackedUp ? 1 : 0,
    new Date().toISOString()
  );

  const session = createSession(user.id);
  const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  applySessionCookie(response, session.id);
  clearChallenge(username);
  writeAuditLog(user.id, AuditAction.AUTH_REGISTER_SUCCESS, ipAddress, userAgent, { username });
  return response;
}
