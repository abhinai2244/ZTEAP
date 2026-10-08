/**
 * Request Approval / Rejection Action Handler
 *
 * Security Controls:
 * - Anti-Self-Approval: Requester cannot approve their own request under any role.
 * - Resource Ownership or Security Admin role verification.
 * - Audit logging of approval decision.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { ApprovalService } from '@/lib/services/ApprovalService';
import { validateInput, approvalActionSchema } from '@/lib/security/validation';

export const POST = withAuth(async (req, session, context) => {
  const requestId = context?.params?.id;
  if (!requestId) return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(approvalActionSchema, { ...(body as any), requestId });
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    if (validation.data.action === 'APPROVED') {
      const approved = await ApprovalService.approveRequest({
        requestId,
        approverId: session.userId,
        approverEmail: session.email,
        approverRoles: session.roles,
        reason: validation.data.reason,
        ipAddress,
      });
      return NextResponse.json({ message: 'Request approved successfully', request: approved });
    } else {
      const rejected = await ApprovalService.rejectRequest({
        requestId,
        approverId: session.userId,
        approverEmail: session.email,
        approverRoles: session.roles,
        reason: validation.data.reason,
        ipAddress,
      });
      return NextResponse.json({ message: 'Request rejected', request: rejected });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval action failed' }, { status: 403 });
  }
});
