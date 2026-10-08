/**
 * Access Request Detail Route Handler
 * Returns full evaluation breakdown: decision, risk score, and contributing factors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { AccessRequestService } from '@/lib/services/AccessRequestService';

export const GET = withAuth(async (req, session, context) => {
  const requestId = context?.params?.id;
  if (!requestId) return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });

  try {
    const request = await AccessRequestService.getRequestById(requestId, session.userId, session.roles);
    return NextResponse.json(request);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Access request not found' }, { status: 404 });
  }
});
