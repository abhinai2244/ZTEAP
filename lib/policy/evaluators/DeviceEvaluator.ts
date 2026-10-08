/**
 * Device Evaluator
 * 
 * Evaluates device trust status as part of Zero-Trust verification.
 * A device being authenticated does NOT mean it is trusted.
 */

import { PolicyEvaluationRequest, EvaluationResult } from '../types';

export class DeviceEvaluator {
  evaluate(request: PolicyEvaluationRequest): EvaluationResult {
    // COMPROMISED device = immediate deny
    if (request.deviceStatus === 'COMPROMISED') {
      return {
        evaluator: 'DeviceEvaluator',
        passed: false,
        reason: 'Device is marked as COMPROMISED',
        riskContribution: 60,
        details: {
          deviceStatus: request.deviceStatus,
          isManaged: request.deviceIsManaged,
          trustScore: request.deviceTrustScore,
        },
      };
    }

    // Check managed device requirement
    if (request.policyRequiresManagedDevice && !request.deviceIsManaged) {
      return {
        evaluator: 'DeviceEvaluator',
        passed: false,
        reason: 'Resource requires a managed device, but device is unmanaged',
        riskContribution: 20,
        details: {
          deviceStatus: request.deviceStatus,
          isManaged: request.deviceIsManaged,
          requiresManaged: true,
        },
      };
    }

    // Calculate risk based on device status
    let riskContribution = 0;
    switch (request.deviceStatus) {
      case 'TRUSTED':
        riskContribution = -10; // Trusted device reduces risk
        break;
      case 'COMPLIANT':
        riskContribution = 0; // Neutral
        break;
      case 'UNTRUSTED':
        riskContribution = 20; // Unmanaged/untrusted adds risk
        break;
    }

    // Additional risk for unmanaged devices
    if (!request.deviceIsManaged) {
      riskContribution += 10;
    }

    return {
      evaluator: 'DeviceEvaluator',
      passed: true,
      reason: `Device status: ${request.deviceStatus}`,
      riskContribution,
      details: {
        deviceStatus: request.deviceStatus,
        isManaged: request.deviceIsManaged,
        trustScore: request.deviceTrustScore,
        complianceStatus: request.deviceComplianceStatus,
      },
    };
  }
}
