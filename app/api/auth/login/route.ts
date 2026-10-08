/**
 * Authentication Route Handlers: Login & Me
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, validateSession } from '@/lib/auth/session';
import { checkLoginRateLimit } from '@/lib/security/rate-limiter';
import { validateInput, loginSchema } from '@/lib/security/validation';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { AuditActions } from '@/lib/audit/types';
import { getClientIP, getUserAgent } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  // 1. Rate Limiting check
  const rateLimit = checkLoginRateLimit(ipAddress);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // 2. Input Validation (Zod)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(loginSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const { email, password } = validation.data;

  // 3. User Lookup
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  // If user doesn't exist, simulate verification to prevent timing attacks
  if (!user) {
    await verifyPassword(
      '$argon2id$v=19$m=65536,t=3,p=4$dummyDummyDummyDummy$dummyDummyDummyDummyDummyDummyDummyDummy',
      password
    );

    await AuditLogger.log({
      action: AuditActions.LOGIN_FAILURE,
      actorEmail: email,
      resource: 'Session',
      ipAddress,
      result: 'FAILURE',
      severity: 'WARNING',
      metadata: { reason: 'User not found', userAgent },
    });

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // 4. Account Lockout Check
  if (user.status === 'LOCKED' || (user.lockedUntil && user.lockedUntil > new Date())) {
    await AuditLogger.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AuditActions.ACCOUNT_LOCKED,
      resource: 'Session',
      ipAddress,
      result: 'BLOCKED',
      severity: 'WARNING',
      metadata: { lockedUntil: user.lockedUntil },
    });

    return NextResponse.json(
      { error: 'Account is temporarily locked due to repeated failed login attempts' },
      { status: 423 }
    );
  }

  if (user.status === 'INACTIVE') {
    return NextResponse.json({ error: 'Account is deactivated. Contact security administrator.' }, { status: 403 });
  }

  // 5. Password Verification (Argon2id)
  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    const updatedFailedAttempts = user.failedLogins + 1;
    const lockThreshold = parseInt(process.env.ACCOUNT_LOCKOUT_THRESHOLD || '5', 10);
    const lockDurationMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '15', 10);

    const isNowLocked = updatedFailedAttempts >= lockThreshold;
    const lockedUntil = isNowLocked ? new Date(Date.now() + lockDurationMinutes * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: updatedFailedAttempts,
        status: isNowLocked ? 'LOCKED' : user.status,
        lockedUntil,
      },
    });

    await AuditLogger.log({
      actorId: user.id,
      actorEmail: user.email,
      action: isNowLocked ? AuditActions.ACCOUNT_LOCKED : AuditActions.LOGIN_FAILURE,
      resource: 'Session',
      ipAddress,
      result: 'FAILURE',
      severity: isNowLocked ? 'WARNING' : 'INFO',
      metadata: { failedAttempts: updatedFailedAttempts, userAgent },
    });

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // 6. Reset failed login counter and set lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // 7. Create Encrypted Session
  const roles = user.userRoles.map((ur) => ur.role.name);
  await createSession(user.id, user.email, roles, ipAddress);

  // 8. Audit Success
  await AuditLogger.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AuditActions.LOGIN_SUCCESS,
    resource: 'Session',
    ipAddress,
    result: 'SUCCESS',
    severity: 'INFO',
    metadata: { roles, userAgent },
  });

  return NextResponse.json({
    message: 'Authentication successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
    },
  });
}
