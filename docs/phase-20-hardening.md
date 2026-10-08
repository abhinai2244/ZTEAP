# Phase 20 — Production System Hardening Checklist

## 1. Technical Security Hardening Checklist

| Domain | Control Description | Status | Verification Mechanism |
|---|---|---|---|
| **Authentication** | Passwords hashed with Argon2id (`m=65536, t=3, p=4`); constant-time comparison | Enforced | `tests/unit/password-auth.test.ts` |
| **Authentication** | Automatic account lockout after 5 consecutive failed attempts (15 min window) | Enforced | `/api/auth/login` lockout verification |
| **Authorization** | Server-side RBAC middleware on all API routes; no client-only checks | Enforced | `tests/integration/rbac-privilege-escalation.test.ts` |
| **Authorization** | Anti-Self-Privilege escalation and anti-self-approval barriers | Enforced | `lib/services/UserService.ts` & `ApprovalService.ts` |
| **Network & Ports** | Only port 3000 (HTTPS/HTTP) exposed; PostgreSQL (5432) isolated on internal network | Enforced | `docker-compose.yml` & `k8s/service.yaml` |
| **Secrets Management** | Zero plaintext secrets in code; runtime injection via K8s Secrets / environment variables | Enforced | `.gitignore` & code repository audit |
| **Dependency Security** | Automated vulnerability scans via `npm audit` and Trivy in CI pipeline | Enforced | `.github/workflows/ci.yml` |
| **Operating System** | Containerized on Alpine Linux; stripped of shell compilation tools | Enforced | `Dockerfile` (Stage 3 runner) |
| **Container Hardening** | Non-root execution (`USER nextjs:1001`); no privileged containers | Enforced | `Dockerfile` & `k8s/deployment.yaml` |
| **Kubernetes** | Dropped Linux capabilities (`drop: ["ALL"]`); CPU/memory resource limits defined | Enforced | `k8s/deployment.yaml` |
| **Database** | Parameterized queries via Prisma ORM; zero string interpolation into SQL | Enforced | Code review & fuzzing tests |
| **Audit Logging** | Append-only audit logs with correlation IDs; automated secret redaction | Enforced | `lib/audit/AuditLogger.ts` |
| **Security Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP`, `Strict-Transport-Security` | Enforced | `next.config.ts` & `lib/auth/middleware.ts` |

---

## 2. Operational & Incident Response Controls

### Physical Security Controls:
- Hardware security module (HSM) or cloud KMS for secret encryption at rest.
- Production hosting within SOC-2 Type II certified tier-3 data centers.
- Multi-factor badge and biometric access to physical host infrastructure.

### Operational Security Controls:
- Mandatory peer code reviews on all pull requests targeting `main` and `develop`.
- Separation of duties between security auditors, resource owners, and platform administrators.
- Immutable backup snapshots of PostgreSQL database taken every 6 hours and stored in an isolated bucket.

### Incident Response Playbook (IRP):
1. **Detection**: Automated alert triggered on `COMPROMISED` device status or rapid failed logins.
2. **Containment**: Immediate session termination via database session flush; device status flipped to `COMPROMISED`.
3. **Eradication**: Revoke compromised user's active access requests; rotate session secret key.
4. **Recovery**: Restore user account following verified multi-factor identity verification and device malware clearance.
5. **Post-Mortem**: Review append-only audit trail in Auditor Dashboard; generate SIEM export for forensic analysis.
