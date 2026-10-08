/**
 * Approval Service
 *
 * Implements resource owner and security administrator approval workflow.
 *
 * Security Controls:
 * - Anti-Self-Approval: Users cannot approve their own access requests under any role.
 * - Resource Ownership Validation: Only resource owners or Security Admins can approve.
 * - Immutable Audit Logging: Every approval or rejection is recorded with metadata.
 */

import { prisma } from '../db';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { AccessRequestStatus, ApprovalAction, RoleName } from '@prisma/client';

export class ApprovalService {
  /**
   * Approve an access request.
   */
  static async approveRequest(params: {
    requestId: string;
    approverId: string;
    approverEmail: string;
    approverRoles: RoleName[];
    reason?: string;
    ipAddress?: string;
  }) {
    const { requestId, approverId, approverEmail, approverRoles, reason, ipAddress } = params;

    const request = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { resource: true },
    });
    if (!request) {
      throw new Error('Access request not found');
    }

    // 1. SECURITY CONTROL: Prevent self-approval
    if (request.userId === approverId) {
      await AuditLogger.log({
        actorId: approverId,
        actorEmail: approverEmail,
        action: AuditActions.SELF_APPROVAL_ATTEMPT,
        resource: 'AccessRequest',
        resourceId: requestId,
        ipAddress,
        result: 'BLOCKED',
        severity: 'CRITICAL',
        metadata: { attemptedRequestId: requestId, reason: 'Self-approval is strictly forbidden' },
      });
      throw new Error('Security policy violation: Users cannot approve their own access requests');
    }

    // 2. Authorization check: Must be resource owner or Security Admin
    const isOwner = request.resource.ownerId === approverId;
    const isSecurityAdmin = approverRoles.includes('SECURITY_ADMIN') || approverRoles.includes('SYSTEM_ADMIN');

    if (!isOwner && !isSecurityAdmin) {
      throw new Error('Access denied: only the resource owner or security administrator may approve this request');
    }

    // 3. Atomically update request status and record approval
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.accessRequest.update({
        where: { id: requestId },
        data: { status: AccessRequestStatus.APPROVED },
      });

      await tx.approval.create({
        data: {
          requestId,
          approverId,
          action: ApprovalAction.APPROVED,
          reason: reason || 'Approved by resource owner/admin',
          decidedAt: new Date(),
        },
      });

      await tx.accessDecision.upsert({
        where: { requestId },
        update: {
          decision: 'ALLOW',
          decisionReason: `Manually approved by ${approverEmail}: ${reason || 'Approved'}`,
          decidedBy: approverEmail,
          decidedAt: new Date(),
        },
        create: {
          requestId,
          decision: 'ALLOW',
          decisionReason: `Manually approved by ${approverEmail}: ${reason || 'Approved'}`,
          decidedBy: approverEmail,
          decidedAt: new Date(),
        },
      });

      return updatedRequest;
    });

    // 4. Audit Log
    await AuditLogger.log({
      actorId: approverId,
      actorEmail: approverEmail,
      action: AuditActions.REQUEST_APPROVED,
      resource: request.resource.name,
      resourceId: requestId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { requesterId: request.userId, approverReason: reason },
    });

    return result;
  }

  /**
   * Reject an access request.
   */
  static async rejectRequest(params: {
    requestId: string;
    approverId: string;
    approverEmail: string;
    approverRoles: RoleName[];
    reason?: string;
    ipAddress?: string;
  }) {
    const { requestId, approverId, approverEmail, approverRoles, reason, ipAddress } = params;

    const request = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { resource: true },
    });
    if (!request) {
      throw new Error('Access request not found');
    }

    const isOwner = request.resource.ownerId === approverId;
    const isSecurityAdmin = approverRoles.includes('SECURITY_ADMIN') || approverRoles.includes('SYSTEM_ADMIN');

    if (!isOwner && !isSecurityAdmin) {
      throw new Error('Access denied: only the resource owner or security administrator may reject this request');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.accessRequest.update({
        where: { id: requestId },
        data: { status: AccessRequestStatus.DENIED },
      });

      await tx.approval.create({
        data: {
          requestId,
          approverId,
          action: ApprovalAction.REJECTED,
          reason: reason || 'Rejected by resource owner/admin',
          decidedAt: new Date(),
        },
      });

      await tx.accessDecision.upsert({
        where: { requestId },
        update: {
          decision: 'DENY',
          decisionReason: `Manually rejected by ${approverEmail}: ${reason || 'Rejected'}`,
          decidedBy: approverEmail,
          decidedAt: new Date(),
        },
        create: {
          requestId,
          decision: 'DENY',
          decisionReason: `Manually rejected by ${approverEmail}: ${reason || 'Rejected'}`,
          decidedBy: approverEmail,
          decidedAt: new Date(),
        },
      });

      return updatedRequest;
    });

    await AuditLogger.log({
      actorId: approverId,
      actorEmail: approverEmail,
      action: AuditActions.REQUEST_REJECTED,
      resource: request.resource.name,
      resourceId: requestId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { requesterId: request.userId, rejectionReason: reason },
    });

    return result;
  }

  /**
   * Get pending access requests for an approver.
   * Resource owners see pending requests for their owned resources.
   * Security Admins see all pending requests.
   */
  static async getPendingApprovals(approverId: string, approverRoles: RoleName[]) {
    const isSecurityAdmin = approverRoles.includes('SECURITY_ADMIN') || approverRoles.includes('SYSTEM_ADMIN');

    const whereClause: any = {
      status: AccessRequestStatus.PENDING,
    };

    if (!isSecurityAdmin) {
      whereClause.resource = { ownerId: approverId };
    }

    return prisma.accessRequest.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        resource: true,
        device: true,
        decision: true,
        riskAssessment: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
