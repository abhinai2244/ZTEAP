# Phase 16 — Kubernetes & Minikube Orchestration

## 1. Kubernetes Architecture Overview

ZTAP deploys onto Kubernetes (tested with Minikube) under an isolated namespace with strict declarative resource quotas and defense-in-depth security contexts.

```
┌─────────────────────────────────────────────────────────────────┐
│               Kubernetes Namespace: ztap-system                 │
│                                                                 │
│  ┌───────────────────────────┐      ┌────────────────────────┐  │
│  │   Deployment: ztap-portal │      │ Deployment:            │  │
│  │   Replicas: 2             │      │ ztap-postgres          │  │
│  │   runAsNonRoot: true      │      │ Replicas: 1            │  │
│  │   drop: ["ALL"]           │      │ runAsNonRoot: true     │  │
│  └─────────────┬─────────────┘      └────────────┬───────────┘  │
│                │                                 │              │
│                ▼                                 ▼              │
│  ┌───────────────────────────┐      ┌────────────────────────┐  │
│  │  Service: ztap-portal-svc │      │ Service:               │  │
│  │  Type: NodePort (30080)   │      │ ztap-postgres-service  │  │
│  │                           │      │ Type: ClusterIP (5432) │  │
│  └───────────────────────────┘      └────────────────────────┘  │
│                                                                 │
│  ConfigMap: ztap-config       Secret: ztap-secrets              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Kubernetes Hardening Standards Applied

| Control | Specification in YAML | Purpose |
|---|---|---|
| **Namespace Isolation** | `metadata.namespace: ztap-system` | Isolates system resources and controls network policies |
| **Non-Root Execution** | `securityContext.runAsNonRoot: true` | Prevents pods from executing processes as UID 0 |
| **Privilege Escalation Block** | `allowPrivilegeEscalation: false` | Prevents child processes from gaining more privileges than parent |
| **Capability Dropping** | `capabilities.drop: ["ALL"]` | Eliminates all standard Linux kernel capabilities |
| **Resource Limits** | `limits.cpu: 1000m, memory: 512Mi` | Mitigates Denial of Service (DoS) and noisy neighbor attacks |
| **ClusterIP Internal Storage** | PostgreSQL service type `ClusterIP` | Database is unreachable outside the cluster network |
| **Rolling Updates** | `maxSurge: 1, maxUnavailable: 0` | Zero-downtime secure deployment rollout |

---

## 3. Minikube Step-by-Step Deployment Guide

### Step 1: Start Minikube Cluster
```bash
minikube start --driver=docker --cpus=2 --memory=4096
```

### Step 2: Build & Load Docker Image into Minikube
```bash
eval $(minikube docker-env)
docker build -t ztap:latest .
```

### Step 3: Apply Declarative Manifests
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Step 4: Verify Deployment & Pod Status
```bash
kubectl get pods -n ztap-system
kubectl get svc -n ztap-system
```

### Step 5: Check Application Logs
```bash
kubectl logs -n ztap-system -l app=ztap-portal -f
```

### Step 6: Access Portal in Browser
```bash
minikube service ztap-portal-service -n ztap-system --url
```
