/**
 * Role Assignment Route Handlers
 *
 * Security Controls:
 * - Security Admin or System Admin role required.
 * - Prevents Self-Assignment: Admins cannot change their own roles to escalate privileges.
 * - Audit logging of all role modification events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, getClientIP } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/UserService';
import { validateInput, assignRoleSchema } from '@/lib/security/validation';
import { RoleName } from '@prisma/client';

export const POST = withRoles(
  ['SECURITY_ADMIN', 'SYSTEM_ADMIN'],
  async (req, session, context) => {
    const targetUserId = context?.params?.id;
    if (!targetUserId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const validation = validateInput(assignRoleSchema, { ...(body as any), userId: targetUserId });
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    const ipAddress = getClientIP(req);

    try {
      const assigned = await UserService.assignRole(
        targetUserId,
        validation.data.roleName as RoleName,
        session.userId,
        session.email,
        ipAddress
      );
      return NextResponse.json(assigned, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to assign role' }, { status: 400 });
    }
  }
);

export const DELETE = withRoles(
  ['SECURITY_ADMIN', 'SYSTEM_ADMIN'],
  async (req, session, context) => {
    const targetUserId = context?.params?.id;
    if (!targetUserId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const roleName = searchParams.get('roleName') as RoleName | null;
    if (!roleName) return NextResponse.json({ error: 'Missing roleName parameter' }, { status: 400 });

    const ipAddress = getClientIP(req);

    try {
      await UserService.revokeRole(
        targetUserId,
        roleName,
        session.userId,
        session.email,
        ipAddress
      );
      return NextResponse.json({ message: `Role ${roleName} revoked successfully` });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to revoke role' }, { status: 400 });
    }
  }
);
