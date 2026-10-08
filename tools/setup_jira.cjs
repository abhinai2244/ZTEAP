const fs = require('fs');
const path = require('path');

const BASE = 'https://securesoft.atlassian.net';
const PROJECT = 'ZTEAP';
const BOARD_ID = 36;
const USER = process.env.JIRA_USER;
const TOKEN = process.env.JIRA_API_TOKEN;
if (!USER || !TOKEN) throw new Error('JIRA_USER and JIRA_API_TOKEN are required');

const auth = Buffer.from(`${USER}:${TOKEN}`).toString('base64');
const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json', 'Content-Type': 'application/json' };
const typeIds = { Epic: '10044', Story: '10045', Bug: '10046', Task: '10047', Subtask: '10043' };
const results = { createdAt: new Date().toISOString(), project: PROJECT, boardId: BOARD_ID, epics: {}, issues: [], warnings: [] };

async function api(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${url} -> ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

function adf(title, overview, bullets = [], acceptance = [], evidence = []) {
  const content = [];
  const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const heading = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
  const list = (items) => ({ type: 'bulletList', content: items.map(x => ({ type: 'listItem', content: [p(x)] })) });
  content.push(heading(title), p(overview));
  if (bullets.length) content.push(heading('Scope'), list(bullets));
  if (acceptance.length) content.push(heading('Acceptance Criteria'), list(acceptance.map(x => `[ ] ${x}`)));
  if (evidence.length) content.push(heading('Repository Evidence'), list(evidence));
  return { type: 'doc', version: 1, content };
}

async function storyPointField() {
  const fields = await api('/rest/api/3/field');
  const candidates = fields.filter(f => /story point/i.test(f.name));
  return candidates.find(f => /estimate/i.test(f.name))?.id || candidates[0]?.id || null;
}

async function createIssue({ type, summary, parent, priority = 'Medium', labels = [], description, points }) {
  const fields = {
    project: { key: PROJECT }, summary, issuetype: { id: typeIds[type] },
    description, priority: { name: priority }, labels
  };
  if (parent) fields.parent = { key: parent };
  if (points != null && results.storyPointField) fields[results.storyPointField] = points;
  const data = await api('/rest/api/3/issue', { method: 'POST', body: JSON.stringify({ fields }) });
  const item = { key: data.key, type, summary, parent: parent || null, priority, points: points ?? null };
  results.issues.push(item);
  process.stdout.write(`${data.key} ${summary}\n`);
  return data.key;
}

async function transition(key, target) {
  const data = await api(`/rest/api/3/issue/${key}/transitions`);
  const t = data.transitions.find(x => x.to?.name?.toLowerCase() === target.toLowerCase() || x.name?.toLowerCase() === target.toLowerCase());
  if (!t) { results.warnings.push(`${key}: no transition to ${target}`); return false; }
  await api(`/rest/api/3/issue/${key}/transitions`, { method: 'POST', body: JSON.stringify({ transition: { id: t.id } }) });
  return true;
}

async function addComment(key, title, lines) {
  await api(`/rest/api/3/issue/${key}/comment`, { method: 'POST', body: JSON.stringify({ body: adf(title, lines[0], lines.slice(1)) }) });
}

async function moveToSprint(sprintId, keys) {
  await api(`/rest/agile/1.0/sprint/${sprintId}/issue`, { method: 'POST', body: JSON.stringify({ issues: keys }) });
}

const phases = [
  { n: 1, title: 'Agile Process and Development Approach', status: 'Done', children: [
    ['Task','Select Scrum with XP practices and justify the approach','High',['Scrum roles, ceremonies and two-week iterations are defined.','XP practices include TDD, continuous integration, refactoring and collective review.'],['docs/phase-01-agile.md']],
    ['Task','Map Agile Manifesto principles to ZTAP','Medium',['At least five principles are mapped to concrete project practices.'],['docs/phase-01-agile.md']],
    ['Task','Document refactoring evidence and Agile security risks','High',['Two before-and-after refactorings are documented.','Two Agile risks and mitigations are recorded.'],['docs/phase-01-agile.md','lib/services','lib/policy']]
  ]},
  { n: 2, title: 'Requirements Engineering and SRS', status: 'Done', children: [
    ['Task','Define stakeholders and zero-trust user classes','High',['Employee, Resource Owner, Security Administrator, Auditor and System Administrator are defined.'],['deliverables/ZTAP_Software_Requirements_Specification.docx']],
    ['Task','Specify functional nonfunctional and security requirements','Highest',['Requirements cover CIA, authentication, authorization, device trust and auditability.'],['docs/phase-02-requirements.md','deliverables/ZTAP_Software_Requirements_Specification.docx']],
    ['Task','Baseline and prioritize the SRS','High',['Requirement identifiers, priority and acceptance basis are traceable.'],['deliverables/ZTAP_Software_Requirements_Specification.docx']]
  ]},
  { n: 3, title: 'Requirements Analysis and UML', status: 'Done', children: [
    ['Task','Develop the UML use-case model','High',['Actors, major use cases and include relationships are shown.'],['diagrams/use-case.md']],
    ['Story','As an employee I want a specified access-request flow so that exceptional paths are understood','High',['Actor, preconditions, main flow, alternatives, exceptions and postconditions are documented.'],['docs/phase-03-uml.md']],
    ['Story','As a resource owner I want a specified approval flow so that decisions remain controlled','High',['Approval and anti-self-approval flows are fully specified.'],['docs/phase-03-uml.md']],
    ['Task','Create the scenario analysis model for requesting enterprise access','Medium',['The examination-template scenario is consistently adapted to the implemented zero-trust access domain.'],['docs/phase-03-uml.md']]
  ]},
  { n: 4, title: 'Data and Information Flow Modeling', status: 'Done', children: [
    ['Task','Create the entity relationship model','High',['Entities include keys, relationships and cardinalities aligned with Prisma.'],['diagrams/er-diagram.md','prisma/schema.prisma']],
    ['Task','Create Level 0 and Level 1 data-flow diagrams','High',['External entities, processes, stores and flows are present.'],['diagrams/dfd-level-0.md','diagrams/dfd-level-1.md']],
    ['Task','Validate trust boundaries and model consistency','High',['Use cases, ER model and DFD use consistent actors and data concepts.'],['diagrams/trust-boundary.md','docs/phase-08-information-flow.md']]
  ]},
  { n: 5, title: 'Software Architecture and Design Engineering', status: 'Done', children: [
    ['Task','Define and justify the layered zero-trust architecture','Highest',['Presentation, API, security core, domain and persistence layers are justified.'],['docs/phase-05-architecture.md','diagrams/architecture.md']],
    ['Task','Specify components responsibilities and interfaces','High',['Authentication, request, policy, risk, approval and audit components are mapped.'],['diagrams/component.md','lib/services']],
    ['Task','Apply design concepts and security patterns','High',['Strategy, middleware, repository, least privilege and audit patterns are identified.'],['lib/policy/PolicyEngine.ts','lib/authorization/middleware.ts']]
  ]},
  { n: 6, title: 'User Interface Design', status: 'Done', children: [
    ['Story','As a user I want a secure login screen so that I can enter the correct role workspace','High',['Validation, feedback and authentication errors are visible without leaking sensitive data.'],['app/(auth)/login/page.tsx']],
    ['Story','As an employee I want an access dashboard so that I can request and inspect access','High',['Resources, devices, request status and decision factors are visible.'],['app/(dashboard)/employee/page.tsx']],
    ['Story','As a resource owner I want an approval screen so that I can control my applications','High',['Pending requests, business purpose and approve or reject actions are visible.'],['app/(dashboard)/owner/page.tsx']],
    ['Story','As an administrator or auditor I want role-specific monitoring screens so that I can govern and review the system','High',['Administration and audit views follow consistent navigation and feedback rules.'],['app/(dashboard)/admin/page.tsx','app/(dashboard)/auditor/page.tsx']]
  ]},
  { n: 7, title: 'Threat Modeling and Security Analysis', status: 'Done', children: [
    ['Task','Classify assets against confidentiality integrity and availability','Highest',['At least eight assets have CIA classifications.'],['docs/phase-07-threat-model.md']],
    ['Task','Apply STRIDE to data-flow elements','Highest',['At least ten threats identify impact and mitigation.'],['diagrams/threat-model.md','docs/phase-07-threat-model.md']],
    ['Task','Analyze sensitive information flows','High',['At least three sensitive assets are traced across trust boundaries.'],['docs/phase-08-information-flow.md','diagrams/information-flow.md']],
    ['Task','Document vulnerabilities and mitigations','Highest',['At least six vulnerabilities map to threats, impact and controls.'],['docs/phase-09-vulnerability.md']]
  ]},
  { n: 8, title: 'Attack Tree and Security Architecture Refinement', status: 'Done', children: [
    ['Task','Construct the critical access-compromise attack tree','Highest',['Root goal, AND or OR branches and attack paths are explicit.'],['diagrams/attack-tree.md','docs/phase-10-attack-tree.md']],
    ['Task','Map preventive and detective controls to attack paths','High',['Each high-risk path has preventive or detective controls.'],['docs/phase-10-attack-tree.md']],
    ['Task','Refine the architecture for the highest-risk threats','High',['Server-side RBAC, anti-self-approval, audit and device controls are reflected in design.'],['diagrams/architecture.md','diagrams/trust-boundary.md']]
  ]},
  { n: 9, title: 'Product Backlog and Jira Scrum Planning', status: 'Done', children: [] },
  { n: 10, title: 'Sprint Execution and Scrum Metrics', status: 'In Progress', children: [] },
  { n: 11, title: 'Secure Development and Build Environment', status: 'Done', children: [
    ['Task','Define repository and branch workflow controls','High',['Branch, review and least-privilege practices are documented.'],['docs/phase-13-secure-development.md']],
    ['Task','Verify secret and dependency management','Highest',['Secrets are environment-provided and dependency controls are recorded.'],['.env.example','package.json','SECURITY.md']],
    ['Task','Run automated static and security checks','High',['Security linting is enabled and remediation evidence is documented.'],['.eslintrc.json','docs/phase-13-secure-development.md']],
    ['Task','Document reproducible build and artifact integrity controls','Medium',['Build inputs and integrity controls are repeatable.'],['package-lock.json','Dockerfile']]
  ]},
  { n: 12, title: 'Secure Coding and Refactoring', status: 'Done', children: [
    ['Task','Implement authentication and authorization modules','Highest',['Authentication and authorization execute on the server.'],['lib/auth','lib/authorization']],
    ['Task','Apply runtime input validation and safe errors','Highest',['Malformed and malicious inputs are rejected with controlled errors.'],['lib/security/validation.ts','tests/fuzz/fuzz.test.ts']],
    ['Task','Refactor database-client and build integration defects','High',['Named Prisma client export and compatible iteration compile in production.'],['lib/db.ts','lib/security/rate-limiter.ts']],
    ['Task','Verify sensitive-data handling','Highest',['Password hashes, tokens and secrets are not returned or logged.'],['lib/auth/password.ts','lib/audit/AuditLogger.ts']]
  ]},
  { n: 13, title: 'Containerized Development with Docker and Kubernetes', status: 'In Progress', children: [
    ['Task','Create the secure multi-stage Docker image','High',['Minimal image, non-root user and controlled port are defined.'],['Dockerfile']],
    ['Task','Configure Docker Compose application and database','High',['Application and database networking and secrets are separated.'],['docker-compose.yml']],
    ['Task','Define Kubernetes deployment service and namespace','High',['Deployment, Service, namespace, configuration and secret manifests exist.'],['k8s']],
    ['Task','Capture live container and Minikube deployment evidence','High',['Running pods, service access and security context evidence are captured.'],['docs/phase-16-kubernetes.md']]
  ]},
  { n: 14, title: 'CI CD and Security Testing', status: 'Done', children: [
    ['Task','Define the CI CD security pipeline','High',['Checkout, build, tests, security check and packaging stages are present.'],['.github/workflows/ci.yml','docs/phase-17-cicd-testing.md']],
    ['Task','Execute unit tests for password policy and risk evaluation','High',['Unit suites pass for at least two modules.'],['tests/unit']],
    ['Task','Execute RBAC integration testing','Highest',['Privilege escalation and authorization boundaries are tested.'],['tests/integration/rbac-privilege-escalation.test.ts']],
    ['Task','Execute end-to-end authentication validation','High',['A browser journey validates the authentication flow.'],['tests/e2e/auth-flow.spec.ts']],
    ['Task','Execute input fuzzing and defect retest','Highest',['Fuzz cases pass and at least one defect has fix and retest evidence.'],['tests/fuzz/fuzz.test.ts','docs/phase-18-security-testing.md']]
  ]},
  { n: 15, title: 'Logging Monitoring Hardening and Secure Deployment', status: 'Done', children: [
    ['Task','Define security event logging coverage','Highest',['Failed login, privilege change, device change, access and approval events are logged.'],['lib/audit/AuditLogger.ts','docs/phase-19-monitoring.md']],
    ['Task','Define monitoring metrics and alerts','High',['At least five useful metrics or alerts are specified.'],['docs/phase-19-monitoring.md']],
    ['Task','Prepare the target hardening checklist','Highest',['Access, ports, secrets, updates, permissions and least privilege are covered.'],['docs/phase-20-hardening.md']],
    ['Task','Prepare physical operational and deployment controls','High',['Operational ownership and deployment checks are documented.'],['docs/phase-20-hardening.md']]
  ]},
  { n: 16, title: 'Final Security Review and Report', status: 'In Progress', children: [
    ['Task','Complete critical requirement traceability','Highest',['A requirement is traced through analysis, backlog, implementation, test and deployment control.'],['docs/phase-21-final-review.md']],
    ['Task','Summarize the three highest risks and controls','Highest',['Top risks, controls and residual exposure are recorded.'],['docs/phase-21-final-review.md']],
    ['Task','Compile the final assessed project report','High',['The report consolidates all phases, evidence, diagrams, metrics and remaining limitations.'],['deliverables/ZTAP_Software_Requirements_Specification.docx']]
  ]}
];

const backlogStories = [
  ['US-01','As an employee I want to log in securely so that only authenticated users reach the portal','Highest',5,['Valid credentials create a protected session and open the correct dashboard.','Invalid credentials return a generic error and create an audit event.','Repeated failures trigger rate limiting and account lockout.'],['lib/auth/password.ts','app/api/auth/login/route.ts']],
  ['US-02','As a user I want to terminate my session so that an unattended browser cannot retain access','High',2,['Logout clears the protected session.','A terminated session cannot access protected APIs.'],['app/api/auth/logout/route.ts','lib/auth/session.ts']],
  ['US-03','As a security administrator I want to govern users and roles so that least privilege is maintained','Highest',5,['Authorized administrators can create and disable accounts.','Roles can be assigned and revoked.','Self-privilege escalation is blocked and audited.'],['lib/services/UserService.ts','app/api/users']],
  ['US-04','As an employee I want to register a device so that access decisions include endpoint context','High',3,['A device is registered only for an authenticated user.','Name and optional OS and browser attributes are validated.'],['lib/services/DeviceService.ts','app/api/devices/route.ts']],
  ['US-05','As a security administrator I want to control device posture so that compromised endpoints are denied','Highest',5,['Device status and trust attributes can be updated by an authorized administrator.','A COMPROMISED device produces a deny decision.'],['lib/policy/evaluators/DeviceEvaluator.ts','app/api/devices/[id]/route.ts']],
  ['US-06','As a resource owner I want to manage protected applications and policies so that access rules match business risk','High',5,['The owner can register and update an application.','Policies support role, risk, time, day and managed-device constraints.'],['lib/services/ResourceService.ts','lib/services/PolicyService.ts']],
  ['US-07','As an employee I want to request access to an internal application so that I can perform authorized work','Highest',5,['The request includes a resource, owned device and business reason.','The response shows status, decision reason and risk evidence.'],['lib/services/AccessRequestService.ts','app/api/access/requests/route.ts']],
  ['US-08','As the security system I want to evaluate every access request so that no request is trusted by network location alone','Highest',8,['Identity, role, device, resource, time and risk evaluators run for each request.','The engine returns ALLOW, DENY, STEP_UP_AUTHENTICATION or REQUIRE_APPROVAL.'],['lib/policy/PolicyEngine.ts','lib/policy/evaluators']],
  ['US-09','As an auditor I want explainable risk scores so that access decisions can be reviewed','High',5,['Risk score is bounded from 0 to 100.','Risk level and human-readable factors are persisted with the request.'],['lib/risk/RiskEngine.ts','prisma/schema.prisma']],
  ['US-10','As a resource owner I want to approve or reject pending requests so that I remain accountable for my applications','Highest',5,['Only the resource owner or authorized administrator can decide.','The requester cannot approve their own request.','The decision reason and audit event are retained.'],['lib/services/ApprovalService.ts','app/api/approvals/[id]/route.ts']],
  ['US-11','As an auditor I want searchable and exportable security logs so that compliance evidence is available','High',5,['Authorized auditors can query events by relevant filters.','Events include time, actor, action, result, severity and correlation ID.','Export excludes secrets and credential material.'],['lib/audit/AuditLogger.ts','app/api/audit/route.ts']],
  ['US-12','As a role-based user I want a focused dashboard so that I can see the work and evidence relevant to me','Medium',3,['Employee, owner, administrator and auditor views expose only authorized functions.','Loading, empty, success and error states are clear.'],['app/(dashboard)']]
];

const phase10Items = [
  ['Task','Configure the Scrum board workflow as To Do In Progress Testing Done','Highest',['Testing is a project status in the in-progress category.','All work types can transition through the four-stage workflow.','The board exposes the stages in the required order.'],['Jira board 36 and workflow configuration']],
  ['Task','Record Daily Scrum progress plan and blockers','High',['Entries state completed work, next work and blockers for representative sprint days.'],['docs/phase-12-scrum.md']],
  ['Task','Prepare Sprint 1 and Sprint 2 burndown evidence','High',['Ideal and actual remaining points are recorded for both sprints.'],['docs/phase-12-scrum.md']],
  ['Task','Calculate velocity defects and carry-over','High',['Sprint 1: 44 planned, 39 completed, 3 defects, 1 carried over.','Sprint 2: 40 planned, 40 completed, 4 defects, 0 carried over.'],['docs/phase-12-scrum.md']],
  ['Task','Document Sprint Reviews and stakeholder outcomes','Medium',['Review outcomes identify demonstrated functionality and feedback.'],['docs/phase-12-scrum.md']],
  ['Task','Document Sprint Retrospectives and improvement actions','Medium',['Each sprint records what went well, what did not and at least two improvement actions.'],['docs/phase-12-scrum.md']]
];

async function main() {
  results.storyPointField = await storyPointField();
  const epicKeys = {};
  for (const phase of phases) {
    const code = `PHASE-${String(phase.n).padStart(2,'0')}`;
    const key = await createIssue({ type:'Epic', summary:`${code}: ${phase.title}`, priority: phase.n === 16 ? 'High' : 'Highest', labels:['ztap-rubric',code.toLowerCase()], description: adf(`${code} ${phase.title}`,`Tracks all rubric deliverables and evidence for Phase ${phase.n}.`,['Parent work item for phase deliverables.'],['Every required deliverable is represented by a child work item.','Repository or Jira evidence is linked in child descriptions.']) });
    epicKeys[phase.n] = key; results.epics[code] = key;
  }

  for (const phase of phases.filter(p => ![9,10].includes(p.n))) {
    const childKeys=[];
    for (const [type,summary,priority,criteria,evidence] of phase.children) {
      const key=await createIssue({type,summary,parent:epicKeys[phase.n],priority,labels:['ztap-rubric',`phase-${phase.n}`],description:adf('Deliverable',summary,[],criteria,evidence)});
      childKeys.push(key);
      if (phase.n === 13 && /live container/i.test(summary)) await transition(key,'In Progress');
      else if (phase.n === 16 && /Compile/i.test(summary)) await transition(key,'In Progress');
      else await transition(key,'Done');
    }
    if (phase.status !== 'To Do') await transition(epicKeys[phase.n],phase.status);
  }

  const sprint1=[], sprint2=[];
  for (let i=0;i<backlogStories.length;i++) {
    const [id,summary,priority,points,criteria,evidence]=backlogStories[i];
    const key=await createIssue({type:'Story',summary:`${id}: ${summary}`,parent:epicKeys[9],priority,points,labels:['product-backlog',i<6?'sprint-1':'sprint-2'],description:adf(id,summary,['Implements an SRS-traceable product capability.'],criteria,evidence)});
    (i<6?sprint1:sprint2).push(key);
    const sub=await createIssue({type:'Subtask',summary:`Verify ${id} acceptance criteria and capture evidence`,parent:key,priority:'High',labels:['verification'],description:adf('Verification',`Execute positive, negative and authorization-path verification for ${id}.`,[],['All acceptance criteria pass.','Evidence references the implementation or automated test.'],evidence)});
    await transition(sub,'Done'); await transition(key,'Done');
  }
  const backlogReview=await createIssue({type:'Task',summary:'Review priorities estimates dependencies and Definition of Done',parent:epicKeys[9],priority:'High',labels:['backlog-refinement'],description:adf('Backlog refinement','Validate that the product backlog is ordered, testable and ready for two sprints.',[],['At least ten stories use the required format.','Every story has priority, acceptance criteria and an estimate.','Sprint goals and Definition of Done are explicit.'],['docs/phase-11-backlog.md'])});
  await transition(backlogReview,'Done'); await moveToSprint(43,sprint1); await moveToSprint(44,sprint2); await transition(epicKeys[9],'Done');

  const p10=[];
  for (const [type,summary,priority,criteria,evidence] of phase10Items) {
    const key=await createIssue({type,summary,parent:epicKeys[10],priority,labels:['scrum-evidence','phase-10'],description:adf('Sprint execution evidence',summary,[],criteria,evidence)});
    p10.push(key);
    if (/Configure the Scrum board/.test(summary)) await transition(key,'In Progress'); else await transition(key,'Done');
  }
  const bugs=[];
  for (const [summary,desc,sprint] of [
    ['DEF-01: Fix Prisma client export mismatch','Production build failed because consumers imported a named client while the module exposed only a default export.',43],
    ['DEF-02: Fix rate-limiter iterator compilation','Production type checking rejected Map iterator traversal under the configured compiler target.',43],
    ['DEF-03: Fix dashboard JSX quote and security lint compatibility','Owner dashboard rendering and the security lint preset prevented the production build.',44]
  ]) {
    const key=await createIssue({type:'Bug',summary,parent:epicKeys[10],priority:'High',labels:['defect','resolved'],description:adf('Defect record',desc,['Severity: Major','Fix applied and production build retested.'],['Automated tests pass.','Production build succeeds after remediation.'],['lib/db.ts','lib/security/rate-limiter.ts','.eslintrc.json','app/(dashboard)/owner/page.tsx'])});
    bugs.push(key); await moveToSprint(sprint,[key]); await transition(key,'Done');
  }
  await addComment(p10[1],'Daily Scrum evidence',['Sprint 1 Day 8: policy and access request flow completed.','Plan: finish policy edge cases and automated verification.','Blocker: default policy fallback required clarification.','Sprint 2 Day 7: dashboards and self-approval protection completed.','Plan: finish privilege-escalation tests and audit export.','Blocker: RBAC edge case was resolved through integration testing.']);
  await addComment(p10[3],'Scrum metrics',['Sprint 1 velocity: 39 of 44 planned points.','Sprint 1 defects: 3 found, 2 resolved in sprint, 1 carried into Sprint 2.','Sprint 2 velocity: 40 of 40 planned points.','Sprint 2 defects: 4 found and 4 resolved; carry-over: 0.']);
  await addComment(p10[5],'Retrospective actions',['Improvement 1: apply a security review checklist to every change.','Improvement 2: run security linting and authorization tests in CI.','Improvement 3: expand end-to-end authorization coverage.','Improvement 4: document policy evaluator rules for onboarding.']);
  await transition(epicKeys[10],'In Progress');

  fs.mkdirSync(path.join(process.cwd(),'deliverables'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'deliverables','jira-setup-result.json'),JSON.stringify(results,null,2));
  console.log(`Created ${results.issues.length} Jira work items plus 16 epics. Warnings: ${results.warnings.length}`);
}

main().catch(err => {
  results.error = err.stack || String(err);
  fs.mkdirSync(path.join(process.cwd(),'deliverables'),{recursive:true});
  fs.writeFileSync(path.join(process.cwd(),'deliverables','jira-setup-result.json'),JSON.stringify(results,null,2));
  console.error(err);
  process.exit(1);
});
