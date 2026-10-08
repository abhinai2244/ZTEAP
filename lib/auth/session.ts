/**
 * Session Management Module
 *
 * Uses iron-session for encrypted, signed, HttpOnly session cookies.
 * Sessions contain minimal data (userId + role) to follow least-privilege.
 *
 * Security Controls:
 * - HttpOnly: Prevents XSS-based session theft
 * - Secure: Only sent over HTTPS (in production)
 * - SameSite: Prevents CSRF
 * - Encrypted: iron-session encrypts all session data
 * - Short TTL: Sessions expire after configured duration
 */

import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { RoleName } from '@prisma/client';

/** Session data stored in the encrypted cookie */
export interface SessionData {
  userId: string;
  email: string;
  roles: RoleName[];
  isLoggedIn: boolean;
  /** ISO timestamp of when the session was created */
  createdAt: string;
  /** IP address that created the session */
  ipAddress?: string;
}

/** Default (empty) session values */
const defaultSession: SessionData = {
  userId: '',
  email: '',
  roles: [],
  isLoggedIn: false,
  createdAt: '',
};

function getSessionOptions() {
  const secret = process.env.SESSION_SECRET || 'ztap_ultra_secure_session_key_32chars_long_prod';
  return {
    password: secret,
    cookieName: 'ztap-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: parseInt(process.env.SESSION_TTL || '3600', 10),
      path: '/',
    },
  };
}

/**
 * Get the current session from the request cookies.
 * Returns a mutable session object that can be saved/destroyed.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, getSessionOptions());

  // Initialize with defaults if not set
  if (!session.isLoggedIn) {
    Object.assign(session, defaultSession);
  }

  return session;
}

/**
 * Create a new session for a successfully authenticated user.
 */
export async function createSession(
  userId: string,
  email: string,
  roles: RoleName[],
  ipAddress?: string
): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.email = email;
  session.roles = roles;
  session.isLoggedIn = true;
  session.createdAt = new Date().toISOString();
  session.ipAddress = ipAddress;
  await session.save();
}

/**
 * Destroy the current session (logout).
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * Validate that a request has an active, valid session.
 * Returns the session data if valid, null otherwise.
 */
export async function validateSession(): Promise<SessionData | null> {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Check if the current session has a specific role.
 */
export async function hasRole(role: RoleName): Promise<boolean> {
  const session = await validateSession();
  if (!session) return false;
  return session.roles.includes(role);
}

/**
 * Check if the current session has any of the specified roles.
 */
export async function hasAnyRole(roles: RoleName[]): Promise<boolean> {
  const session = await validateSession();
  if (!session) return false;
  return roles.some((role) => session.roles.includes(role));
}
