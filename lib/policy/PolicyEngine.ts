/**
 * Zero-Trust Policy Engine
 * 
 * The CORE of the ZTAP system. Evaluates every access request
 * against multiple trust signals using the Strategy Pattern.
 * 
 * Evaluation Pipeline:
 * 1. Identity Evaluation → Is the user valid?
 * 2. Role Evaluation → Does the user have the required role?
 * 3. Device Evaluation → Is the device trusted and compliant?
 * 4. Resource Evaluation → How sensitive is the target resource?
 * 5. Temporal Evaluation → Is the request within permitted time?
 * 6. Risk Aggregation → What is the combined risk score?
 * 7. Decision → ALLOW, DENY, STEP_UP, or REQUIRE_APPROVAL
 */

import { RiskLevel } from '@prisma/client';
import { PolicyEvaluationRequest, PolicyDecision, EvaluationResult, AccessDecisionResult } from './types';
import { IdentityEvaluator } from './evaluators/IdentityEvaluator';
import { RoleEvaluator } from './evaluators/RoleEvaluator';
import { DeviceEvaluator } from './evaluators/DeviceEvaluator';
import { ResourceEvaluator } from './evaluators/ResourceEvaluator';
import { TemporalEvaluator } from './evaluators/TemporalEvaluator';

/**
 * Classify a numeric risk score into a risk level.
 */
function classifyRisk(score: number): RiskLevel {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export class PolicyEngine {
  private identityEvaluator = new IdentityEvaluator();
  private roleEvaluator = new RoleEvaluator();
  private deviceEvaluator = new DeviceEvaluator();
  private resourceEvaluator = new ResourceEvaluator();
  private temporalEvaluator = new TemporalEvaluator();

  /**
   * Evaluate an access request through the complete Zero-Trust pipeline.
   * 
   * This is the main entry point. Every access request MUST go through
   * this method to get a decision.
   */
  evaluateAccess(request: PolicyEvaluationRequest): PolicyDecision {
    const results: EvaluationResult[] = [];

    // 1. Identity Evaluation
    const identityResult = this.identityEvaluator.evaluate(request);
    results.push(identityResult);
    if (!identityResult.passed) {
      return this.buildDecision('DENY', results, identityResult.reason);
    }

    // 2. Role Evaluation
    const roleResult = this.roleEvaluator.evaluate(request);
    results.push(roleResult);
    if (!roleResult.passed) {
      return this.buildDecision('DENY', results, roleResult.reason);
    }

    // 3. Device Evaluation
    const deviceResult = this.deviceEvaluator.evaluate(request);
    results.push(deviceResult);
    if (!deviceResult.passed) {
      return this.buildDecision('DENY', results, deviceResult.reason);
    }

    // 4. Resource Evaluation
    const resourceResult = this.resourceEvaluator.evaluate(request);
    results.push(resourceResult);

    // 5. Temporal Evaluation
    const temporalResult = this.temporalEvaluator.evaluate(request);
    results.push(temporalResult);
    if (!temporalResult.passed) {
      return this.buildDecision('DENY', results, temporalResult.reason);
    }

    // 6. Risk Aggregation
    const riskScore = this.calculateRiskScore(results);
    const riskLevel = classifyRisk(riskScore);

    // 7. Decision Logic
    const maxAllowedRisk = request.policyMaxRiskLevel ?? 60;

    // CRITICAL risk (>80) → always deny
    if (riskScore > 80) {
      return this.buildDecision('DENY', results,
        `Risk score ${riskScore} exceeds critical threshold (80)`,
        riskScore, riskLevel
      );
    }

    // HIGH risk (61-80) → require step-up authentication
    if (riskScore > 60) {
      return this.buildDecision('STEP_UP_AUTHENTICATION', results,
        `Risk score ${riskScore} requires additional authentication`,
        riskScore, riskLevel
      );
    }

    // Risk exceeds policy max → deny
    if (riskScore > maxAllowedRisk) {
      return this.buildDecision('DENY', results,
        `Risk score ${riskScore} exceeds policy maximum (${maxAllowedRisk})`,
        riskScore, riskLevel
      );
    }

    // Resource requires approval → route to approval workflow
    if (request.resourceRequiresApproval) {
      return this.buildDecision('REQUIRE_APPROVAL', results,
        'Resource requires explicit approval from resource owner',
        riskScore, riskLevel
      );
    }

    // All checks passed, risk acceptable → ALLOW
    return this.buildDecision('ALLOW', results,
      'All policy checks passed, risk level acceptable',
      riskScore, riskLevel
    );
  }

  /**
   * Calculate aggregate risk score from all evaluation results.
   * Score is clamped to [0, 100].
   */
  private calculateRiskScore(results: EvaluationResult[]): number {
    const baseRisk = 20; // Start with a base risk (Zero Trust = never fully trust)
    const totalContribution = results.reduce(
      (sum, result) => sum + result.riskContribution,
      0
    );
    return Math.max(0, Math.min(100, baseRisk + totalContribution));
  }

  /**
   * Build a standardized policy decision object.
   */
  private buildDecision(
    decision: AccessDecisionResult,
    evaluationResults: EvaluationResult[],
    reason: string,
    riskScore?: number,
    riskLevel?: RiskLevel
  ): PolicyDecision {
    const score = riskScore ?? this.calculateRiskScore(evaluationResults);
    const level = riskLevel ?? classifyRisk(score);

    return {
      decision,
      decisionReason: reason,
      riskScore: score,
      riskLevel: level,
      evaluationResults,
      timestamp: new Date(),
    };
  }
}
