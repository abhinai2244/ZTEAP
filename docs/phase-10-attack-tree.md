# Phase 10: Attack Tree Analysis

## Primary Goal: Gain Unauthorized Access to Sensitive Application

```text
GOAL: Gain Unauthorized Access to Sensitive Application
├── OR: Steal Valid Credentials
│   ├── Brute force login
│   ├── Phishing attack
│   └── Credential stuffing
├── OR: Exploit Session
│   ├── Session hijacking (XSS)
│   ├── Session fixation
│   └── Replay attack
├── OR: Privilege Escalation
│   ├── AND: Modify own role
│   │   ├── Find unprotected role API
│   │   └── Assign admin role to self
│   ├── AND: Exploit IDOR
│   │   ├── Discover other user's request ID
│   │   └── Modify request to approve own access
├── OR: Bypass Policy Engine
│   ├── Manipulate device trust data
│   ├── Manipulate timestamp
│   └── Access resource directly bypassing API
├── OR: Compromise Trusted Device
│   ├── AND: Install malware
│   │   ├── Gain access to employee device
│   │   └── Modify device trust status
```

### Path Defenses (Primary Goal)

1.  **Steal Valid Credentials**
    *   **Preventive Controls**: Argon2id hashing, rate limiting, MFA/Step-up authentication.
    *   **Detective Controls**: Failed login monitoring, abnormal geographic login alerts.
    *   **Mitigations**: Account lockout, forced password reset on suspected compromise.
2.  **Exploit Session**
    *   **Preventive Controls**: `HttpOnly`, `Secure`, `SameSite=strict` cookies, short session lifespans.
    *   **Detective Controls**: Concurrent session detection.
    *   **Mitigations**: Immediate session invalidation.
3.  **Privilege Escalation**
    *   **Preventive Controls**: Strict server-side RBAC, self-modification restrictions.
    *   **Detective Controls**: Audit log alerts for role changes.
    *   **Mitigations**: Revert unauthorized changes, suspend offending accounts.
4.  **Bypass Policy Engine**
    *   **Preventive Controls**: Default-deny posture, API gateway enforcing policy evaluation, backend resource isolation.
    *   **Detective Controls**: Access requests lacking corresponding policy evaluation records.
    *   **Mitigations**: Block direct resource access network-wide.
5.  **Compromise Trusted Device**
    *   **Preventive Controls**: EDR (Endpoint Detection and Response) agent, OS updates.
    *   **Detective Controls**: Device trust status downgrade signals.
    *   **Mitigations**: Revoke device trust, terminating associated active sessions.

## Secondary Goal: Modify another user's access privileges

```text
GOAL: Modify another user's access privileges
├── OR: Compromise Admin Account
│   ├── Steal Admin Credentials
│   └── Exploit Admin Session
├── OR: Exploit RBAC Implementation Flaw
│   ├── IDOR in Role Assignment API
│   └── Parameter tampering (injecting role ID)
```
