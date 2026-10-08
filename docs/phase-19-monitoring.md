# Phase 19 — Security Logging & Continuous Monitoring

## 1. Security Telemetry & Metrics Architecture

ZTAP continuously generates structured security events ingested into an immutable append-only audit repository (`AuditLog` table).

```
┌────────────────────────────────────────────────────────┐
│             ZTAP Core Application Layers               │
│  (Auth, RBAC, PolicyEngine, RiskEngine, Approvals)     │
└───────────────────────────┬────────────────────────────┘
                            │ Structured Event
                            ▼
┌────────────────────────────────────────────────────────┐
│                   AuditLogger Service                  │
│  ├── Redaction Filter (scrubs passwords, tokens)       │
│  ├── Correlation ID Injector (UUID v4)                 │
│  └── Severity Classifier (INFO, WARNING, ERROR, CRIT)  │
└───────────────────────────┬────────────────────────────┘
                            │ Parameterized Write
                            ▼
┌────────────────────────────────────────────────────────┐
│               PostgreSQL: audit_logs                   │
│  ├── Immutable, append-only, indexed on timestamp      │
│  └── Direct SIEM Ingestion (JSON Export Endpoint)      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Five Core Security Metrics & Automated Alerts

| Metric / Alert ID | Alert Trigger | Severity | Recommended SOC Response |
|---|---|---|---|
| **SEC-METRIC-01** | **Excessive Failed Logins**: > 5 failed attempts within 15 minutes for a single IP or user account | `WARNING` | Automatically locks user account for 15 minutes; flags IP address in firewall |
| **SEC-METRIC-02** | **Self-Privilege Escalation Attempt**: User attempting to modify or assign roles to their own account | `CRITICAL` | Block immediately; notify Security Administrator; initiate session revocation |
| **SEC-METRIC-03** | **Critical Access Denials**: Access denied due to `COMPROMISED` device status | `CRITICAL` | Quarantine device; revoke all active user sessions; notify endpoint security team |
| **SEC-METRIC-04** | **High-Risk Access Anomalies**: Access requests generating risk score > 80 (e.g., off-hours + untrusted device) | `WARNING` | Require mandatory step-up authentication or manual resource owner approval |
| **SEC-METRIC-05** | **Policy & Role Tampering**: Any administrative modification to active access policies or role assignments | `INFO` / `WARNING` | Cross-verify change against formal change management tickets |

---

## 3. Structured Logging Standard

All audit events are persisted in JSON-compatible structures conforming to this schema:

```json
{
  "id": "7f09c258-45a8-42fa-9a4d-0453e9a7e6d2",
  "timestamp": "2026-10-08T10:15:30.124Z",
  "actorId": "usr-89234",
  "actorEmail": "employee@example.com",
  "action": "ACCESS_DENIED",
  "resource": "Database Administration Portal",
  "resourceId": "res-0007",
  "ipAddress": "192.168.1.105",
  "result": "DENY",
  "severity": "WARNING",
  "correlationId": "corr-3b4e9f1a",
  "metadata": {
    "riskScore": 87,
    "riskLevel": "CRITICAL",
    "reason": "Device is unmanaged and request attempted outside business hours"
  }
}
```

### Sensitive Data Scrubbing Rules:
- Keys matching `password`, `token`, `secret`, `hash`, `cookie`, or `authorization` are automatically replaced with `[REDACTED]` prior to storage.
