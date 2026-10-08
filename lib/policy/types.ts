/**
 * Policy Engine Types
 * 
 * Defines the data structures used by the Zero-Trust Policy Engine.
 */

import { RoleName, DeviceStatus, SensitivityLevel, RiskLevel } from '@prisma/client';

/** Input to the policy evaluation pipeline */
export interface PolicyEvaluationRequest {
  userId: string;
  userEmail: string;
  userRoles: RoleName[];
  userStatus: string;
  userFailedLogins: number;
  deviceId: string;
  deviceStatus: DeviceStatus;
  deviceIsManaged: boolean;
  deviceTrustScore: number;
  deviceComplianceStatus: boolean;
  resourceId: string;
  resourceName: string;
  resourceSensitivity: SensitivityLevel;
  resourceRequiredRole: RoleName;
  resourceRiskLevel: RiskLevel;
  resourceRequiresApproval: boolean;
  requestTime: Date;
  requestReason: string;
  ipAddress: string;
  userAgent: string;
  // Policy constraints
  policyMaxRiskLevel?: number;
  policyAllowedTimeStart?: string | null;
  policyAllowedTimeEnd?: string | null;
  policyAllowedDays?: string | null;
  policyRequiresManagedDevice?: boolean;
}

/** Result from a single evaluator */
export interface EvaluationResult {
  evaluator: string;
  passed: boolean;
  reason: string;
  riskContribution: number;
  details?: Record<string, unknown>;
}

/** Possible access decisions */
export type AccessDecisionResult = 'ALLOW' | 'DENY' | 'STEP_UP_AUTHENTICATION' | 'REQUIRE_APPROVAL';

/** Final policy decision */
export interface PolicyDecision {
  decision: AccessDecisionResult;
  decisionReason: string;
  riskScore: number;
  riskLevel: RiskLevel;
  evaluationResults: EvaluationResult[];
  timestamp: Date;
}
