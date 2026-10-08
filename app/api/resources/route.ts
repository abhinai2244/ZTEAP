/**
 * Resource Management Route Handlers: List & Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { ResourceService } from '@/lib/services/ResourceService';
import { validateInput, createResourceSchema } from '@/lib/security/validation';
import { RoleName, SensitivityLevel, RiskLevel } from '@prisma/client';

/**
 * GET /api/resources - List internal applications / resources
 */
export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const ownedOnly = searchParams.get('owned') === 'true';

  if (ownedOnly) {
    const owned = await ResourceService.getResourcesByOwner(session.userId);
    return NextResponse.json({ resources: owned });
  }

  const result = await ResourceService.listResources(page, limit);
  return NextResponse.json(result);
});

/**
 * POST /api/resources - Create new internal resource (Resource Owner or Admin)
 */
export const POST = withAuth(async (req, session) => {
  const canCreate = session.roles.includes('RESOURCE_OWNER') || session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN');
  if (!canCreate) {
    return NextResponse.json({ error: 'Access denied: only Resource Owners or Admins may create resources' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(createResourceSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const resource = await ResourceService.createResource(
      {
        name: validation.data.name,
        description: validation.data.description,
        sensitivity: validation.data.sensitivity as SensitivityLevel,
        requiredRole: validation.data.requiredRole as RoleName,
        riskLevel: validation.data.riskLevel as RiskLevel,
        requiresApproval: validation.data.requiresApproval,
      },
      session.userId,
      session.userId,
      session.email,
      ipAddress
    );

    return NextResponse.json(resource, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create resource' }, { status: 400 });
  }
});
