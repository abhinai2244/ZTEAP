/**
 * Resource Service
 *
 * Manages internal applications/resources with RBAC, ownership, and sensitivity controls.
 */

import { prisma } from '../db';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { RoleName, SensitivityLevel, RiskLevel } from '@prisma/client';

export class ResourceService {
  /**
   * Create a new internal application / resource.
   */
  static async createResource(
    data: {
      name: string;
      description: string;
      sensitivity?: SensitivityLevel;
      requiredRole?: RoleName;
      riskLevel?: RiskLevel;
      requiresApproval?: boolean;
    },
    ownerId: string,
    actorId: string,
    actorEmail: string,
    ipAddress?: string
  ) {
    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        description: data.description,
        sensitivity: data.sensitivity ?? SensitivityLevel.INTERNAL,
        requiredRole: data.requiredRole ?? RoleName.EMPLOYEE,
        riskLevel: data.riskLevel ?? RiskLevel.LOW,
        requiresApproval: data.requiresApproval ?? false,
        ownerId,
      },
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.RESOURCE_CREATED,
      resource: resource.name,
      resourceId: resource.id,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { sensitivity: resource.sensitivity, requiredRole: resource.requiredRole },
    });

    return resource;
  }

  /**
   * Get resource by ID with owner and policy details.
   */
  static async getResourceById(resourceId: string) {
    return prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        policies: true,
      },
    });
  }

  /**
   * List all resources with pagination.
   */
  static async listResources(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          policies: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.resource.count(),
    ]);

    return { resources, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * List resources owned by a specific user.
   */
  static async getResourcesByOwner(ownerId: string) {
    return prisma.resource.findMany({
      where: { ownerId },
      include: { policies: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update an existing resource. Enforces ownership or admin role.
   */
  static async updateResource(
    resourceId: string,
    data: {
      name?: string;
      description?: string;
      sensitivity?: SensitivityLevel;
      requiredRole?: RoleName;
      riskLevel?: RiskLevel;
      isActive?: boolean;
      requiresApproval?: boolean;
    },
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new Error('Resource not found');

    const isOwner = resource.ownerId === actorId;
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');

    if (!isOwner && !isAdmin) {
      throw new Error('Access denied: you do not have permission to modify this resource');
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data,
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.RESOURCE_UPDATED,
      resource: updated.name,
      resourceId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: data,
    });

    return updated;
  }

  /**
   * Delete a resource. Enforces ownership or admin role.
   */
  static async deleteResource(
    resourceId: string,
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new Error('Resource not found');

    const isOwner = resource.ownerId === actorId;
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');

    if (!isOwner && !isAdmin) {
      throw new Error('Access denied: you do not have permission to delete this resource');
    }

    await prisma.resource.delete({ where: { id: resourceId } });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.RESOURCE_DELETED,
      resource: resource.name,
      resourceId,
      ipAddress,
      result: 'SUCCESS',
      severity: 'WARNING',
    });
  }
}
