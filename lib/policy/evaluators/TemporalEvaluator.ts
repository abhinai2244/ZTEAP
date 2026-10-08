/**
 * Temporal Evaluator
 * 
 * Evaluates time-based access restrictions.
 * Checks if the request falls within allowed time windows and days.
 */

import { PolicyEvaluationRequest, EvaluationResult } from '../types';

const DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

export class TemporalEvaluator {
  evaluate(request: PolicyEvaluationRequest): EvaluationResult {
    const now = request.requestTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    let riskContribution = 0;
    let passed = true;
    let reason = 'Access time is within permitted window';

    // Check allowed days
    if (request.policyAllowedDays) {
      const allowedDays = request.policyAllowedDays.split(',').map(d => DAY_MAP[d.trim()]);
      if (!allowedDays.includes(currentDay)) {
        passed = false;
        reason = 'Access attempted on restricted day';
        riskContribution = 20;
      }
    }

    // Check allowed time window
    if (passed && request.policyAllowedTimeStart && request.policyAllowedTimeEnd) {
      if (currentTimeStr < request.policyAllowedTimeStart || currentTimeStr > request.policyAllowedTimeEnd) {
        riskContribution = 20;
        reason = 'Access attempted outside approved hours';
        // Don't hard-deny, but increase risk significantly
      }
    }

    // General business hours check (9 AM - 6 PM, Mon-Fri)
    const isBusinessHours = currentHour >= 9 && currentHour < 18 && currentDay >= 1 && currentDay <= 5;
    if (!isBusinessHours && riskContribution === 0) {
      riskContribution = 15; // Outside business hours but no policy restriction
    }

    return {
      evaluator: 'TemporalEvaluator',
      passed,
      reason,
      riskContribution,
      details: {
        requestTime: now.toISOString(),
        currentDay: Object.entries(DAY_MAP).find(([, v]) => v === currentDay)?.[0],
        currentTime: currentTimeStr,
        isBusinessHours,
        policyTimeStart: request.policyAllowedTimeStart,
        policyTimeEnd: request.policyAllowedTimeEnd,
        policyDays: request.policyAllowedDays,
      },
    };
  }
}
