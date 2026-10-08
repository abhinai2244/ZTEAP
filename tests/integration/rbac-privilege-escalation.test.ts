import { describe, it, expect } from 'vitest';
import { canModifyUser, canApproveRequest, canAccessResource } from '@/lib/authorization/permissions';
import { hasPermission } from '@/lib/authorization/rbac';

describe('RBAC & Privilege Escalation Prevention Tests', () => {
  it('prevents a normal employee from performing administrative actions', () => {
    const employeeRoles = ['EMPLOYEE'] as const;

    expect(hasPermission(employeeRoles as any, 'user:create')).toBe(false);
    expect(hasPermission(employeeRoles as any, 'role:assign')).toBe(false);
    expect(hasPermission(employeeRoles as any, 'policy:create')).toBe(false);
    expect(hasPermission(employeeRoles as any, 'dashboard:admin')).toBe(false);
  });

  it('strictly BLOCKS self role-assignment (anti-privilege-escalation)', () => {
    const adminRoles = ['SECURITY_ADMIN'] as const;
    const adminUserId = 'admin-user-001';

    // Admin cannot assign or revoke roles to themselves
    const canSelfAssign = canModifyUser(adminRoles as any, adminUserId, adminUserId, 'role:assign');
    expect(canSelfAssign).toBe(false);

    const canSelfRevoke = canModifyUser(adminRoles as any, adminUserId, adminUserId, 'role:revoke');
    expect(canSelfRevoke).toBe(false);

    // But can assign to other users
    const canAssignOther = canModifyUser(adminRoles as any, adminUserId, 'other-user-002', 'role:assign');
    expect(canAssignOther).toBe(true);
  });

  it('strictly BLOCKS self-approval of access requests', () => {
    const ownerUserId = 'owner-001';
    const ownerRoles = ['RESOURCE_OWNER'] as const;

    // Resource owner cannot approve their own request even if they own the resource
    const canSelfApprove = canApproveRequest(
      ownerRoles as any,
      ownerUserId, // Approver
      ownerUserId, // Requester (same user!)
      ownerUserId  // Resource owner
    );
    expect(canSelfApprove).toBe(false);

    // Can approve when requester is another user
    const canApproveOther = canApproveRequest(
      ownerRoles as any,
      ownerUserId,
      'employee-002',
      ownerUserId
    );
    expect(canApproveOther).toBe(true);
  });

  it('enforces IDOR protection on sensitive resources', () => {
    const employeeRoles = ['EMPLOYEE'] as const;
    const employeeUserId = 'emp-001';
    const otherOwnerId = 'owner-002';

    // Employee cannot manage other owner's resource
    const allowed = canAccessResource(employeeRoles as any, employeeUserId, otherOwnerId, 'resource:update');
    expect(allowed).toBe(false);

    // Security admin can manage any resource
    const adminRoles = ['SECURITY_ADMIN'] as const;
    const adminAllowed = canAccessResource(adminRoles as any, 'admin-001', otherOwnerId, 'resource:update');
    expect(adminAllowed).toBe(true);
  });
});
