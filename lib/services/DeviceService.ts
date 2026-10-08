/**
 * Device Service
 *
 * Manages device registration, trust scoring, and compliance status.
 *
 * Zero-Trust Principle:
 * "Never trust a device merely because the user authenticated."
 */

import { prisma } from '../db';
import { AuditLogger } from '../audit/AuditLogger';
import { AuditActions } from '../audit/types';
import { DeviceStatus, RoleName } from '@prisma/client';

export class DeviceService {
  /**
   * Register a new device for a user.
   */
  static async registerDevice(
    data: {
      name: string;
      os?: string;
      browser?: string;
      isManaged?: boolean;
    },
    userId: string,
    actorId: string,
    actorEmail: string,
    ipAddress?: string
  ) {
    if (userId !== actorId) {
      throw new Error('Access denied: cannot register a device for another user');
    }

    const isManaged = data.isManaged ?? false;
    const initialStatus = isManaged ? DeviceStatus.COMPLIANT : DeviceStatus.UNTRUSTED;
    const initialTrustScore = isManaged ? 70 : 30;

    const device = await prisma.device.create({
      data: {
        userId,
        name: data.name,
        os: data.os,
        browser: data.browser,
        status: initialStatus,
        isManaged,
        trustScore: initialTrustScore,
        complianceStatus: isManaged,
        lastSecurityCheck: new Date(),
      },
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.DEVICE_REGISTERED,
      resource: 'Device',
      resourceId: device.id,
      ipAddress,
      result: 'SUCCESS',
      severity: 'INFO',
      metadata: { deviceName: data.name, status: initialStatus, isManaged },
    });

    return device;
  }

  /**
   * Get all devices registered to a specific user.
   */
  static async getUserDevices(userId: string, actorId: string, actorRoles: RoleName[]) {
    const isPrivileged = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');

    if (!isPrivileged && userId !== actorId) {
      throw new Error('Access denied: cannot view another user\'s devices');
    }

    return prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific device by ID with IDOR protection.
   */
  static async getDeviceById(deviceId: string, actorId: string, actorRoles: RoleName[]) {
    const isPrivileged = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!device) throw new Error('Device not found');

    if (!isPrivileged && device.userId !== actorId) {
      throw new Error('Access denied: you do not own this device');
    }

    return device;
  }

  /**
   * Update device status and trust score (Security Administrator only).
   */
  static async updateDeviceStatus(
    deviceId: string,
    data: {
      status?: DeviceStatus;
      isManaged?: boolean;
      complianceStatus?: boolean;
      trustScore?: number;
    },
    actorId: string,
    actorRoles: RoleName[],
    actorEmail: string,
    ipAddress?: string
  ) {
    const isAdmin = actorRoles.includes('SECURITY_ADMIN') || actorRoles.includes('SYSTEM_ADMIN');
    if (!isAdmin) {
      throw new Error('Access denied: only Security Administrators can update device trust status');
    }

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: {
        ...data,
        lastSecurityCheck: new Date(),
      },
    });

    await AuditLogger.log({
      actorId,
      actorEmail,
      action: AuditActions.DEVICE_STATUS_CHANGED,
      resource: 'Device',
      resourceId: deviceId,
      ipAddress,
      result: 'SUCCESS',
      severity: data.status === 'COMPROMISED' ? 'CRITICAL' : 'WARNING',
      metadata: { newStatus: data.status, trustScore: data.trustScore, isManaged: data.isManaged },
    });

    return updated;
  }
}
