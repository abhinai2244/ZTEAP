/**
 * Security Admin Dashboard Stats Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRoles } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db';

export const GET = withRoles(
  ['SECURITY_ADMIN', 'SYSTEM_ADMIN'],
  async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      totalRequests,
      deniedRequests,
      pendingRequests,
      highRiskRequests,
      recentSecurityEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'LOCKED' } }),
      prisma.accessRequest.count(),
      prisma.accessRequest.count({ where: { status: 'DENIED' } }),
      prisma.accessRequest.count({ where: { status: 'PENDING' } }),
      prisma.riskAssessment.count({
        where: { level: { in: ['HIGH', 'CRITICAL'] } },
      }),
      prisma.auditLog.findMany({
        where: {
          severity: { in: ['WARNING', 'ERROR', 'CRITICAL'] },
          timestamp: { gte: oneDayAgo },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsers,
        lockedUsers,
        totalRequests,
        deniedRequests,
        pendingRequests,
        highRiskRequests,
      },
      recentSecurityEvents,
    });
  }
);
