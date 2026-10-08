# Phase 17 — DevSecOps CI/CD Pipeline

## 1. Pipeline Architecture

ZTAP leverages GitHub Actions for an automated DevSecOps continuous integration and continuous deployment pipeline located at `.github/workflows/ci.yml`.

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions Runner                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stage 1: Verification & Unit Tests                             │
│  ├── Checkout Source Code                                       │
│  ├── Setup Node.js 20 & Restore Cache                           │
│  ├── Spin up ephemeral PostgreSQL test service                  │
│  ├── Static Analysis: ESLint Security Plugin                    │
│  ├── Run Vitest: Unit, Risk Engine & Policy Tests               │
│  └── Dependency Scan: npm audit                                 │
│                                                                 │
│  Stage 2: Container Security & Image Analysis                   │
│  ├── Docker Buildx: Multi-stage Dockerfile                      │
│  └── Trivy Vulnerability Scan: Container CVE Detection          │
│                                                                 │
│  Stage 3: Deployment Manifest Dry-Run                           │
│  └── kubectl apply --dry-run=client against K8s manifests       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DevSecOps Quality & Security Gates

1. **Gate 1: Lint & Code Quality**:
   - ESLint rules enforce code standards and flag dangerous patterns (such as `eval`, unsanitized regexes, insecure child processes).

2. **Gate 2: Automated Security Testing**:
   - Vitest suite validates that Zero-Trust logic behaves deterministically:
     - Compromised devices are blocked.
     - Inactive users are rejected.
     - Privilege escalation attempts fail.

3. **Gate 3: Software Composition Analysis (SCA)**:
   - Automated dependency audit verifies that no package dependencies contain known Moderate, High, or Critical CVEs.

4. **Gate 4: Container Vulnerability Scanning (Trivy)**:
   - Trivy scans the built container filesystem for OS package and library vulnerabilities before image deployment.

5. **Gate 5: Declarative Manifest Validation**:
   - `kubectl apply --dry-run=client` validates syntax, API versions, and schema correctness for all Kubernetes manifests.
