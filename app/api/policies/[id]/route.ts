/**
 * Policy Modification and Deletion Route Handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { PolicyService } from '@/lib/services/PolicyService';
import { RoleName } from '@prisma/client';

export const PATCH = withAuth(async (req, session, context) => {
  const policyId = context?.params?.id;
  if (!policyId) return NextResponse.json({ error: 'Missing policy ID' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const updated = await PolicyService.updatePolicy(
      policyId,
      {
        requiredRole: body.requiredRole as RoleName | undefined,
        maxRiskLevel: body.maxRiskLevel,
        allowedTimeStart: body.allowedTimeStart,
        allowedTimeEnd: body.allowedTimeEnd,
        allowedDays: body.allowedDays,
        requiresManagedDevice: body.requiresManagedDevice,
        isActive: body.isActive,
      },
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update policy' }, { status: 403 });
  }
});

export const DELETE = withAuth(async (req, session, context) => {
  const policyId = context?.params?.id;
  if (!policyId) return NextResponse.json({ error: 'Missing policy ID' }, { status: 400 });

  const ipAddress = getClientIP(req);

  try {
    await PolicyService.deletePolicy(
      policyId,
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );
    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete policy' }, { status: 403 });
  }
});
