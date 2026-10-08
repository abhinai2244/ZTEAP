/**
 * User Service
 * 
 * Business logic for user management.
 * All authorization is enforced server-side.
 */

import { prisma } from '../db';
import { hashPassword } from '../auth/password';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { RoleName, UserStatus } from '@prisma/client';

export class UserService {
  /**
   * Create a new user with specified roles.
   * Only Security Admin / System Admin can call this.
   */
  static async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roles: RoleName[];
  }, actorId: string, actorEmail: string, ipAddress?: string) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(data.password);

    // Create user and assign roles in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // Get role records and assign
      for (const roleName of data.roles) {
        const role = await tx.role.findUnique({ where: { name: roleName } });
        if (role) {
          await tx.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
              assignedBy: actorId,
            },
          });
        }
      }

      return newUser;
    });

    // Audit log
    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.USER_CREATED,
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { newUserEmail: data.email, assignedRoles: data.roles },
    });

    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }

  /**
   * Get user by ID with roles (never return passwordHash to client).
   */
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        status: true, failedLogins: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  /**
   * List all users with pagination.
   */
  static async listUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip, take: limit,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          status: true, lastLoginAt: true, createdAt: true,
          userRoles: { include: { role: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);
    return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Disable a user account.
   */
  static async disableUser(
    targetUserId: string,
    actorId: string,
    actorEmail: string,
    ipAddress?: string
  ) {
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'INACTIVE' },
    });

    await AuditLogger.log({
      actorId, actorEmail,
      action: AuditActions.USER_DISABLED,
      resource: 'User', resourceId: targetUserId,
      ipAddress, result: 'SUCCESS', severity: 'WARNING',
      metadata: { disabledUserEmail: user.email },
    });

    return user;
  }

  /**
   * Assign a role to a user. Prevents self-assignment for privilege escalation.
   */
  static async assignRole(
    targetUserId: string,
    roleName: RoleName,
    actorId: string,
    actorEmail: string,
    ipAddress?: string
  ) {
    // SECURITY: Prevent self role assignment
    if (actorId === targetUserId) {
      await AuditLogger.log({
        actorId, actorEmail,
        action: AuditActions.PRIVILEGE_ESCALATION_ATTEMPT,
        resource: 'Role', resourceId: targetUserId,
        ipAddress, result: 'BLOCKED', severity: 'CRITICAL',
        metadata: { attemptedRole: roleName, reason: 'Self-assignment blocked' },
      });
      throw new Error('Cannot assign roles to yourself');
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error('Role not found');

    // Check if already assigned
    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
    });
    if (existing) throw new Error('Role already assigned');

    const userRole = await prisma.userRole.create({
      data: { userId: targetUserId, roleId: role.id, assignedBy: actorId },
    });

    await AuditLogger.log({
      actorId, actorEmail,
      action: AuditActions.ROLE_ASSIGNED,
      resource: 'Role', resourceId: targetUserId,
      ipAddress, result: 'SUCCESS', severity: 'WARNING',
      metadata: { targetUserId, roleName },
    });

    return userRole;
  }

  /**
   * Revoke a role from a user.
   */
  static async revokeRole(
    targetUserId: string,
    roleName: RoleName,
    actorId: string,
    actorEmail: string,
    ipAddress?: string
  ) {
    if (actorId === targetUserId) {
      throw new Error('Cannot revoke roles from yourself');
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error('Role not found');

    await prisma.userRole.delete({
      where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
    });

    await AuditLogger.log({
      actorId, actorEmail,
      action: AuditActions.ROLE_REVOKED,
      resource: 'Role', resourceId: targetUserId,
      ipAddress, result: 'SUCCESS', severity: 'WARNING',
      metadata: { targetUserId, roleName },
    });
  }

  /**
   * Get dashboard stats for Security Admin.
   */
  static async getAdminDashboardStats() {
    const [totalUsers, activeUsers, lockedUsers, recentLogins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'LOCKED' } }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_SUCCESS',
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { totalUsers, activeUsers, lockedUsers, recentLogins };
  }
}
