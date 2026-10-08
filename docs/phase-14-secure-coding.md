# Phase 14 — Secure Coding & Architecture Refactoring

## 1. Overview

In compliance with secure software engineering principles, the ZTAP codebase was intentionally refactored from an initial simplistic prototype into a hardened, defense-in-depth architecture.

---

## 2. Refactoring Analysis

### Refactoring 1: Inline Client-Trust Authorization → Server-Side Strategy Policy Engine

#### Initial Problematic Approach (Vulnerable):
```typescript
// VULNERABLE: Relies on client-supplied data and basic role equality
export async function POST(req: Request) {
  const { userId, role, resourceId } = await req.json();
  if (role === 'EMPLOYEE' && resourceId !== 'admin-db') {
    return Response.json({ access: 'GRANTED' }); // Insecure! No device trust, no temporal checks
  }
}
```
* **Security Defect**: Broken Access Control (OWASP A01:2021). Attacker can tamper with `role` in the request body, bypass device trust checks, and ignore risk factors.

#### Secure Refactored Implementation (Hardened):
```typescript
// SECURE: Enforces server-side session authentication, Zod validation, and PolicyEngine evaluation
export const POST = withAuth(async (req, session) => {
  const validation = validateInput(createAccessRequestSchema, await req.json());
  if (!validation.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

  // PolicyEngine executes Strategy Pattern evaluators across Identity, Device, Role, Resource, and Time
  const decision = await AccessRequestService.createAccessRequest({
    userId: session.userId,
    resourceId: validation.data.resourceId,
    deviceId: validation.data.deviceId,
    reason: validation.data.reason,
    actorId: session.userId,
    actorEmail: session.email,
  });

  return NextResponse.json(decision);
});
```
* **Security Improvement**: All trust parameters are evaluated server-side. Session identity cannot be spoofed. Device trust is verified against the database. Decisions are explainable and immutably audited.

---

### Refactoring 2: Unsafe Raw Database Input Handling → Zod Schema Runtime Validation & Parameterized Prisma Queries

#### Initial Problematic Approach (Vulnerable):
```typescript
// VULNERABLE: Direct string interpolation into raw database queries
const query = `SELECT * FROM AccessRequest WHERE reason LIKE '%${userInput}%'`;
```
* **Security Defect**: Injection vulnerability (OWASP A03:2021) and XSS via stored malicious input.

#### Secure Refactored Implementation (Hardened):
```typescript
// SECURE: Strict input validation and parameterized ORM calls
export const createAccessRequestSchema = z.object({
  resourceId: z.string().uuid('Invalid resource ID'),
  deviceId: z.string().uuid('Invalid device ID'),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason cannot exceed 500 characters')
    .regex(/^[^<>{}]*$/, 'Disallowed HTML characters detected'),
});

// Parameterized query execution via Prisma ORM
const request = await prisma.accessRequest.create({
  data: {
    userId,
    resourceId: validation.data.resourceId,
    deviceId: validation.data.deviceId,
    reason: validation.data.reason,
    status: initialStatus,
  },
});
```

---

## 3. Defense-in-Depth Implementation Matrix

| Security Layer | Implementation Mechanism | Threat Mitigated |
|---|---|---|
| **Authentication** | Argon2id (`m=65536, t=3, p=4`), Account lockout after 5 failures | Credential stuffing, brute-force attacks |
| **Session Integrity** | `iron-session` encrypted cookies (`HttpOnly`, `SameSite=Lax`, `Secure`) | Session hijacking, client-side script theft (XSS) |
| **Authorization** | Server-side RBAC middleware, anti-self-approval enforcement | Privilege escalation, broken access control, IDOR/BOLA |
| **Error Handling** | Sanitized error responses, zero stack traces exposed to client | Information disclosure |
| **Audit Trails** | Append-only database records, redaction of sensitive credentials | Repudiation, tampering |
