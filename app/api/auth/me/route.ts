/**
 * Authentication Route Handlers: Me (Current Session Info)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getPermissions } from '@/lib/authorization/rbac';

export async function GET(req: NextRequest) {
  const session = await validateSession();

  if (!session || !session.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      lastLoginAt: true,
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ authenticated: false, error: 'User inactive or not found' }, { status: 401 });
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = getPermissions(roles);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      lastLoginAt: user.lastLoginAt,
    },
  });
}
