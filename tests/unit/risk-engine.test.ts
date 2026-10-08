import { describe, it, expect } from 'vitest';
import { RiskEngine } from '@/lib/risk/RiskEngine';
import { PolicyEvaluationRequest } from '@/lib/policy/types';

describe('RiskEngine - Dynamic Explainable Risk Scoring', () => {
  const riskEngine = new RiskEngine();

  const createBaseRequest = (overrides?: Partial<PolicyEvaluationRequest>): PolicyEvaluationRequest => ({
    userId: 'user-123',
    userEmail: 'employee@example.com',
    userRoles: ['EMPLOYEE'],
    userStatus: 'ACTIVE',
    userFailedLogins: 0,
    deviceId: 'dev-123',
    deviceStatus: 'TRUSTED',
    deviceIsManaged: true,
    deviceTrustScore: 95,
    deviceComplianceStatus: true,
    resourceId: 'res-123',
    resourceName: 'Developer Repository',
    resourceSensitivity: 'INTERNAL',
    resourceRequiredRole: 'EMPLOYEE',
    resourceRiskLevel: 'LOW',
    resourceRequiresApproval: false,
    requestTime: new Date('2026-10-08T10:00:00Z'), // Thursday 10 AM (Business Hours)
    requestReason: 'Code deployment',
    ipAddress: '10.0.1.50',
    userAgent: 'Mozilla/5.0 Chrome/120',
    ...overrides,
  });

  it('calculates low risk for compliant employee on managed trusted device during work hours', () => {
    const req = createBaseRequest();
    const assessment = riskEngine.assess(req);

    expect(assessment.score).toBeLessThanOrEqual(30);
    expect(assessment.level).toBe('LOW');
    expect(assessment.factors.length).toBeGreaterThan(0);

    // Negative impact factors should be present (valid auth, managed device, trusted status)
    const validAuth = assessment.factors.find((f) => f.factor === 'Valid Authentication');
    expect(validAuth?.impact).toBeLessThan(0);
  });

  it('elevates risk significantly for unmanaged and compromised devices', () => {
    const req = createBaseRequest({
      deviceStatus: 'COMPROMISED',
      deviceIsManaged: false,
    });
    const assessment = riskEngine.assess(req);

    expect(assessment.score).toBeGreaterThan(60);
    const compFactor = assessment.factors.find((f) => f.factor === 'Compromised Device');
    expect(compFactor?.impact).toBeGreaterThanOrEqual(50);
  });

  it('adds risk penalty for requests outside business hours', () => {
    const workHoursReq = createBaseRequest({
      requestTime: new Date('2026-10-08T14:00:00Z'), // Thursday 2 PM
    });
    const afterHoursReq = createBaseRequest({
      requestTime: new Date('2026-10-11T02:00:00Z'), // Sunday 2 AM
    });

    const workScore = riskEngine.assess(workHoursReq).score;
    const afterHoursScore = riskEngine.assess(afterHoursReq).score;

    expect(afterHoursScore).toBeGreaterThan(workScore);
  });

  it('guarantees risk scores are clamped within [0, 100]', () => {
    // Extreme positive factors
    const bestCase = createBaseRequest({
      deviceStatus: 'TRUSTED',
      deviceIsManaged: true,
      userFailedLogins: 0,
      resourceSensitivity: 'PUBLIC',
    });
    const bestAssessment = riskEngine.assess(bestCase);
    expect(bestAssessment.score).toBeGreaterThanOrEqual(0);

    // Extreme negative factors
    const worstCase = createBaseRequest({
      deviceStatus: 'COMPROMISED',
      deviceIsManaged: false,
      userFailedLogins: 10,
      resourceSensitivity: 'CRITICAL',
      requestTime: new Date('2026-10-11T03:00:00Z'),
      userRoles: ['EMPLOYEE'],
      resourceRequiredRole: 'SECURITY_ADMIN',
    });
    const worstAssessment = riskEngine.assess(worstCase);
    expect(worstAssessment.score).toBeLessThanOrEqual(100);
    expect(worstAssessment.level).toBe('CRITICAL');
  });
});
