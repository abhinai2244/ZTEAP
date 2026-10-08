/**
 * Policy Creation Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { PolicyService } from '@/lib/services/PolicyService';
import { validateInput, createPolicySchema } from '@/lib/security/validation';
import { RoleName } from '@prisma/client';

export const POST = withAuth(async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(createPolicySchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const policy = await PolicyService.createPolicy(
      {
        resourceId: validation.data.resourceId,
        requiredRole: validation.data.requiredRole as RoleName | undefined,
        maxRiskLevel: validation.data.maxRiskLevel,
        allowedTimeStart: validation.data.allowedTimeStart,
        allowedTimeEnd: validation.data.allowedTimeEnd,
        allowedDays: validation.data.allowedDays,
        requiresManagedDevice: validation.data.requiresManagedDevice,
      },
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );

    return NextResponse.json(policy, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create policy' }, { status: 403 });
  }
});
