import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { RP_NAME, storeChallenge, getUserByUsername, getRpIdFromRequest } from '@/utils/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (getUserByUsername(username)) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const userId = crypto.randomUUID();

  const rpID = getRpIdFromRequest(req);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: username,
    userDisplayName: username,
    userID: isoUint8Array.fromUTF8String(userId),
    attestationType: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
    },
    excludeCredentials: [],
  });

  storeChallenge(username, { userId, challenge: options.challenge, type: 'registration' });

  return NextResponse.json(options);
}
