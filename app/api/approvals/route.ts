/**
 * Approval Queue Route Handlers: List Pending Approvals
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ApprovalService } from '@/lib/services/ApprovalService';

export const GET = withAuth(async (req, session) => {
  const isApprover = session.roles.includes('RESOURCE_OWNER') || session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN');
  if (!isApprover) {
    return NextResponse.json({ error: 'Access denied: not authorized as an approver' }, { status: 403 });
  }

  const pending = await ApprovalService.getPendingApprovals(session.userId, session.roles);
  return NextResponse.json({ pending });
});
