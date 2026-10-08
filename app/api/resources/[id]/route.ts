/**
 * Resource Detail, Update, and Deletion Route Handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { ResourceService } from '@/lib/services/ResourceService';
import { validateInput, updateResourceSchema } from '@/lib/security/validation';
import { RoleName, SensitivityLevel, RiskLevel } from '@prisma/client';

export const GET = withAuth(async (req, session, context) => {
  const resourceId = context?.params?.id;
  if (!resourceId) return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });

  const resource = await ResourceService.getResourceById(resourceId);
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  return NextResponse.json(resource);
});

export const PATCH = withAuth(async (req, session, context) => {
  const resourceId = context?.params?.id;
  if (!resourceId) return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(updateResourceSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const updated = await ResourceService.updateResource(
      resourceId,
      {
        name: validation.data.name,
        description: validation.data.description,
        sensitivity: validation.data.sensitivity as SensitivityLevel,
        requiredRole: validation.data.requiredRole as RoleName,
        riskLevel: validation.data.riskLevel as RiskLevel,
        requiresApproval: validation.data.requiresApproval,
      },
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update resource' }, { status: 403 });
  }
});

export const DELETE = withAuth(async (req, session, context) => {
  const resourceId = context?.params?.id;
  if (!resourceId) return NextResponse.json({ error: 'Missing resource ID' }, { status: 400 });

  const ipAddress = getClientIP(req);

  try {
    await ResourceService.deleteResource(
      resourceId,
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );
    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete resource' }, { status: 403 });
  }
});
