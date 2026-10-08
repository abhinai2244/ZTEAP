/**
 * Input Validation Schemas (Zod)
 * 
 * All user inputs are validated server-side using Zod.
 * This prevents injection attacks, ensures data integrity,
 * and provides clear error messages.
 */

import { z } from 'zod';

/** Login request validation */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

/** User creation validation */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().min(1, 'First name is required').max(100).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),
  lastName: z.string().min(1, 'Last name is required').max(100).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),
  roles: z.array(z.enum(['EMPLOYEE', 'RESOURCE_OWNER', 'SECURITY_ADMIN', 'AUDITOR', 'SYSTEM_ADMIN'])).min(1, 'At least one role is required'),
});

/** User update validation */
export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/).optional(),
  lastName: z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']).optional(),
});

/** Role assignment validation */
export const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleName: z.enum(['EMPLOYEE', 'RESOURCE_OWNER', 'SECURITY_ADMIN', 'AUDITOR', 'SYSTEM_ADMIN']),
});

/** Resource creation validation */
export const createResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required').max(1000),
  sensitivity: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'CRITICAL']),
  requiredRole: z.enum(['EMPLOYEE', 'RESOURCE_OWNER', 'SECURITY_ADMIN', 'AUDITOR', 'SYSTEM_ADMIN']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  requiresApproval: z.boolean().optional(),
});

/** Resource update validation */
export const updateResourceSchema = createResourceSchema.partial();

/** Access request validation */
export const createAccessRequestSchema = z.object({
  resourceId: z.string().uuid('Invalid resource ID'),
  deviceId: z.string().uuid('Invalid device ID'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500).regex(/^[^<>{}]*$/, 'Invalid characters detected'),
});

/** Device registration validation */
export const createDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(200),
  os: z.string().max(100).optional(),
  browser: z.string().max(200).optional(),
  isManaged: z.boolean().optional(),
});

/** Device status update validation */
export const updateDeviceSchema = z.object({
  status: z.enum(['TRUSTED', 'COMPLIANT', 'UNTRUSTED', 'COMPROMISED']).optional(),
  isManaged: z.boolean().optional(),
  complianceStatus: z.boolean().optional(),
  trustScore: z.number().min(0).max(100).optional(),
});

/** Approval action validation */
export const approvalActionSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  action: z.enum(['APPROVED', 'REJECTED', 'ADDITIONAL_AUTH_REQUIRED']),
  reason: z.string().max(500).optional(),
});

/** Policy creation validation */
export const createPolicySchema = z.object({
  resourceId: z.string().uuid('Invalid resource ID'),
  requiredRole: z.enum(['EMPLOYEE', 'RESOURCE_OWNER', 'SECURITY_ADMIN', 'AUDITOR', 'SYSTEM_ADMIN']).optional().nullable(),
  maxRiskLevel: z.number().min(0).max(100).optional(),
  allowedTimeStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  allowedTimeEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  allowedDays: z.string().regex(/^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))*$/, 'Invalid days format').optional().nullable(),
  requiresManagedDevice: z.boolean().optional(),
});

/** Audit log query validation */
export const auditQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  action: z.string().max(100).optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  actorId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Safely parse and validate input. Returns typed data or error response.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
}
