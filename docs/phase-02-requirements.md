# ZTAP (Zero-Trust Enterprise Access Portal) - Phase 2: Requirements Engineering

## 1. Stakeholders

| Stakeholder | Description | Key Concerns |
| :--- | :--- | :--- |
| **Employee/User** | Standard user requesting access to enterprise resources. | Ease of use, quick access approvals, clear feedback on access denial. |
| **Security Administrator** | Manages system-wide security policies, roles, and device trust configurations. | Comprehensive visibility, fine-grained policy enforcement, incident response capabilities. |
| **Resource Owner** | Responsible for specific enterprise resources and defining access criteria. | Granular control over resource access, delegation of approval authority. |
| **Auditor** | Independent entity verifying compliance with security standards and regulations. | Immutable audit logs, transparent access decisions, historical reporting. |
| **System Administrator** | Manages the underlying infrastructure (Docker, K8s, PostgreSQL). | System uptime, scalability, easy deployment, backup and recovery. |

## 2. Functional Requirements

| ID | Requirement Description | Priority |
| :--- | :--- | :--- |
| **FR-01** | The system must allow Users to authenticate using a secure mechanism. | Must |
| **FR-02** | The system must provide Security Administrators with a dashboard to manage Users and Roles. | Must |
| **FR-03** | The system must allow Resource Owners to register and manage Resources. | Must |
| **FR-04** | The system must track Device Trust state (TRUSTED, COMPLIANT, UNTRUSTED, COMPROMISED). | Must |
| **FR-05** | The system must allow Users to submit Access Requests for specific Resources. | Must |
| **FR-06** | The Policy Engine must evaluate access requests based on Identity, Role, Device Trust, Resource Policy, and Time. | Must |
| **FR-07** | The Risk Engine must calculate a risk score (0-100) for each access request. | Should |
| **FR-08** | The system must support Access Decisions of ALLOW, DENY, STEP_UP_AUTHENTICATION, and REQUIRE_APPROVAL. | Must |
| **FR-09** | The system must route REQUIRE_APPROVAL decisions to the designated Resource Owner. | Should |
| **FR-10** | The system must generate immutable Audit Logs for all authentication attempts and access decisions. | Must |
| **FR-11** | The system must provide role-specific Dashboards tailored to the logged-in user. | Should |
| **FR-12** | The system must manage active Sessions and allow Security Admins to terminate them. | Must |
| **FR-13** | The system must implement account lockout mechanisms after consecutive failed login attempts. | Must |
| **FR-14** | The system must allow Security Administrators to assign multi-role mappings to Users. | Should |
| **FR-15** | The system must provide search and filter capabilities for Audit Logs and Access Requests. | Could |

## 3. Non-Functional Requirements

| ID | Requirement Description | Priority |
| :--- | :--- | :--- |
| **NFR-01** | **Performance:** The Policy Engine must evaluate access requests in under 200ms. | Must |
| **NFR-02** | **Scalability:** The system must support horizontal scaling to handle 10,000 concurrent users. | Should |
| **NFR-03** | **Availability:** The system must achieve 99.9% uptime during business hours. | Must |
| **NFR-04** | **Usability:** The user interface must comply with WCAG 2.1 AA accessibility standards. | Should |
| **NFR-05** | **Maintainability:** The codebase must maintain a minimum test coverage of 85%. | Must |
| **NFR-06** | **Portability:** The application must be deployable via Docker and Kubernetes. | Must |
| **NFR-07** | **Compatibility:** The web frontend must support the latest versions of Chrome, Firefox, Safari, and Edge. | Should |
| **NFR-08** | **Documentation:** All API endpoints must be documented using OpenAPI/Swagger specifications. | Should |

## 4. Security Requirements

| ID | Requirement Description | Priority |
| :--- | :--- | :--- |
| **SR-01** | **Confidentiality:** All sensitive data in transit must be encrypted using TLS 1.2 or higher. | Must |
| **SR-02** | **Authentication:** Passwords must be hashed using the Argon2id algorithm; plaintext storage is strictly forbidden. | Must |
| **SR-03** | **Authorization:** All API endpoints must implement server-side Role-Based Access Control (RBAC). | Must |
| **SR-04** | **BOLA Protection:** The system must verify that the requesting user has authorization to access the specific requested entity ID (Prevent IDOR/BOLA). | Must |
| **SR-05** | **Input Validation:** All user inputs must be strictly validated and sanitized on the backend prior to processing. | Must |
| **SR-06** | **Session Security:** Session tokens must be securely generated, stored in HttpOnly/Secure cookies, and have a defined expiration time. | Must |
| **SR-07** | **CSRF Protection:** The system must implement anti-CSRF tokens for all state-changing operations. | Must |
| **SR-08** | **Security Headers:** HTTP responses must include appropriate security headers (e.g., CSP, X-Frame-Options, HSTS). | Must |
| **SR-09** | **Audit Logging:** Audit logs must be tamper-evident and append-only at the application level. | Must |
| **SR-10** | **Secrets Management:** Cryptographic keys and application secrets must be stored securely (e.g., using a vault or environment variables), never in code. | Must |
| **SR-11** | **Privilege Escalation:** System architecture must prevent vertical and horizontal privilege escalation attacks. | Must |
| **SR-12** | **Device Trust:** The system must verify Device Trust status before evaluating access policies. | Must |
| **SR-13** | **Least Privilege:** Internal services and database users must operate with the minimum privileges necessary. | Must |
