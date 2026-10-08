/**
 * Authentication Route Handlers: Logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { destroySession, validateSession } from '@/lib/auth/session';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { AuditActions } from '@/lib/audit/types';
import { getClientIP } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
  const session = await validateSession();
  const ipAddress = getClientIP(req);

  if (session && session.userId) {
    await AuditLogger.log({
      actorId: session.userId,
      actorEmail: session.email,
      action: AuditActions.LOGOUT,
      resource: 'Session',
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
    });
  }

  await destroySession();

  return NextResponse.json({ message: 'Logged out successfully' });
}
