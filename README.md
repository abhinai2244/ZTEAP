# ZTAP — Zero-Trust Enterprise Access Portal

> **ZTAP: A Risk-Adaptive Zero-Trust Enterprise Access Control Platform with RBAC, Device Trust, Policy-Based Authorization, and Security Monitoring**

---

## 1. Project Overview

ZTAP is an academic, production-grade cybersecurity software engineering project implementing a comprehensive **Zero-Trust Access Architecture**. Traditional perimeter security models trust users once they enter an internal corporate network ("trust but verify"). ZTAP enforces the fundamental Zero-Trust philosophy:

> **"Never trust, always verify — continuously."**

Every single request to an internal enterprise application is dynamically evaluated across **six multidimensional trust signals**:
1. **User Identity & State**: Active account status, failed login history, session authenticity.
2. **User Role (RBAC)**: Validated against required application permissions on the server.
3. **Device Trust & Posture**: Evaluated independently of identity (Managed vs. Unmanaged, Compliant vs. Compromised).
4. **Target Resource Sensitivity**: Confidentiality and risk classification (Public, Internal, Confidential, Restricted, Critical).
5. **Temporal Context**: Enforcing business hour windows and authorized calendar access days.
6. **Dynamic Risk Score (0–100)**: Transparent, explainable risk calculations that determine whether access is `ALLOW`, `DENY`, `STEP_UP_AUTHENTICATION`, or routed for `REQUIRE_APPROVAL`.

Every security decision is persisted immutably in an append-only audit trail with correlation IDs and sensitive data scrubbing.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Tier (Browser)                      │
│      Next.js 14 App Router, Tailwind CSS, Lucide UI Icons       │
├────────────────────────────────┬────────────────────────────────┤
│      API & Middleware Tier     │      Zero-Trust Core Tier      │
│  ├── iron-session (Encrypted)  │  ├── PolicyEngine (Strategy)   │
│  ├── Argon2id Password Hashing │  │   ├── IdentityEvaluator     │
│  ├── Server-Side RBAC          │  │   ├── RoleEvaluator         │
│  ├── Sliding Window Rate Limit │  │   ├── DeviceEvaluator       │
│  ├── Zod Runtime Validation    │  │   ├── ResourceEvaluator     │
│  └── Security Headers Engine   │  │   └── TemporalEvaluator     │
│                                │  ├── RiskEngine (Explainable)  │
│                                │  └── AuditLogger (Append-Only) │
├────────────────────────────────┴────────────────────────────────┤
│                       Data Persistence Tier                     │
│    Prisma ORM (Parameterized) ──▶ PostgreSQL 16 ACID Database    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS | Type-safe SSR/SSG with clean responsive interface |
| **Backend** | Next.js Route Handlers (Node.js 20, TypeScript) | Server-side execution ensuring authorization cannot be bypassed |
| **Database** | PostgreSQL 16 | ACID-compliant relational storage supporting foreign keys & JSONB |
| **ORM** | Prisma 6 | Compile-time type-safety, automatic migrations, parameterized queries |
| **Authentication** | Custom encrypted sessions via `iron-session` + Argon2id | OWASP-recommended password hashing; tamper-proof HttpOnly cookies |
| **Validation** | Zod 3.24 | Runtime schema parsing preventing malformed or malicious payloads |
| **Testing** | Vitest, Playwright, Custom Fuzzing Suite | Automated coverage of unit, integration, E2E, and fuzzing attacks |
| **Containers** | Docker (Multi-stage, Alpine, Non-root `nextjs:1001`) | Minimal attack surface; reproducible deployment environments |
| **Orchestration** | Kubernetes / Minikube (`ztap-system` namespace) | Resource limits, capability dropping, internal network isolation |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) | Automated security linting, testing, and Trivy container scanning |

---

## 4. User Roles & Access Hierarchy

1. **Employee / User**: Can request application access, view own requests, inspect decision risk factors, and monitor registered devices.
2. **Resource / Application Owner**: Manages owned applications, sets approval policies, and reviews pending access requests in an approval queue (with anti-self-approval protection).
3. **Security Administrator**: Full governance over user statuses, role assignments (with anti-self-privilege escalation checks), device trust postures, and active security incidents.
4. **Auditor**: Read-only oversight of the immutable append-only audit trail with filtering and SIEM JSON export.

---

## 5. Quick Start & Local Setup

### Prerequisites
- Node.js 20+ (LTS)
- PostgreSQL 16 (or Docker)
- npm 10+

### Step 1: Clone & Install Dependencies
```bash
cd zero-trust-access-portal
npm install
```

### Step 2: Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```
Ensure `.env` contains valid secrets:
```env
DATABASE_URL=postgresql://ztap_user:ztap_secure_password_2024@localhost:5432/ztap_db?schema=public
SESSION_SECRET=a_very_secure_random_32_character_string_ztap
NODE_ENV=development
```

### Step 3: Run Database Migrations & Seed Realistic Data
```bash
npx prisma db push
npm run db:seed
```

### Step 4: Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 6. Seed Accounts for Evaluators

All seeded development accounts share the password: `P@ssw0rd!2024` (Argon2id hashed).

