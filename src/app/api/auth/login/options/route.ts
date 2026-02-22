import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import db from '@/utils/db';
import { getUserByUsername, storeChallenge, getRpIdFromRequest } from '@/utils/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const credentials = db
    .prepare('SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?')
    .all(user.id) as { credential_id: string; transports: string | null }[];

  if (credentials.length === 0) {
    return NextResponse.json({ error: 'No credentials registered' }, { status: 400 });
  }

  const rpID = getRpIdFromRequest(req);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map(c => ({
      id: c.credential_id,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    userVerification: 'preferred',
  });

  storeChallenge(username, { userId: user.id, challenge: options.challenge, type: 'authentication' });

  return NextResponse.json(options);
}
