/**
 * Authorization Middleware
 * 
 * Combines authentication validation with permission checks.
 * Use these wrappers on API routes to enforce authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SessionData } from '../auth/session';
import { hasPermission, Action } from './rbac';

export type AuthorizedHandler = (
  req: NextRequest,
  session: SessionData,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Middleware that requires a specific permission.
 * Checks both authentication and authorization.
 */
export function withPermission(action: Action, handler: AuthorizedHandler) {
  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (!hasPermission(session.roles, action)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    return handler(req, session, context);
  };
}
