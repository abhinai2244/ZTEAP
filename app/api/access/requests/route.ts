/**
 * Access Request Route Handlers: List & Submit
 *
 * This endpoint triggers the Zero-Trust Policy Engine and Risk Engine evaluation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP, getUserAgent } from '@/lib/auth/middleware';
import { AccessRequestService } from '@/lib/services/AccessRequestService';
import { validateInput, createAccessRequestSchema } from '@/lib/security/validation';

/**
 * GET /api/access/requests - List access requests
 * - Normal employees see only their requests
 * - Security Admins and Auditors see all requests
 */
export const GET = withAuth(async (req, session) => {
  const isAdminOrAuditor = session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN') || session.roles.includes('AUDITOR');
  const { searchParams } = new URL(req.url);
  const viewAll = searchParams.get('all') === 'true' && isAdminOrAuditor;

  if (viewAll) {
    const allRequests = await AccessRequestService.getAllRequests();
    return NextResponse.json({ requests: allRequests });
  }

  const userRequests = await AccessRequestService.getUserRequests(session.userId, session.userId);
  return NextResponse.json({ requests: userRequests });
});

/**
 * POST /api/access/requests - Submit and dynamically evaluate an access request
 */
export const POST = withAuth(async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(createAccessRequestSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    const accessRequest = await AccessRequestService.createAccessRequest({
      userId: session.userId,
      resourceId: validation.data.resourceId,
      deviceId: validation.data.deviceId,
      reason: validation.data.reason,
      actorId: session.userId,
      actorEmail: session.email,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(accessRequest, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process access request' }, { status: 400 });
  }
});