| Role | Email Address | Access Level |
|---|---|---|
| **Employee** | `employee@example.com` | Standard access request submitter |
| **Security Administrator** | `securityadmin@example.com` | System posture, user roles & device trust |
| **Resource Owner** | `owner@example.com` | Application manager & request approver |
| **Auditor** | `auditor@example.com` | Read-only security audit log inspector |
| **Inactive Account** | `inactive@example.com` | Deactivated user account (demonstrates lockout) |

---

## 7. Automated Testing Suite

Execute the test suites via npm:

```bash
# Run Unit Tests & Policy Engine Tests
npm run test

# Run Fuzzing Tests
npx vitest run tests/fuzz/fuzz.test.ts

# Run Integration & RBAC Protection Tests
npx vitest run tests/integration/rbac-privilege-escalation.test.ts

# Run End-to-End Tests (requires dev server running)
npm run test:e2e
```

---

## 8. Docker & Kubernetes Deployment

### Run via Docker Compose:
```bash
docker compose up -d --build
```
Access at **http://localhost:3000**. Database runs internally on isolated bridge network `ztap-internal-net`.

### Deploy to Minikube:
```bash
minikube start
eval $(minikube docker-env)
docker build -t ztap:latest .
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
minikube service ztap-portal-service -n ztap-system
```

---

## 9. Comprehensive Project Demonstration Guide

Follow this exact 20-step sequence during your academic evaluation to demonstrate all aspects of the system:

1. **Demonstrate Login & Argon2id Authentication**:
   - Navigate to `/login`. Show quick-login selectors.
   - Log in with invalid password → note rejected attempt and rate-limit tracking.
   - Log in as `employee@example.com`.
2. **Review Employee Dashboard & Device Posture**:
   - Show the device status cards (`John's Work Laptop` - TRUSTED, `John's Personal Phone` - UNTRUSTED, `Compromised Workstation` - COMPROMISED).
3. **Submit a Compliant Access Request**:
   - Click "Request Application Access". Select `Developer Repository` from `John's Work Laptop`.
   - Submit request. Show instant `ALLOW` decision (Risk Score ~25, Low Risk).
4. **Inspect Explainable AI / Decision Factors**:
   - Click "Inspect" on the new request. Show contributing risk factors: Valid authentication (-20), Managed device (-10), Low resource sensitivity (+5).
5. **Demonstrate Device Trust Enforcement (COMPROMISED)**:
   - Submit a new request selecting `Compromised Workstation`.
   - Show instant `DENY` decision with reason: `"Device is marked as COMPROMISED"`.
6. **Demonstrate Role-Based Enforcement (Privilege Mismatch)**:
   - Attempt to request access to `Security Dashboard` (requires `SECURITY_ADMIN`).
   - Show instant `DENY` decision with reason: `"User lacks required role: SECURITY_ADMIN"`.
7. **Demonstrate Resource Requiring Approval**:
   - Request access to `Finance System` (High sensitivity, requires approval).
   - Show decision `REQUIRE_APPROVAL` (status `PENDING`).
8. **Demonstrate Resource Owner Approval Workflow**:
   - Log out, log in as `owner@example.com`.
   - Navigate to "App Approvals" (`/owner`).
   - Locate the pending `Finance System` request.
   - Click "Approve", enter approval justification, and confirm.
9. **Demonstrate Anti-Self-Approval Safeguard**:
   - Show that if a resource owner attempts to approve their own request, the system strictly blocks the action with a `CRITICAL` audit event.
10. **Demonstrate Security Administrator Command Center**:
    - Log in as `securityadmin@example.com`. Navigate to `/admin`.
    - Show organization telemetry: Total Users, Active Users, Locked Accounts, Denied Requests.
11. **Demonstrate Anti-Privilege Escalation Protection**:
    - Attempt to modify an admin's own role → verify backend blocking and audit generation.
12. **Demonstrate Device Trust Posture Control**:
    - Switch to "Device Trust & Compliance" tab in Admin.
    - Change a device status to `COMPROMISED` and observe instant revocation of trust score.
13. **Demonstrate Immutable Audit Trail**:
    - Navigate to `/auditor` as `auditor@example.com`.
    - Show append-only log with real-time severity badges (`INFO`, `WARNING`, `CRITICAL`).
    - Expand a log to demonstrate correlation IDs and JSON metadata.
14. **Demonstrate SIEM Export**:
    - Click "Export for SIEM" to show structured JSON export.
15. **Demonstrate Automated Unit & Policy Engine Tests**:
    - In terminal, execute `npm run test` → show all test suites passing.
16. **Demonstrate Fuzzing & Malicious Input Resilience**:
    - Execute `npx vitest run tests/fuzz/fuzz.test.ts` → show SQL injection, XSS, and buffer overflow vectors handled cleanly.
17. **Demonstrate Docker Multi-Stage Build**:
    - Show `Dockerfile` non-root user `nextjs:1001` and run `docker compose ps`.
18. **Demonstrate Kubernetes Manifests & Hardening**:
    - Show `k8s/deployment.yaml` (`runAsNonRoot`, `drop: ["ALL"]`, resource limits).
19. **Demonstrate DevSecOps CI/CD Pipeline**:
    - Show `.github/workflows/ci.yml` with linting, testing, and Trivy scanning.
20. **Demonstrate Requirement Traceability Matrix**:
    - Open `docs/phase-21-final-review.md` and show the end-to-end trace of Requirement SR-05.
