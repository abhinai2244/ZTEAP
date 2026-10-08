/**
 * User Detail & Status Route Handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/UserService';
import { validateInput, updateUserSchema } from '@/lib/security/validation';

export const GET = withAuth(async (req, session, context) => {
  const targetId = context?.params?.id;
  if (!targetId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  const isPrivileged = session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN') || session.roles.includes('AUDITOR');
  if (!isPrivileged && targetId !== session.userId) {
    return NextResponse.json({ error: 'Access denied: cannot inspect another user profile' }, { status: 403 });
  }

  const user = await UserService.getUserById(targetId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(user);
});

export const PATCH = withAuth(async (req, session, context) => {
  const targetId = context?.params?.id;
  if (!targetId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  const isAdmin = session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Access denied: only Security Admins can alter user status' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(updateUserSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    if (validation.data.status === 'INACTIVE') {
      const disabled = await UserService.disableUser(targetId, session.userId, session.email, ipAddress);
      return NextResponse.json(disabled);
    }
    return NextResponse.json({ message: 'Update completed' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 400 });
  }
});
