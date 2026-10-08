# Phase 18 — Automated Security & Fuzz Testing

## 1. Security Testing Strategy

ZTAP implements testing across the test pyramid:
- **Unit Tests**: PolicyEngine evaluation branches, RiskEngine factor calculation, Argon2id verification.
- **Integration Tests**: RBAC boundary enforcement, anti-self-approval enforcement, IDOR protection.
- **Fuzzing Tests**: Malicious SQL injection payloads, XSS vectors, buffer overruns, format strings.
- **End-to-End (E2E) Tests**: Complete browser-driven workflow using Playwright.

---

## 2. Test Execution & Evidence Matrix

| ID | Input | Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **UT-01** | Employee credentials, compliant managed device | PolicyEngine evaluateAccess with low risk context | Returns `ALLOW`, risk score <= 30 | `ALLOW` returned, risk score 25 | **PASS** |
| **UT-02** | Device with `status: 'COMPROMISED'` | PolicyEngine evaluateAccess with compromised device | Returns `DENY`, mentions COMPROMISED device | `DENY` returned immediately | **PASS** |
| **UT-03** | User with `status: 'INACTIVE'` | PolicyEngine evaluateAccess with inactive user | Returns `DENY`, account inactive | `DENY` returned, account inactive | **PASS** |
| **UT-04** | Employee role requesting `SECURITY_ADMIN` resource | RoleEvaluator with low privilege user accessing admin app | Returns `DENY`, role mismatch | `DENY` returned, insufficient role | **PASS** |
| **IT-01** | Employee session executing `POST /api/users` | RBAC middleware user creation attempt by non-admin | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **IT-02** | Security Admin attempting to assign role to own user ID | Anti-Privilege-Escalation check on `/api/users/:id/roles` | HTTP 400/403, logs `PRIVILEGE_ESCALATION_ATTEMPT` | Blocked, audit log generated | **PASS** |
| **IT-03** | Resource Owner approving their own access request | Anti-Self-Approval check on `/api/approvals/:id` | HTTP 403, logs `SELF_APPROVAL_ATTEMPT` | Blocked, audit log generated | **PASS** |
| **IT-04** | Employee A attempting to inspect Employee B's request ID | IDOR prevention on `/api/access/requests/:id` | HTTP 403/404 Access Denied | HTTP 403 Access Denied | **PASS** |
| **E2E-01** | Valid employee login, device check, request submission | Full browser access request lifecycle | Flow completes and modal displays risk breakdown | Flow succeeded, modal displayed | **PASS** |

---

## 3. Fuzzing Test Findings & Remediation Log

Fuzz tests were executed against core input vectors (`tests/fuzz/fuzz.test.ts`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Fuzzing Test Campaign Log                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Target 1: Access Request Reason Field                                                  │
│   • Input: "' OR '1'='1 --", "<script>alert(1)</script>", "A" x 10,000                │
│   • Finding: Initial prototype accepted unescaped HTML characters.                     │
│   • Fix Applied: Added strict Zod regex `^[^<>{}]*$` and max length 500 characters.    │
│   • Retest Result: PASS (Rejected with clean HTTP 400 validation error).               │
│                                                                                        │
│ Target 2: Resource ID & Device ID UUID Fields                                          │
│   • Input: "../../../etc/passwd", "%s%s%s%n", null bytes "\0"                         │
│   • Finding: Handled gracefully by Zod `z.string().uuid()`.                            │
│   • Retest Result: PASS (Clean validation rejection, zero database exceptions).        │
│                                                                                        │
│ Target 3: Authentication Login Form                                                    │
│   • Input: Buffer overruns, non-email strings, prototype pollution payloads            │
│   • Finding: Handled cleanly by Zod `loginSchema` and Argon2id constant-time dummy.   │
│   • Retest Result: PASS (No unhandled exceptions, zero timing leakages).               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
