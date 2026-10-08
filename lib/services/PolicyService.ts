/**
 * Policy Service
 *
 * Manages ResourcePolicy rules and constraints.
 * Admin and Resource Owners can define granular access policies.
 */

import { prisma } from '../db';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { RoleName } from '@prisma/client';

export class PolicyService {
  /**
   * Create a new access policy for a resource.
   */
  static async createPolicy(
    data: {
      resourceId: string;
      requiredRole?: RoleName | null;
      maxRiskLevel?: number;
      allowedTimeStart?: string | null;
      allowedTimeEnd?: string | null;
      allowedDays?: string | null;
      requiresManagedDevice?: boolean;
    },
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const resource = await prisma.resource.findUnique({ where: { id: data.resourceId } });
    if (!resource) throw new Error('Resource not found');

    const isOwner = resource.ownerId === actorId;
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');
    if (!isOwner && !isAdmin) {
      throw new Error('Access denied: insufficient permissions to create policy for this resource');
    }

    const policy = await prisma.resourcePolicy.create({
      data: {
        resourceId: data.resourceId,
        requiredRole: data.requiredRole,
        maxRiskLevel: data.maxRiskLevel ?? 60,
        allowedTimeStart: data.allowedTimeStart,
        allowedTimeEnd: data.allowedTimeEnd,
        allowedDays: data.allowedDays,
        requiresManagedDevice: data.requiresManagedDevice ?? false,
      },
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.POLICY_CREATED,
      resource: resource.name,
      resourceId: policy.id,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { resourceId: data.resourceId, maxRiskLevel: policy.maxRiskLevel },
    });

    return policy;
  }

  /**
   * Update an existing policy.
   */
  static async updatePolicy(
    policyId: string,
    data: {
      requiredRole?: RoleName | null;
      maxRiskLevel?: number;
      allowedTimeStart?: string | null;
      allowedTimeEnd?: string | null;
      allowedDays?: string | null;
      requiresManagedDevice?: boolean;
      isActive?: boolean;
    },
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const policy = await prisma.resourcePolicy.findUnique({
      where: { id: policyId },
      include: { resource: true },
    });
    if (!policy) throw new Error('Policy not found');

    const isOwner = policy.resource.ownerId === actorId;
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');
    if (!isOwner && !isAdmin) {
      throw new Error('Access denied: insufficient permissions to update policy');
    }

    const updated = await prisma.resourcePolicy.update({
      where: { id: policyId },
      data,
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.POLICY_UPDATED,
      resource: policy.resource.name,
      resourceId: policyId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: data,
    });

    return updated;
  }

  /**
   * Delete an existing policy.
   */
  static async deletePolicy(
    policyId: string,
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const policy = await prisma.resourcePolicy.findUnique({
      where: { id: policyId },
      include: { resource: true },
    });
    if (!policy) throw new Error('Policy not found');

    const isOwner = policy.resource.ownerId === actorId;
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');
    if (!isOwner && !isAdmin) {
      throw new Error('Access denied: insufficient permissions to delete policy');
    }

    await prisma.resourcePolicy.delete({ where: { id: policyId } });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.POLICY_DELETED,
      resource: policy.resource.name,
      resourceId: policyId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'WARNING',
    });
  }
}
