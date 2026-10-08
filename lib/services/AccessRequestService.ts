/**
 * Access Request Service
 *
 * Implements the core Zero-Trust access request workflow.
 * Connects the AccessRequest lifecycle directly with PolicyEngine and RiskEngine.
 * Enforces server-side authorization, IDOR protection, and immutable audit logging.
 */

import { prisma } from '../db';
import { PolicyEngine } from '../policy/PolicyEngine';
import { RiskEngine } from '../risk/RiskEngine';
import { PolicyEvaluationRequest } from '../policy/types';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { AccessRequestStatus, RoleName } from '@prisma/client';

export class AccessRequestService {
  private static policyEngine = new PolicyEngine();
  private static riskEngine = new RiskEngine();

  /**
   * Submit and dynamically evaluate a new access request.
   */
  static async createAccessRequest(params: {
    userId: string;
    resourceId: string;
    deviceId: string;
    reason: string;
    actorId: string;
    actorEmail: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { userId, resourceId, deviceId, reason, actorId, actorEmail, ipAddress = '127.0.0.1', userAgent = 'unknown' } = params;

    // IDOR Check: Users can only request access for themselves
    if (userId !== actorId) {
      await AuditLogger.log({
        actorId,
        actorEmail,
        action: AuditActions.SUSPICIOUS_ACTIVITY,
        resource: 'AccessRequest',
        result: 'BLOCKED',
        severity: 'WARNING',
        metadata: { attemptedUserId: userId, reason: 'IDOR attempt on access request submission' },
      });
      throw new Error('Access denied: cannot submit requests for other users');
    }

    // 1. Fetch User details including roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Fetch Device details (must belong to this user)
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device || device.userId !== userId) {
      throw new Error('Device not found or not registered to user');
    }

    // 3. Fetch Resource and active Policies
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        policies: { where: { isActive: true } },
      },
    });
    if (!resource) {
      throw new Error('Resource not found');
    }
    if (!resource.isActive) {
      throw new Error('Resource is currently inactive');
    }

    const activePolicy = resource.policies[0];
    const userRoles = user.userRoles.map((ur) => ur.role.name);

    // 4. Construct Zero-Trust Policy Evaluation Context
    const evalRequest: PolicyEvaluationRequest = {
      userId: user.id,
      userEmail: user.email,
      userRoles,
      userStatus: user.status,
      userFailedLogins: user.failedLogins,
      deviceId: device.id,
      deviceStatus: device.status,
      deviceIsManaged: device.isManaged,
      deviceTrustScore: device.trustScore,
      deviceComplianceStatus: device.complianceStatus,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceSensitivity: resource.sensitivity,
      resourceRequiredRole: resource.requiredRole,
      resourceRiskLevel: resource.riskLevel,
      resourceRequiresApproval: resource.requiresApproval,
      requestTime: new Date(),
      requestReason: reason,
      ipAddress,
      userAgent,
      policyMaxRiskLevel: activePolicy?.maxRiskLevel ?? 60,
      policyAllowedTimeStart: activePolicy?.allowedTimeStart,
      policyAllowedTimeEnd: activePolicy?.allowedTimeEnd,
      policyAllowedDays: activePolicy?.allowedDays,
      policyRequiresManagedDevice: activePolicy?.requiresManagedDevice ?? false,
    };

    // 5. Run Policy and Risk Evaluation Engines
    const policyDecision = this.policyEngine.evaluateAccess(evalRequest);
    const riskAssessment = this.riskEngine.assess(evalRequest);

    // 6. Map decision to initial AccessRequest status
    let initialStatus: AccessRequestStatus = AccessRequestStatus.PENDING;
    if (policyDecision.decision === 'ALLOW') {
      initialStatus = AccessRequestStatus.APPROVED;
    } else if (policyDecision.decision === 'DENY') {
      initialStatus = AccessRequestStatus.DENIED;
    } else if (policyDecision.decision === 'STEP_UP_AUTHENTICATION') {
      initialStatus = AccessRequestStatus.STEP_UP_REQUIRED;
    } else if (policyDecision.decision === 'REQUIRE_APPROVAL') {
      initialStatus = AccessRequestStatus.PENDING;
    }

    // 7. Atomic persistence of AccessRequest, AccessDecision, and RiskAssessment
    const createdRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.accessRequest.create({
        data: {
          userId,
          resourceId,
          deviceId,
          reason,
          status: initialStatus,
        },
      });

      await tx.accessDecision.create({
        data: {
          requestId: request.id,
          decision: policyDecision.decision,
          decisionReason: policyDecision.decisionReason,
          decidedBy: 'POLICY_ENGINE',
          decidedAt: policyDecision.timestamp,
        },
      });

      await tx.riskAssessment.create({
        data: {
          requestId: request.id,
          score: riskAssessment.score,
          level: riskAssessment.level,
          factors: riskAssessment.factors as any,
          calculatedAt: new Date(),
        },
      });

      return tx.accessRequest.findUnique({
        where: { id: request.id },
        include: {
          resource: true,
          device: true,
          decision: true,
          riskAssessment: true,
        },
      });
    });

    // 8. Immutable Audit Log Generation
    const auditAction =
      policyDecision.decision === 'ALLOW'
        ? AuditActions.ACCESS_ALLOWED
        : policyDecision.decision === 'DENY'
        ? AuditActions.ACCESS_DENIED
        : policyDecision.decision === 'STEP_UP_AUTHENTICATION'
        ? AuditActions.ACCESS_STEP_UP
        : AuditActions.ACCESS_APPROVAL_REQUIRED;

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: auditAction,
      resource: resource.name,
      resourceId: resource.id,
      ipAddress,
      result: policyDecision.decision,
      severity: policyDecision.riskLevel === 'CRITICAL' ? 'CRITICAL' : policyDecision.decision === 'DENY' ? 'WARNING' : 'INFO',
      metadata: {
        requestId: createdRequest?.id,
        riskScore: riskAssessment.score,
        riskLevel: riskAssessment.level,
        decisionReason: policyDecision.decisionReason,
        deviceStatus: device.status,
      },
    });

    return createdRequest;
  }

  /**
   * Get single request by ID with IDOR protection.
   */
  static async getRequestById(requestId: string, actorId: string, actorRoles: RoleName[]) {
    const isPrivileged = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN') || actorRoles.includes('AUDITOR');

    const request = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        resource: true,
        device: true,
        decision: true,
        riskAssessment: true,
        approvals: { include: { approver: { select: { id: true, email: true, firstName: true, lastName: true } } } },
      },
    });

    if (!request) {
      throw new Error('Access request not found');
    }

    // IDOR Check: Non-privileged users can only view their own requests or requests for resources they own
    if (!isPrivileged && request.userId !== actorId && request.resource.ownerId !== actorId) {
      throw new Error('Access denied: insufficient permissions to view this request');
    }

    return request;
  }

  /**
   * Get all requests for a specific user (Employee dashboard).
   */
  static async getUserRequests(userId: string, actorId: string) {
    if (userId !== actorId) {
      throw new Error('Access denied: cannot view another user\'s requests');
    }

    return prisma.accessRequest.findMany({
      where: { userId },
      include: {
        resource: true,
        device: true,
        decision: true,
        riskAssessment: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  /**
   * Get all requests across the entire system (Security Admin & Auditor).
   */
  static async getAllRequests() {
    return prisma.accessRequest.findMany({
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

  /**
   * Get requests specifically for resources owned by the actor.
   */
  static async getResourceRequests(resourceId: string, actorId: string) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.ownerId !== actorId) {
      throw new Error('Access denied: you do not own this resource');
    }

    return prisma.accessRequest.findMany({
      where: { resourceId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        device: true,
        decision: true,
        riskAssessment: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
