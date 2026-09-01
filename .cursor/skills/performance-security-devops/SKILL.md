---
name: performance-security-devops
description: Performance engineering, security, and DevOps expectations. Performance — low latency, minimal bundle size, responsive rendering, caching, GPU acceleration, CUDA, mixed precision, quantization. Security — authentication, authorization, RBAC, secrets, encryption, rate limiting, audit logging, compliance. DevOps — CI/CD, observability, monitoring, deployment automation, secrets management, rollback strategies, environment isolation, cost optimization. Use when designing infrastructure, reviewing production code, hardening systems, or evaluating deployment readiness.
---

# Performance Engineering

## Optimization Targets

| Area | Goal |
|------|------|
| UI Latency | Sub-100ms for interactions |
| API Latency | Sub-500ms for typical calls |
| Bundle Size | Code splitting, tree shaking, dynamic imports |
| Rendering | 60fps animations, no layout thrashing |
| Caching | Aggressive, with proper invalidation |
| Memory | No leaks, efficient data structures |
| GPU | CUDA acceleration for ML workloads |
| Loading | Progressive, streaming, optimistic |

## Frontend Performance

- Code splitting at route level
- Lazy loading for below-fold content
- Image optimization (WebP, AVIF, srcset, lazy)
- Respect `prefers-reduced-motion`
- Virtual scrolling for large lists
- Debounced inputs, throttled events
- Service worker caching strategies

## AI/ML Performance

- CUDA acceleration for training and inference
- Mixed precision (FP16/BF16) where supported
- Quantization for deployment (INT8, INT4)
- Efficient batch processing
- Gradient checkpointing for memory-constrained GPUs
- Model parallelism for large models
- Efficient data loading pipelines (prefetch, num_workers)

## Backend Performance

- Connection pooling
- Query optimization (N+1 prevention)
- Response compression
- Async I/O for concurrent operations
- Horizontal scaling design
- Cache layers (Redis, in-memory LRU)

---

# Security & Trust

## Always Consider

| Area | Requirements |
|------|-------------|
| Authentication | MFA, token-based, session management |
| Authorization | Role-based access control (RBAC) |
| Secrets | Never in code — env vars or vaults |
| API Security | Rate limiting, input validation, CORS |
| Encryption | TLS in transit, encryption at rest |
| Abuse Prevention | Rate limiting, CAPTCHA, anomaly detection |
| Audit Logging | Who did what, when, from where |
| Compliance | GDPR, SOC2, HIPAA readiness |

## Security Rules

1. Never expose credentials — not in logs, responses, or source
2. Environment variables for all secrets
3. Secret managers for production (Azure Key Vault, AWS Secrets Manager)
4. Least-privilege for all service accounts
5. Input validation on every endpoint
6. Output encoding to prevent XSS
7. Parameterized queries to prevent SQL injection
8. HTTPS everywhere — no exceptions
9. Security headers (CSP, HSTS, X-Frame-Options)
10. Dependency scanning for known vulnerabilities

## Rate Limiting Defaults

| Endpoint Class | Limit |
|----------------|-------|
| Authentication | 5/min |
| API (authenticated) | 60/min |
| Public | Generous but bounded |
| AI generation | Cost-aware (per-token, per-cost) |

---

# DevOps & Infrastructure

## Always Consider

- CI/CD pipelines (automated build, test, deploy)
- Observability (metrics, traces, logs)
- Monitoring and alerting
- Deployment automation
- Secrets management
- Rollback strategies
- Environment isolation (dev/staging/prod)
- Cost optimization
- Disaster recovery

## Preferred Tooling

| Category | Tools |
|----------|-------|
| CI/CD | GitHub Actions |
| Containers | Docker, Docker Compose |
| Orchestration | Kubernetes (when needed), Container Apps |
| IaC | Terraform, Bicep |
| Cloud | Azure, AWS, Vercel, Railway, Supabase |
| Database | PostgreSQL, Redis |
| Monitoring | Application Insights, Prometheus, Grafana |
| Logging | Structured JSON logs |

## Documentation Requirements

For infrastructure decisions, document:

- Architecture decisions (ADRs)
- Deployment architecture diagrams
- Scaling assumptions and limits
- Operational runbooks
- Incident response procedures
- Cost projections
