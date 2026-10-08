/**
 * Audit Log Route Handler: Query & Filtering
 *
 * Security Controls:
 * - Read-only endpoint for Auditor, Security Admin, System Admin.
 * - Input validation of pagination and query parameters.
 * - Sensitive metadata fields are sanitized.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/auth/middleware';
import { AuditLogger } from '@/lib/audit/AuditLogger';
import { validateInput, auditQuerySchema } from '@/lib/security/validation';

export const GET = withRoles(
  ['AUDITOR', 'SECURITY_ADMIN', 'SYSTEM_ADMIN'],
  async (req, session) => {
    const { searchParams } = new URL(req.url);

    const queryData = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      action: searchParams.get('action') || undefined,
      severity: searchParams.get('severity') || undefined,
      actorId: searchParams.get('actorId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const validation = validateInput(auditQuerySchema, queryData);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    const { page, limit, action, severity, actorId, startDate, endDate } = validation.data;

    const result = await AuditLogger.query({
      page,
      limit,
      action,
      severity,
      actorId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(result);
  }
);
