# ZTAP (Zero-Trust Enterprise Access Portal) - Phase 1: Agile Process

## 1. Agile Methodology Selection
For the ZTAP project, we have selected a hybrid Agile methodology combining **Scrum** with selected **eXtreme Programming (XP)** practices.

### Selected XP Practices:
*   **Pair Programming:** For critical components like the Policy Engine and Authentication Service to ensure immediate peer review of security-critical logic.
*   **Test-Driven Development (TDD):** Ensuring that all access control rules, risk assessments, and authentication flows are rigorously tested before implementation.
*   **Continuous Integration (CI):** Automated builds and security testing (SAST, dependency scanning) on every commit.
*   **Refactoring:** Continuous improvement of code structure without altering external behavior, crucial for maintaining a clean security posture.

### Why this is suitable for a security-critical application:
Scrum provides a structured framework for managing complexity and delivering iterative value through Sprints. However, standard Scrum lacks specific engineering practices. By incorporating XP practices like TDD and Pair Programming, we introduce rigorous quality control and security oversight at the code level. This hybrid approach ensures that we can respond to changing business needs (Scrum) while maintaining the high assurance and low defect rate required for an enterprise zero-trust portal (XP).

## 2. Agile Manifesto Principles Mapped to ZTAP

1.  **Individuals and interactions over processes and tools:** 
    *   *ZTAP Mapping:* Fostering close collaboration between the development team and the security team on threat models and architectural reviews, ensuring security is built-in rather than bolted-on by a tool later.
2.  **Working software over comprehensive documentation:**
    *   *ZTAP Mapping:* Prioritizing demonstrable features, such as a working Policy Engine making ALLOW/DENY decisions, over lengthy theoretical specifications. (Though security docs remain essential, the focus is on the working system).
3.  **Customer collaboration over contract negotiation:**
    *   *ZTAP Mapping:* Active involvement of stakeholders (Security Administrators, Resource Owners) in defining and refining security requirements, risk thresholds, and access workflows.
4.  **Responding to change over following a plan:**
    *   *ZTAP Mapping:* The ability to rapidly adapt the Risk Engine and Policy Engine to the evolving threat landscape and new attack vectors identified during the project lifecycle.
5.  **Simplicity - the art of maximizing the amount of work not done - is essential:**
    *   *ZTAP Mapping:* Adhering to the principle of "least-privilege by default." Keeping access rules, policy definitions, and the codebase as simple as possible to reduce the attack surface and minimize potential vulnerabilities.

## 3. Refactoring Opportunities

### Refactoring 1: Inline Authorization Checks → Middleware-based RBAC
*   **Before:** Each API route manually checks user roles (e.g., `if (user.role === 'admin')`). This approach is error-prone; developers might forget the check on a new endpoint.
*   **After:** Implementation of a `withAuthorization('SECURITY_ADMIN')` middleware wrapper that centrally intercepts requests.
*   **Security improvement:** Eliminates the risk of missed authorization checks on critical endpoints (broken access control).
*   **Maintainability improvement:** Provides a single point of change for role-evaluation logic.

### Refactoring 2: Direct Password Handling → Dedicated AuthService
*   **Before:** Password hashing and comparison logic are implemented inline within the login and registration API routes.
*   **After:** Encapsulating all password operations into a dedicated `AuthService.verifyCredentials()` method using Argon2id.
*   **Security improvement:** Ensures consistent hashing parameters across the application and prevents accidental logging or exposure of plaintext passwords in route handlers.
*   **Maintainability improvement:** Creates a single, highly cohesive module for all credential handling, simplifying future updates (e.g., changing work factors).

## 4. Agile Limitations and Risks for Security-Critical Systems

*   **Risk 1:** Fast iterations and pressure to deliver features quickly may lead to skipping thorough security reviews or penetration testing.
    *   **Mitigation:** Enforce a mandatory security review checklist per sprint. Integrate automated security testing (SAST/DAST) into the CI pipeline to catch low-hanging fruit automatically.
*   **Risk 2:** Changing requirements and constant refactoring may invalidate the initial threat model, introducing unforeseen attack vectors.
    *   **Mitigation:** Make a lightweight threat model review a mandatory component of the "Definition of Done" for any architectural or significant feature change.
