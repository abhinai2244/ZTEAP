/**
 * Audit Logger
 * 
 * Creates immutable audit records for all security-relevant events.
 * 
 * Security Controls:
 * - Append-only design (no update/delete operations)
 * - Structured logging with correlation IDs
 * - Severity classification
 * - NEVER logs passwords, tokens, or secrets
 */

import { prisma } from '../db';
import { AuditEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class AuditLogger {
  /**
   * Log an audit event. This is append-only — no update or delete.
   */
  static async log(event: AuditEvent): Promise<void> {
    try {
      // Sanitize metadata to prevent logging sensitive data
      const sanitizedMetadata = event.metadata
        ? AuditLogger.sanitizeMetadata(event.metadata)
        : undefined;

      await prisma.auditLog.create({
        data: {
          actorId: event.actorId,
          actorEmail: event.actorEmail,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          ipAddress: event.ipAddress,
          result: event.result,
          severity: event.severity,
          correlationId: event.correlationId || uuidv4(),
          metadata: sanitizedMetadata as any,
        },
      });
    } catch (error) {
      // Audit logging should never crash the application
      // Log to console as fallback
      console.error('[AUDIT_FALLBACK]', JSON.stringify({
        ...event,
        metadata: undefined, // Don't log metadata in fallback
        error: 'Failed to write audit log to database',
      }));
    }
  }

  /**
   * Remove sensitive fields from metadata before logging.
   */
  private static sanitizeMetadata(
    metadata: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'passwordHash'];
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Query audit logs with filtering and pagination.
   */
  static async query(params: {
    page?: number;
    limit?: number;
    action?: string;
    severity?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.severity) where.severity = params.severity;
    if (params.actorId) where.actorId = params.actorId;
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
