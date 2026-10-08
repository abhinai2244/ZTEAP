/**
 * Resource Evaluator
 * 
 * Evaluates the sensitivity and risk level of the target resource.
 * Higher sensitivity = higher risk contribution.
 */

import { SensitivityLevel, RiskLevel } from '@prisma/client';
import { PolicyEvaluationRequest, EvaluationResult } from '../types';

const SENSITIVITY_RISK: Record<SensitivityLevel, number> = {
  PUBLIC: 5,
  INTERNAL: 10,
  CONFIDENTIAL: 25,
  RESTRICTED: 35,
  CRITICAL: 40,
};

const RISK_LEVEL_VALUE: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 10,
  HIGH: 20,
  CRITICAL: 30,
};

export class ResourceEvaluator {
  evaluate(request: PolicyEvaluationRequest): EvaluationResult {
    const sensitivityRisk = SENSITIVITY_RISK[request.resourceSensitivity] || 10;
    const levelRisk = RISK_LEVEL_VALUE[request.resourceRiskLevel] || 0;
    const riskContribution = sensitivityRisk + (levelRisk / 2);

    return {
      evaluator: 'ResourceEvaluator',
      passed: true,
      reason: `Resource sensitivity: ${request.resourceSensitivity}`,
      riskContribution,
      details: {
        resourceSensitivity: request.resourceSensitivity,
        resourceRiskLevel: request.resourceRiskLevel,
        sensitivityRisk,
        levelRisk,
      },
    };
  }
}
