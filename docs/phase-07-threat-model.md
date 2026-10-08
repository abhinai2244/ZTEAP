# Phase 7: Threat Model & STRIDE Analysis

## 1. Assets and CIA Classification

| Asset | Confidentiality | Integrity | Availability | Description |
|---|---|---|---|---|
| User credentials (passwords, hashes) | High | High | High | Hashed passwords (Argon2id) used for user authentication. |
| Session tokens | High | High | High | Tokens identifying authenticated user sessions. |
| User identity and profile data | Medium | High | High | Basic user information (email, name). |
| Role and permission assignments | High | High | High | RBAC mapping for users. |
| Access policies and rules | High | High | High | Policies determining resource access. |
| Internal resource/application metadata | Medium | High | High | Details about the protected resources. |
| Access request data | Medium | High | High | Records of user requests for access. |
| Audit logs | High | High | High | System-wide logs for accountability. |
| Risk assessment results | Medium | High | High | Risk Engine evaluation scores (0-100). |
| Approval decisions | Medium | High | High | Outcomes of access requests (ALLOW/DENY). |
| Device trust information | Medium | High | High | Device status (TRUSTED/COMPLIANT/UNTRUSTED/COMPROMISED). |
| Database connection credentials | High | High | High | Credentials for the backend to access PostgreSQL. |

## 2. STRIDE Threat Analysis

| ID | DFD Element | Threat | STRIDE Category | Impact | Likelihood | Risk Level | Mitigation |
|---|---|---|---|---|---|---|---|
| T-01 | Login API | Attacker impersonates user with stolen credentials | Spoofing | High | Medium | High | Argon2id hashing, account lockout, rate limiting |
| T-02 | Session Store | Attacker modifies session token | Tampering | High | Low | Medium | Signed encrypted sessions (iron-session), HttpOnly Secure cookies |
| T-03 | Access Request API | User denies making access request | Repudiation | Medium | Medium | Medium | Immutable audit logging with timestamps and correlation IDs |
| T-04 | Policy Engine | Attacker extracts policy rules | Information Disclosure | Medium | Low | Low | Server-side only, no policy details in API responses |
| T-05 | Login API | Brute force attack | Denial of Service | High | High | High | Rate limiting, account lockout, CAPTCHA-ready |
| T-06 | User Management API | Employee escalates to admin role | Elevation of Privilege | Critical | Medium | Critical | Server-side RBAC, role change audit logging |
| T-07 | Access Request API | Bypass device trust check | Elevation of Privilege | High | Medium | High | Server-side device validation, no client-side trust |
| T-08 | Audit Log Store | Attacker deletes audit entries | Tampering | Critical | Low | High | Append-only logging, no DELETE endpoint, DB-level protection |
| T-09 | Resource API | IDOR to access other users' resources | Information Disclosure | High | Medium | High | Server-side ownership checks, parameterized queries |
| T-10 | Approval API | Employee approves own request | Elevation of Privilege | High | Medium | High | Self-approval prevention check, audit logging |
| T-11 | Device API | Spoofed device status report | Spoofing | High | Medium | High | Mutual TLS, cryptographic device attestation |
| T-12 | Database | Unauthorized database extraction | Information Disclosure | Critical | Low | High | Network isolation, strict DB user privileges, encrypted backups |
