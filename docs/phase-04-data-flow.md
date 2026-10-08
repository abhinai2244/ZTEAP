# Phase 4 - Data and Information Flow

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ UserRole : has
    User ||--o{ Device : owns
    User ||--o{ AccessRequest : makes
    User ||--o{ Session : maintains
    User ||--o{ Approval : grants
    Role ||--o{ UserRole : contains
    Role ||--o{ Permission : defines
    Resource ||--o{ ResourcePolicy : protected_by
    Resource ||--o{ AccessRequest : targets
    AccessRequest ||--|| AccessDecision : results_in
    AccessRequest ||--|| RiskAssessment : undergoes
    AccessRequest ||--o{ Approval : requires
    User ||--o{ AuditLog : performs
    AccessDecision ||--o{ AuditLog : triggers

    User {
        uuid id PK
        string email
        string password_hash
        boolean is_active
    }
    Role {
        uuid id PK
        string name
        string description
    }
    Permission {
        uuid id PK
        uuid role_id FK
        string action
    }
    UserRole {
        uuid user_id FK
        uuid role_id FK
    }
    Device {
        uuid id PK
        uuid user_id FK
        string device_identifier
        string trust_status
    }
    Resource {
        uuid id PK
        string name
        string sensitivity
        boolean is_active
    }
    ResourcePolicy {
        uuid id PK
        uuid resource_id FK
        string constraints
    }
    AccessRequest {
        uuid id PK
        uuid user_id FK
        uuid resource_id FK
        uuid device_id FK
        datetime request_time
        string status
    }
    AccessDecision {
        uuid id PK
        uuid request_id FK
        string decision
        string reason
    }
    RiskAssessment {
        uuid id PK
        uuid request_id FK
        int risk_score
        string factors
    }
    Approval {
        uuid id PK
        uuid request_id FK
        uuid approver_id FK
        string status
    }
    AuditLog {
        uuid id PK
        uuid actor_id FK
        string action
        string resource
        datetime timestamp
    }
    Session {
        uuid id PK
        uuid user_id FK
        datetime expires_at
    }
```

## 2. DFD Level 0 (Context Diagram)

The Level 0 Data Flow Diagram outlines the highest level of abstraction for the Zero-Trust Access Portal (ZTAP). 

```mermaid
flowchart TD
    %% External Entities
    Emp[Employee / User]
    Admin[Security Administrator]
    RO[Resource Owner]
    Auditor[Auditor]

    %% Process 0
    ZTAP((ZTAP System))

    %% Data Flows
    Emp -- Login Credentials --> ZTAP
    ZTAP -- Session Token --> Emp
    Emp -- Access Request --> ZTAP
    ZTAP -- Access Decision --> Emp

    Admin -- Management Policies --> ZTAP
    ZTAP -- System Status --> Admin

    RO -- Resource Config --> ZTAP
    ZTAP -- Approval Requests --> RO
    RO -- Approvals --> ZTAP

    Auditor -- Log Query --> ZTAP
    ZTAP -- Audit Reports --> Auditor
```

## 3. DFD Level 1

The Level 1 DFD decomposes the ZTAP system into primary functional processes and associated data stores.

```mermaid
flowchart TD
    %% External Entities
    Emp[Employee]
    Admin[Security Administrator]
    RO[Resource Owner]
    Auditor[Auditor]

    %% Processes
    P1((P1 Authentication))
    P2((P2 User Management))
    P3((P3 Resource Mgt))
    P4((P4 Access Request Processing))
    P5((P5 Policy Evaluation))
    P6((P6 Risk Assessment))
    P7((P7 Approval Workflow))
    P8((P8 Audit Logging))

    %% Data Stores
    D1[(D1 User Store)]
    D2[(D2 Resource Store)]
    D3[(D3 Device Store)]
    D4[(D4 Request Store)]
    D5[(D5 Policy Store)]
    D6[(D6 Audit Store)]

    %% Flows
    Emp -->|Credentials| P1
    P1 <-->|Verify| D1
    P1 -->|Token| Emp

    Emp -->|Request| P4
    P4 -->|Store| D4
    P4 -->|Trigger| P5

    P5 <-->|Fetch Rules| D5
    P5 <-->|Fetch Role| D1
    P5 <-->|Check Device| D3
    P5 -->|Trigger| P6
    P6 -->|Calculate Score| P5

    P5 -->|Decision| P4
    P5 -->|Requires Approval| P7
    P7 -->|Notify| RO
    RO -->|Approve/Reject| P7
    P7 -->|Update| D4

    Admin -->|Manage| P2
    P2 -->|Update| D1
    Admin -->|Manage| P5
    P5 -->|Update| D5
    Admin -->|Manage| P3
    P3 -->|Update| D2

    Auditor -->|Query| P8
    P8 <-->|Fetch| D6
    P8 -->|Logs| Auditor

    P1 -.->|Log| P8
    P4 -.->|Log| P8
    P5 -.->|Log| P8
    P7 -.->|Log| P8
```

## 4. Trust Boundaries

Trust boundaries delineate different levels of trust within the application's architecture:

- **TB1: User Browser → Frontend**: Low-trust boundary. Input must be validated. XSS/CSRF protections are necessary.
- **TB2: Frontend → Backend API**: Crossing from the public network into the internal network structure. Requires strict authentication, rate-limiting, and CORS controls.
- **TB3: Backend → Database**: High-trust inner boundary. Protects against SQLi using an ORM (Prisma). Minimal privileges assigned to the DB credentials.
- **TB4: Backend → Policy Engine**: Internal integration point evaluating zero-trust rules. Output determines access state, so responses must be cryptographically verified if decoupled.
- **TB5: Admin Interface → Security Management APIs**: Privileged boundary. Strict RBAC enforcement and heightened audit logging apply to all administrative interactions.

## 5. Consistency Check

- **Use Cases mapped to DFD Processes**: 
  - `Login` is executed in `P1 Authentication`.
  - `Request Access` triggers `P4 Access Request Processing`.
  - `Evaluate Access` and `Calculate Risk` are handled by `P5 Policy Evaluation` and `P6 Risk Assessment`.
  - `Manage Users`, `Roles`, `Policies`, and `Resources` correspond directly to `P2 User Management`, `P3 Resource Management`, and associated stores.
- **Use Cases mapped to ER Entities**: 
  - Initiating an Access Request creates an `AccessRequest` entity.
  - Policy execution pulls from `ResourcePolicy`, `Role`, `UserRole`, `Device`, and creates an `AccessDecision` and `RiskAssessment`.
- **Entity consistency**: All items inside `D1 User Store`, `D2 Resource Store`, etc., map exactly to the entities detailed in the ER diagram ensuring the data and workflow maintain a 1-to-1 parity structurally.
