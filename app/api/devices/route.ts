/**
 * Device Management Route Handlers: List & Register
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { DeviceService } from '@/lib/services/DeviceService';
import { validateInput, createDeviceSchema } from '@/lib/security/validation';
import { prisma } from '@/lib/db';

/**
 * GET /api/devices - List devices (users see their own, admins can view all or filter by user)
 */
export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId') || session.userId;

  const isAdmin = session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN');

  if (isAdmin && searchParams.get('all') === 'true') {
    const devices = await prisma.device.findMany({
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ devices });
  }

  const devices = await DeviceService.getUserDevices(targetUserId, session.userId, session.roles);
  return NextResponse.json({ devices });
});

/**
 * POST /api/devices - Register new device for current user
 */
export const POST = withAuth(async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(createDeviceSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const device = await DeviceService.registerDevice(
      {
        name: validation.data.name,
        os: validation.data.os,
        browser: validation.data.browser,
        isManaged: validation.data.isManaged,
      },
      session.userId,
      session.userId,
      session.email,
      ipAddress
    );

    return NextResponse.json(device, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to register device' }, { status: 400 });
  }
});
