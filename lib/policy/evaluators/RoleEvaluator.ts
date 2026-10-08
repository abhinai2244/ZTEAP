/**
 * Role Evaluator
 * 
 * Checks whether the user's roles satisfy the resource's required role.
 * Also evaluates privilege level mismatch risk.
 */

import { RoleName } from '@prisma/client';
import { PolicyEvaluationRequest, EvaluationResult } from '../types';

/** Role hierarchy (higher number = higher privilege) */
const ROLE_HIERARCHY: Record<RoleName, number> = {
  EMPLOYEE: 1,
  RESOURCE_OWNER: 2,
  AUDITOR: 2,
  SECURITY_ADMIN: 3,
  SYSTEM_ADMIN: 4,
};

export class RoleEvaluator {
  evaluate(request: PolicyEvaluationRequest): EvaluationResult {
    const requiredRole = request.resourceRequiredRole;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 1;
    
    // Check if user has the required role or a higher-privilege role
    const userMaxLevel = Math.max(
      ...request.userRoles.map(r => ROLE_HIERARCHY[r] || 0)
    );
    const hasRequiredRole = request.userRoles.includes(requiredRole) || userMaxLevel >= requiredLevel;

    if (!hasRequiredRole) {
      return {
        evaluator: 'RoleEvaluator',
        passed: false,
        reason: `User lacks required role: ${requiredRole}`,
        riskContribution: 30,
        details: {
          userRoles: request.userRoles,
          requiredRole,
          userLevel: userMaxLevel,
          requiredLevel,
        },
      };
    }

    // Risk based on privilege mismatch
    let riskContribution = 0;
    if (requiredLevel >= 3 && userMaxLevel <= 2) {
      riskContribution = 30; // Low-privilege user accessing high-privilege resource
    }

    return {
      evaluator: 'RoleEvaluator',
      passed: true,
      reason: 'Role authorization validated',
      riskContribution,
      details: {
        userRoles: request.userRoles,
        requiredRole,
        userLevel: userMaxLevel,
        requiredLevel,
      },
    };
  }
}
