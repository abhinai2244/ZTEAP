/**
 * Role-Based Access Control (RBAC) Module
 * 
 * Defines permissions per role and provides authorization checks.
 * ALL authorization decisions happen server-side.
 * 
 * Principle: Least Privilege — each role gets only the permissions it needs.
 */

import { RoleName } from '@prisma/client';

/** Available actions in the system */
export type Action =
  | 'user:create' | 'user:read' | 'user:update' | 'user:disable' | 'user:read:self'
  | 'role:assign' | 'role:revoke' | 'role:read'
  | 'resource:create' | 'resource:read' | 'resource:update' | 'resource:delete' | 'resource:manage:own'
  | 'device:create' | 'device:read' | 'device:update' | 'device:read:self'
  | 'access:request' | 'access:read:own' | 'access:read:all' | 'access:read:resource'
  | 'approval:approve' | 'approval:reject' | 'approval:read:own' | 'approval:read:all'
  | 'policy:create' | 'policy:read' | 'policy:update' | 'policy:delete'
  | 'audit:read' | 'audit:export'
  | 'dashboard:employee' | 'dashboard:admin' | 'dashboard:owner' | 'dashboard:auditor';

/** Permission map: role → allowed actions */
const ROLE_PERMISSIONS: Record<RoleName, Action[]> = {
  EMPLOYEE: [
    'user:read:self',
    'device:create', 'device:read:self',
    'resource:read',
    'access:request', 'access:read:own',
    'dashboard:employee',
  ],
  RESOURCE_OWNER: [
    'user:read:self',
    'device:create', 'device:read:self',
    'resource:create', 'resource:read', 'resource:update', 'resource:manage:own',
    'access:request', 'access:read:own', 'access:read:resource',
    'approval:approve', 'approval:reject', 'approval:read:own',
    'dashboard:employee', 'dashboard:owner',
  ],
  SECURITY_ADMIN: [
    'user:create', 'user:read', 'user:update', 'user:disable', 'user:read:self',
    'role:assign', 'role:revoke', 'role:read',
    'device:create', 'device:read', 'device:update', 'device:read:self',
    'resource:create', 'resource:read', 'resource:update', 'resource:delete',
    'access:request', 'access:read:own', 'access:read:all',
    'approval:approve', 'approval:reject', 'approval:read:all',
    'policy:create', 'policy:read', 'policy:update', 'policy:delete',
    'audit:read',
    'dashboard:employee', 'dashboard:admin',
  ],
  AUDITOR: [
    'user:read:self',
    'resource:read',
    'access:read:all',
    'audit:read', 'audit:export',
    'dashboard:auditor',
  ],
  SYSTEM_ADMIN: [
    'user:create', 'user:read', 'user:update', 'user:disable', 'user:read:self',
    'role:assign', 'role:revoke', 'role:read',
    'device:create', 'device:read', 'device:update', 'device:read:self',
    'resource:create', 'resource:read', 'resource:update', 'resource:delete', 'resource:manage:own',
    'access:request', 'access:read:own', 'access:read:all', 'access:read:resource',
    'approval:approve', 'approval:reject', 'approval:read:all',
    'policy:create', 'policy:read', 'policy:update', 'policy:delete',
    'audit:read', 'audit:export',
    'dashboard:employee', 'dashboard:admin', 'dashboard:owner', 'dashboard:auditor',
  ],
};

/**
 * Check if a set of roles has permission to perform an action.
 * Server-side only — never call this from client code.
 */
export function hasPermission(roles: RoleName[], action: Action): boolean {
  return roles.some(role => {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions?.includes(action) ?? false;
  });
}

/**
 * Get all permissions for a set of roles.
 */
export function getPermissions(roles: RoleName[]): Action[] {
  const permSet = new Set<Action>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const perm of perms) {
      permSet.add(perm);
    }
  }
  return Array.from(permSet);
}

/**
 * Check if a role is considered privileged (admin-level).
 */
export function isPrivilegedRole(role: RoleName): boolean {
  return role === 'SECURITY_ADMIN' || role === 'SYSTEM_ADMIN';
}
