# Security Policy & Architecture Guide

## 1. Zero-Trust Security Philosophy

The Zero-Trust Enterprise Access Portal (ZTAP) operates under the principle of **assumed breach and continuous verification**. No user, device, network, or workload is inherently trusted, regardless of physical or logical network location.

---

## 2. Cryptographic & Authentication Controls

- **Password Storage**: All user passwords are encrypted using **Argon2id**, configured to OWASP parameters:
  - Memory cost: `65536 KB` (64 MB)
  - Time cost: `3 iterations`
  - Parallelism: `4 threads`
- **Session Tokens**: Handled via `iron-session`, generating encrypted, signed, and tamper-evident cookies. Cookies are flagged:
  - `HttpOnly`: Immune to JavaScript-driven credential harvesting.
  - `SameSite=Lax`: Protection against Cross-Site Request Forgery (CSRF).
  - `Secure`: Mandatory in production environments (HTTPS transmission only).
- **Brute-Force & Credential Stuffing Prevention**:
  - Sliding-window rate limit: Maximum 5 failed login attempts per 15 minutes per IP.
  - Account lockout: Automatically locks the account for 15 minutes after 5 failures.
  - Constant-time dummy verification on non-existent accounts to eliminate user enumeration via timing attacks.

---

## 3. Server-Side Authorization & Anti-Privilege Escalation

- **Defense-in-Depth Authorization**: Every API route executes server-side RBAC and PBAC checks via `withRoles` and `withAuth` middleware. Client-side checks are purely for UI rendering convenience and never relied upon for security decisions.
- **Anti-Self-Privilege Escalation**:
  - Administrators cannot alter, assign, or revoke their own roles.
  - Any self-role modification attempt triggers an immediate `CRITICAL` severity audit alert and terminates the operation.
- **Anti-Self-Approval**:
  - Users are strictly prohibited from approving their own access requests, even if they own the requested resource.
- **IDOR / BOLA Prevention**:
  - Direct object references are always scoped against the authenticated `session.userId`.
  - Non-privileged users can never inspect or alter another user's requests, devices, or access decisions.

---

## 4. Input Sanitization & Injection Prevention

- **Runtime Schema Enforcement**: All incoming HTTP JSON payloads pass through **Zod** schemas.
- **SQL Injection Immunity**: Database persistence uses **Prisma ORM**, which guarantees parameterized queries across all database drivers. No raw dynamic string concatenation is permitted in SQL queries.
- **XSS Mitigation**: React automatically escapes rendered strings; input fields reject dangerous HTML characters (`<`, `>`, `{`, `}`); and response headers enforce `X-XSS-Protection` and `Content-Security-Policy`.

---

## 5. Audit Trail & Non-Repudiation

- Audit logs are append-only. There are no API endpoints or service methods capable of deleting or updating recorded audit logs.
- Sensitive values (passwords, tokens, cookies, secrets) are automatically redacted to `[REDACTED]` before insertion into the database.
- Every audit record includes a unique `correlationId` (UUID v4) for traceability across distributed logs.

---

## 6. Container & Kubernetes Hardening

- Container images run as an unprivileged non-root user (`USER nextjs:1001`).
- Kubernetes pods drop all Linux kernel capabilities (`capabilities.drop: ["ALL"]`).
- `allowPrivilegeEscalation` is set to `false`.
- Database services are deployed with `ClusterIP` and isolated within an internal network; database ports are never exposed to public or host interfaces.

---

## 7. Vulnerability Disclosure & Reporting

If you identify a security vulnerability within ZTAP, please report it privately:
- Email: `security@ztap-enterprise.local`
- GPG Key Fingerprint: `9B4C 2E10 89FA 78DC 1234 5678 ABCD EF01 2345 6789`
- Please do not submit public GitHub issues for security vulnerabilities.
