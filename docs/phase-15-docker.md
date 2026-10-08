# Phase 15 — Containerization with Docker

## 1. Container Architecture

The ZTAP application is packaged into a containerized microservice environment utilizing Docker and Docker Compose.

```
┌────────────────────────────────────────────────────────┐
│                   Docker Host Engine                   │
│                                                        │
│  ┌──────────────────────────┐    ┌──────────────────┐  │
│  │     ztap-portal          │    │  ztap-postgres   │  │
│  │  (Next.js App Runtime)   │───▶│  (Database Eng)  │  │
│  │  Port: 3000 (Exposed)    │    │  Port: 5432      │  │
│  │  Non-root: nextjs:1001   │    │  (Internal Only) │  │
│  └──────────────────────────┘    └──────────────────┘  │
│                ▲                          ▲            │
│                └──────────┬───────────────┘            │
│                           │                            │
│                 ztap-internal-net                      │
│             (Isolated Bridge Network)                  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Security Hardening Controls

1. **Multi-Stage Build Pipeline**:
   - Stage 1 (`deps`): Downloads dependencies.
   - Stage 2 (`builder`): Compiles TypeScript and generates Next.js standalone server.
   - Stage 3 (`runner`): Pure runtime containing only necessary artifacts. Build tools and source files are excluded.

2. **Least Privilege Non-Root Execution**:
   - The runtime container creates a dedicated system user:
     ```dockerfile
     RUN addgroup --system --gid 1001 nodejs
     RUN adduser --system --uid 1001 nextjs
     USER nextjs
     ```
   - Prevents container escape attacks from acquiring host root privileges.

3. **Attack Surface Minimization**:
   - Base image is `node:20-alpine`, reducing the OS package footprint by over 80% compared to Debian/Ubuntu bases.

4. **Network Isolation**:
   - Database port 5432 is not exposed to the host operating system; only the internal `ztap-internal-net` network can communicate with PostgreSQL.

5. **Liveness & Health Checks**:
   - Built-in `HEALTHCHECK` instructions ensure Docker monitors container availability:
     ```dockerfile
     HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
       CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/me || exit 1
     ```

---

## 3. Operational Commands

### Build Image:
```bash
docker build -t ztap:latest .
```

### Launch Environment via Docker Compose:
```bash
docker compose up -d
```

### Check Running Containers:
```bash
docker compose ps
```

### View Application Logs:
```bash
docker compose logs -f ztap-app
```

### Teardown Environment:
```bash
docker compose down
```
