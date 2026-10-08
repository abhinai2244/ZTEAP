/**
 * Device Detail & Trust Status Management Route Handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientIP } from '@/lib/auth/middleware';
import { DeviceService } from '@/lib/services/DeviceService';
import { validateInput, updateDeviceSchema } from '@/lib/security/validation';
import { DeviceStatus } from '@prisma/client';

export const GET = withAuth(async (req, session, context) => {
  const deviceId = context?.params?.id;
  if (!deviceId) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

  try {
    const device = await DeviceService.getDeviceById(deviceId, session.userId, session.roles);
    return NextResponse.json(device);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Device not found' }, { status: 404 });
  }
});

/**
 * PATCH /api/devices/[id] - Update device trust status (Security Admin only)
 */
export const PATCH = withAuth(async (req, session, context) => {
  const deviceId = context?.params?.id;
  if (!deviceId) return NextResponse.json({ error: 'Missing device ID' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validation = validateInput(updateDeviceSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
  }

  const ipAddress = getClientIP(req);

  try {
    const updated = await DeviceService.updateDeviceStatus(
      deviceId,
      {
        status: validation.data.status as DeviceStatus,
        isManaged: validation.data.isManaged,
        complianceStatus: validation.data.complianceStatus,
        trustScore: validation.data.trustScore,
      },
      session.userId,
      session.roles,
      session.email,
      ipAddress
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update device status' }, { status: 403 });
  }
});
