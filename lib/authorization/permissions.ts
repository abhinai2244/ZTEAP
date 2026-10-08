/**
 * Permission Checking Utilities
 * 
 * Provides high-level permission checks that combine RBAC
 * with resource ownership validation (IDOR/BOLA protection).
 */

import { RoleName } from '@prisma/client';
import { hasPermission, Action } from './rbac';

/**
 * Verify that the requesting user can access a specific resource.
 * Prevents IDOR/BOLA by checking ownership or admin role.
 * 
 * @param userRoles - The requesting user's roles
 * @param userId - The requesting user's ID
 * @param resourceOwnerId - The owner ID of the target resource
 * @param adminAction - The action that admins can use to bypass ownership check
 */
export function canAccessResource(
  userRoles: RoleName[],
  userId: string,
  resourceOwnerId: string,
  adminAction: Action
): boolean {
  // User owns the resource
  if (userId === resourceOwnerId) return true;
  // User has admin-level permission for this action
  if (hasPermission(userRoles, adminAction)) return true;
  return false;
}

/**
 * Verify that the requesting user can modify another user's data.
 * Prevents privilege escalation.
 * 
 * @param actorRoles - The acting user's roles
 * @param actorId - The acting user's ID
 * @param targetId - The target user's ID
 * @param action - The action being performed
 */
export function canModifyUser(
  actorRoles: RoleName[],
  actorId: string,
  targetId: string,
  action: Action
): boolean {
  // Users cannot modify themselves through admin actions
  // (prevents role self-assignment / privilege escalation)
  if (actorId === targetId && (action === 'role:assign' || action === 'role:revoke')) {
    return false;
  }
  return hasPermission(actorRoles, action);
}

/**
 * Check if a user can approve a specific access request.
 * Prevents self-approval (users cannot approve their own requests).
 */
export function canApproveRequest(
  approverRoles: RoleName[],
  approverId: string,
  requesterId: string,
  resourceOwnerId: string
): boolean {
  // Cannot approve own requests
  if (approverId === requesterId) return false;
  // Must be resource owner or security admin
  if (approverId === resourceOwnerId) return true;
  if (hasPermission(approverRoles, 'approval:approve')) return true;
  return false;
}
