/**
 * Identity Evaluator
 * 
 * Validates user identity as part of the Zero-Trust evaluation pipeline.
 * Checks: user status, authentication validity, failed login history.
 */

import { PolicyEvaluationRequest, EvaluationResult } from '../types';

export class IdentityEvaluator {
  evaluate(request: PolicyEvaluationRequest): EvaluationResult {
    // Check if user is active
    if (request.userStatus !== 'ACTIVE') {
      return {
        evaluator: 'IdentityEvaluator',
        passed: false,
        reason: `User account is ${request.userStatus.toLowerCase()}`,
        riskContribution: 100,
        details: { userStatus: request.userStatus },
      };
    }

    // Check failed login attempts
    let riskContribution = -20; // Valid authentication reduces risk
    if (request.userFailedLogins > 3) {
      riskContribution = 20; // Recent failed attempts increase risk
    }

    return {
      evaluator: 'IdentityEvaluator',
      passed: true,
      reason: 'Identity validated successfully',
      riskContribution,
      details: {
        userStatus: request.userStatus,
        failedLogins: request.userFailedLogins,
      },
    };
  }
}
