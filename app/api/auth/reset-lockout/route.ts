import { NextRequest, NextResponse } from 'next/server';
import { clearRateLimits } from '@/lib/security/rate-limiter';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Clear in-memory IP rate limiter store
    clearRateLimits();

    // 2. Unlock all user accounts in database
    const result = await prisma.user.updateMany({
      data: {
        status: 'ACTIVE',
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rate limits cleared and all accounts unlocked successfully.',
      unlockedUsersCount: result.count,
    });
  } catch (error) {
    console.error('Failed to reset lockouts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset lockout states' },
      { status: 500 }
    );
  }
}
