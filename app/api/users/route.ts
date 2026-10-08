/**
 * User Management Route Handlers: List & Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles, getClientIP } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/UserService';
import { validateInput, createUserSchema } from '@/lib/security/validation';
import { RoleName } from '@prisma/client';

/**
 * GET /api/users - List users (Admin / Auditor only)
 */
export const GET = withRoles(
  ['SECURITY_ADMIN', 'SYSTEM_ADMIN', 'AUDITOR'],
  async (req, session) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await UserService.listUsers(page, limit);
    return NextResponse.json(result);
  }
);

/**
 * POST /api/users - Create new user (Security Admin / System Admin only)
 */
export const POST = withRoles(
  ['SECURITY_ADMIN', 'SYSTEM_ADMIN'],
  async (req, session) => {
    const ipAddress = getClientIP(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const validation = validateInput(createUserSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    try {
      const newUser = await UserService.createUser(
        {
          email: validation.data.email,
          password: validation.data.password,
          firstName: validation.data.firstName,
          lastName: validation.data.lastName,
          roles: validation.data.roles as RoleName[],
        },
        session.userId,
        session.email,
        ipAddress
      );

      return NextResponse.json(newUser, { status: 201 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 400 });
    }
  }
);
