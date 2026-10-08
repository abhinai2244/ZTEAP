/**
 * Risk Engine Types
 */

export interface RiskFactor {
  factor: string;
  category: 'identity' | 'device' | 'resource' | 'temporal' | 'role' | 'network';
  impact: number;  // positive = adds risk, negative = reduces risk
  description: string;
}

export interface RiskAssessmentResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
}
