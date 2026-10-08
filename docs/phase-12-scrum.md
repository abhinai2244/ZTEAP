# Phase 12 - Scrum Execution

> [!NOTE]
> Sprint data below is SAMPLE data created for academic documentation purposes. It represents a realistic simulation of how the project would be managed using Scrum.

## 1. Board Columns

The Scrum board utilizes the following columns to track progress:
- **TO DO**: Items selected for the Sprint but not yet started.
- **IN PROGRESS**: Items currently being worked on by the development team.
- **TESTING**: Items where development is complete and are pending QA/security review.
- **DONE**: Items that meet the Definition of Done (DoD).

## 2. Sprint 1 Execution

### Daily Scrum Entries (Sample)

- **Day 1:**
  - What I did: Sprint planning and initial repository setup.
  - What I will do: Start working on US-01 (Authentication).
  - Blockers: Waiting for exact database schema approval.
- **Day 3:**
  - What I did: Completed US-01 and US-02 login/logout.
  - What I will do: Move to US-03 and US-04 (Authorization & Roles).
  - Blockers: None.
- **Day 5:**
  - What I did: Completed basic role assignments. Found a minor issue with session handling.
  - What I will do: Fix session defect, start US-05 (Device Trust).
  - Blockers: None.
- **Day 8:**
  - What I did: Implemented US-07 and US-08 (Access Requests & Policy).
  - What I will do: Refine policy evaluation logic and add unit tests.
  - Blockers: Need clarification on default policy fallback.
- **Day 10:**
  - What I did: Finalized US-10 (Approvals). Code freeze for Sprint Review.
  - What I will do: Prepare demo for stakeholders.
  - Blockers: None.

### Sprint 1 Burndown Data (Sample)

| Day | Ideal Remaining (Points) | Actual Remaining (Points) |
| --- | ------------------------ | ------------------------- |
| 1   | 44                       | 44                        |
| 3   | 35                       | 37                        |
| 5   | 26                       | 30                        |
| 7   | 17                       | 22                        |
| 9   | 8                        | 10                        |
| 10  | 0                        | 5                         |

### Metrics

- **Velocity:** Planned: 44 SP | Completed: 39 SP
- **Defect Count:** 3 defects found during testing, 2 resolved within the sprint.
- **Carry-over:** 1 defect (session invalidation edge case) carried over to Sprint 2.

### Sprint Review & Retrospective

- **Sprint Review:** Demonstrated secure login, basic role assignment, and an end-to-end access request flow. Stakeholders provided positive feedback but requested clearer error messages on denied access.
- **Sprint Retrospective:**
  - **What went well:** Core authentication was implemented smoothly using Argon2id.
  - **What didn't go well:** Underestimated the complexity of the Zero Trust Policy Engine (US-08).
  - **Improvement Actions:**
    - Action 1: Implement security review checklist for each PR.
    - Action 2: Add automated security linting to CI pipeline.

## 3. Sprint 2 Execution

### Daily Scrum Entries (Sample)

- **Day 1:**
  - What I did: Sprint planning and carrying over the remaining defect.
  - What I will do: Resolve Sprint 1 defect and start US-11 (Audit Logging).
  - Blockers: None.
- **Day 4:**
  - What I did: Completed US-11 and US-12 (Employee Dashboard).
  - What I will do: Work on US-13 (Admin Dashboard) and US-14 (Policy definition).
  - Blockers: None.
- **Day 7:**
  - What I did: Finished UI components for dashboards. Working on US-16 (Prevent self-approval).
  - What I will do: Implement US-17 (Privilege escalation prevention).
  - Blockers: Encountered a tricky edge case in RBAC testing.
- **Day 9:**
  - What I did: Completed US-18 (Disable account) and US-19 (Session security).
  - What I will do: Finalize US-20 (Export logs) and prepare for final review.
  - Blockers: None.
- **Day 10:**
  - What I did: All stories in TESTING or DONE. Finalized demo script.
  - What I will do: Sprint Review.
  - Blockers: None.

### Sprint 2 Burndown Data (Sample)

| Day | Ideal Remaining (Points) | Actual Remaining (Points) |
| --- | ------------------------ | ------------------------- |
| 1   | 40                       | 40                        |
| 3   | 32                       | 33                        |
| 5   | 24                       | 20                        |
| 7   | 16                       | 15                        |
| 9   | 8                        | 6                         |
| 10  | 0                        | 0                         |

### Metrics

- **Velocity:** Planned: 40 SP | Completed: 40 SP
- **Defect Count:** 4 defects found, 4 resolved.
- **Carry-over:** 0 SP.

### Sprint Review & Retrospective

- **Sprint Review:** Demonstrated the comprehensive Zero Trust portal, including risk-based scoring, dashboards, and audit logs. The system correctly blocked self-approvals and suspicious devices.
- **Sprint Retrospective:**
  - **What went well:** Velocity improved and estimates were more accurate. CI pipeline linting caught several issues early.
  - **What didn't go well:** UI consistency in dashboards took more effort than expected.
  - **Improvement Actions:**
    - Action 1: Increase E2E test coverage for authorization flows.
    - Action 2: Document all policy engine evaluation rules for easier onboarding.

## 4. Velocity Chart Data (Sample)

| Sprint   | Planned Points | Completed Points |
| -------- | -------------- | ---------------- |
| Sprint 1 | 44             | 39               |
| Sprint 2 | 40             | 40               |
