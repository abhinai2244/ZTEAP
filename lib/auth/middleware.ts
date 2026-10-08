/**
 * Authentication & Authorization Middleware
 * 
 * Provides middleware wrappers for Next.js Route Handlers that:
 * 1. Validate session authentication
 * 2. Enforce role-based access control (RBAC)
 * 3. Add security headers to all responses
 * 4. Extract request metadata (IP, user agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SessionData } from './session';
import { RoleName } from '@prisma/client';

// Type for authenticated route handlers
export type AuthenticatedHandler = (
  req: NextRequest,
  session: SessionData,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Middleware that requires valid authentication.
 * Returns 401 if no valid session exists.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const response = await handler(req, session, context);
    return addSecurityHeaders(response);
  };
}

/**
 * Middleware that requires authentication AND specific role(s).
 * Returns 401 if not authenticated, 403 if insufficient role.
 * 
 * @param roles - One or more roles that are allowed
 * @param handler - The route handler to execute if authorized
 */
export function withRoles(roles: RoleName[], handler: AuthenticatedHandler) {
  return withAuth(async (req, session, context) => {
    const hasRequiredRole = roles.some(role => session.roles.includes(role));
    if (!hasRequiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(req, session, context);
  });
}

/**
 * Add security headers to every response.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

/**
 * Extract client IP address from request headers.
 */
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Extract user agent from request.
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}
