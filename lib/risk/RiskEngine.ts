/**
 * Risk Engine
 * 
 * Calculates explainable risk scores for access requests.
 * Each factor contributes a positive (increases risk) or negative (decreases risk)
 * value. The final score is aggregated and classified.
 * 
 * Risk Scale:
 *   0-30  = LOW
 *   31-60 = MEDIUM
 *   61-80 = HIGH
 *   81-100 = CRITICAL
 */

import { PolicyEvaluationRequest } from '../policy/types';
import { RiskFactor, RiskAssessmentResult } from './types';

export class RiskEngine {
  /**
   * Calculate a comprehensive, explainable risk assessment.
   */
  assess(request: PolicyEvaluationRequest): RiskAssessmentResult {
    const factors: RiskFactor[] = [];

    // === Identity Factors ===
    factors.push({
      factor: 'Valid Authentication',
      category: 'identity',
      impact: -20,
      description: 'User has a valid authenticated session',
    });

    if (request.userFailedLogins > 0) {
      const failImpact = Math.min(request.userFailedLogins * 5, 20);
      factors.push({
        factor: 'Failed Login Attempts',
        category: 'identity',
        impact: failImpact,
        description: `${request.userFailedLogins} recent failed login attempt(s)`,
      });
    }

    // === Device Factors ===
    if (request.deviceIsManaged) {
      factors.push({
        factor: 'Managed Device',
        category: 'device',
        impact: -10,
        description: 'Device is enterprise-managed',
      });
    } else {
      factors.push({
        factor: 'Unmanaged Device',
        category: 'device',
        impact: 20,
        description: 'Device is not enterprise-managed',
      });
    }

    switch (request.deviceStatus) {
      case 'COMPROMISED':
        factors.push({
          factor: 'Compromised Device',
          category: 'device',
          impact: 60,
          description: 'Device has been flagged as compromised',
        });
        break;
      case 'UNTRUSTED':
        factors.push({
          factor: 'Untrusted Device',
          category: 'device',
          impact: 15,
          description: 'Device trust has not been established',
        });
        break;
      case 'COMPLIANT':
        factors.push({
          factor: 'Compliant Device',
          category: 'device',
          impact: 0,
          description: 'Device meets compliance requirements',
        });
        break;
      case 'TRUSTED':
        factors.push({
          factor: 'Trusted Device',
          category: 'device',
          impact: -5,
          description: 'Device is fully trusted',
        });
        break;
    }

    // === Resource Factors ===
    const sensitivityMap: Record<string, { impact: number; desc: string }> = {
      PUBLIC: { impact: 5, desc: 'Public/open resource' },
      INTERNAL: { impact: 10, desc: 'Internal resource' },
      CONFIDENTIAL: { impact: 25, desc: 'Confidential resource' },
      RESTRICTED: { impact: 35, desc: 'Restricted resource' },
      CRITICAL: { impact: 40, desc: 'Critical resource' },
    };
    const sens = sensitivityMap[request.resourceSensitivity] || sensitivityMap.INTERNAL;
    factors.push({
      factor: `${request.resourceSensitivity} Sensitivity`,
      category: 'resource',
      impact: sens.impact,
      description: sens.desc,
    });

    // === Temporal Factors ===
    const hour = request.requestTime.getUTCHours();
    const day = request.requestTime.getUTCDay();
    const isBusinessHours = hour >= 8 && hour < 18 && day >= 1 && day <= 5;

    if (!isBusinessHours) {
      factors.push({
        factor: 'Outside Business Hours',
        category: 'temporal',
        impact: 20,
        description: 'Access requested outside normal business hours (Mon-Fri, 9AM-6PM)',
      });
    } else {
      factors.push({
        factor: 'Business Hours',
        category: 'temporal',
        impact: 0,
        description: 'Access requested during normal business hours',
      });
    }

    // === Role Factors ===
    const ROLE_LEVELS: Record<string, number> = {
      EMPLOYEE: 1, RESOURCE_OWNER: 2, AUDITOR: 2, SECURITY_ADMIN: 3, SYSTEM_ADMIN: 4,
    };
    const userMax = Math.max(...request.userRoles.map(r => ROLE_LEVELS[r] || 0));
    const reqLevel = ROLE_LEVELS[request.resourceRequiredRole] || 1;
    if (reqLevel >= 3 && userMax <= 2) {
      factors.push({
        factor: 'Privilege Mismatch',
        category: 'role',
        impact: 30,
        description: 'Low-privilege user accessing privileged resource',
      });
    } else {
      factors.push({
        factor: 'Role Match',
        category: 'role',
        impact: 0,
        description: 'User role is appropriate for the requested resource',
      });
    }

    // === Calculate Final Score ===
    const baseRisk = 20;
    const rawScore = baseRisk + factors.reduce((sum, f) => sum + f.impact, 0);
    const score = Math.max(0, Math.min(100, rawScore));

    let level: RiskAssessmentResult['level'];
    if (score <= 30) level = 'LOW';
    else if (score <= 60) level = 'MEDIUM';
    else if (score <= 80) level = 'HIGH';
    else level = 'CRITICAL';

    return { score, level, factors };
  }
}
