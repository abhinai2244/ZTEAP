import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '@/lib/policy/PolicyEngine';
import { PolicyEvaluationRequest } from '@/lib/policy/types';

describe('PolicyEngine - Zero-Trust Access Evaluation Pipeline', () => {
  const policyEngine = new PolicyEngine();

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
    requestTime: new Date('2026-10-08T10:00:00Z'), // Business hours (Thursday 10 AM)
    requestReason: 'Standard engineering maintenance',
    ipAddress: '10.0.1.50',
    userAgent: 'Mozilla/5.0 Chrome/120',
    policyMaxRiskLevel: 60,
    policyAllowedTimeStart: '06:00',
    policyAllowedTimeEnd: '23:00',
    policyAllowedDays: 'MON,TUE,WED,THU,FRI,SAT',
    policyRequiresManagedDevice: false,
    ...overrides,
  });

  it('allows access when identity, role, device, and risk are compliant', () => {
    const req = createBaseRequest();
    const decision = policyEngine.evaluateAccess(req);

    expect(decision.decision).toBe('ALLOW');
    expect(decision.riskScore).toBeLessThanOrEqual(60);
    expect(decision.decisionReason).toContain('passed');
  });

  it('immediately DENIES access if the device is flagged as COMPROMISED', () => {
    const req = createBaseRequest({
      deviceStatus: 'COMPROMISED',
      deviceTrustScore: 0,
    });
    const decision = policyEngine.evaluateAccess(req);

    expect(decision.decision).toBe('DENY');
    expect(decision.decisionReason).toContain('COMPROMISED');
  });

  it('DENIES access if the user account is INACTIVE or LOCKED', () => {
    const req = createBaseRequest({
      userStatus: 'INACTIVE',
    });
    const decision = policyEngine.evaluateAccess(req);

    expect(decision.decision).toBe('DENY');
    expect(decision.decisionReason).toContain('inactive');
  });

  it('DENIES access if employee attempts to access a SECURITY_ADMIN resource', () => {
    const req = createBaseRequest({
      userRoles: ['EMPLOYEE'],
      resourceRequiredRole: 'SECURITY_ADMIN',
      resourceSensitivity: 'CRITICAL',
    });
    const decision = policyEngine.evaluateAccess(req);

    expect(decision.decision).toBe('DENY');
    expect(decision.decisionReason).toContain('lacks required role');
  });

  it('requires explicit approval when the resource has requiresApproval set to true', () => {
    const req = createBaseRequest({
      resourceRequiresApproval: true,
    });
    const decision = policyEngine.evaluateAccess(req);

    expect(decision.decision).toBe('REQUIRE_APPROVAL');
  });

  it('triggers STEP_UP_AUTHENTICATION or DENIAL when aggregate risk is high', () => {
    const req = createBaseRequest({
      deviceStatus: 'UNTRUSTED',
      deviceIsManaged: false,
      userFailedLogins: 4,
      resourceSensitivity: 'CRITICAL',
      requestTime: new Date('2026-10-11T03:00:00Z'), // Sunday 3 AM (outside business hours)
    });
    const decision = policyEngine.evaluateAccess(req);

    expect(['STEP_UP_AUTHENTICATION', 'DENY']).toContain(decision.decision);
    expect(decision.riskScore).toBeGreaterThan(60);
  });
});
