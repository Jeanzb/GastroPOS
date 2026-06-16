# GastroAI Backend Build Plan

This document turns the product rules in `AGENTS.md` into a backend-first
implementation path. The goal is to build the operational core in small,
reviewable commits, with tenant isolation, auditability, and security present
from the first business endpoints.

## Sources Checked

- NestJS authentication: https://docs.nestjs.com/security/authentication
- NestJS guards: https://docs.nestjs.com/guards
- NestJS validation: https://docs.nestjs.com/techniques/validation
- NestJS exception filters: https://docs.nestjs.com/exception-filters
- NestJS Prisma recipe: https://docs.nestjs.com/recipes/prisma
- Prisma transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Prisma seeding: https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding
- Docker Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- DIAN technical documentation: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/

## Corrections To The Current Instructions

1. The spec mixes build order with final architecture.
   The backend should not jump from foundation directly into products. It needs
   a reusable HTTP/API boundary first: error envelope, request context,
   authentication boundary, authorization boundary, and audit service.

2. Tenant isolation is stated correctly, but the enforcement mechanism is not
   explicit enough.
   The rule should say: controllers never accept `tenantId` as user input for
   tenant-owned resources. Repositories receive a trusted `TenantContext`
   created from the authenticated request.

3. Audit logging is required, but there is no early audit infrastructure.
   The audit module should be built before login/product mutations so critical
   actions do not ship without traceability.

4. Fiscal readiness is too broad for early backend work.
   The correct early step is to define a fiscal boundary and data model for
   lifecycle/status tracking. Direct DIAN submission or provider certification
   must stay out until a provider decision and legal validation exist.

5. The first vertical slice should be backend-first.
   The frontend can validate the UX later, but the backend should first prove:
   auth, sessions, tenant context, RBAC, repository isolation, audit logs,
   DTO validation, Swagger, and tests.

6. "Users and roles" needs a simpler first model.
   Start with the existing enum-based RBAC and add a future-ready permissions
   table only when a real use case requires it. Premature granular permission
   design will slow the core.

7. Soft delete needs unique-index planning.
   If records can be soft deleted but names/codes must be reused, unique
   constraints need to include `deletedAt` strategy or use explicit conflict
   rules. Do not add soft delete blindly to every table.

8. Money handling must be enforced at schema boundaries.
   Prices, totals, payments, taxes, and costs should use integer minor units
   for COP-focused flows. Decimal math should be isolated where tax precision
   requires it.

## Backend Architecture Decisions

- Backend remains NestJS + Prisma + PostgreSQL.
- Controllers handle HTTP only.
- Services/use cases orchestrate business workflows.
- Repositories are the only classes that inject `PrismaService`.
- Business modules receive `TenantContext` instead of raw tenant IDs.
- Authentication uses access JWT plus refresh token rotation.
- Refresh tokens are stored hashed and tied to sessions.
- Mutations that affect business-critical state write audit logs.
- Transactional flows use Prisma `$transaction`.
- API errors use the standard envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message.",
    "details": {}
  }
}
```

## Atomic Commit Roadmap

### Commit 1: Backend Build Plan

- Add this document.
- No runtime behavior changes.

### Commit 2: Common API Boundary

- Add common error codes and application exception helpers.
- Add global exception filter that emits the standard error envelope.
- Add request ID middleware/interceptor.
- Add shared pagination DTO/helpers.
- Register the filter globally.
- Verify typecheck/build.

### Commit 3: Audit Foundation

- Add `AuditLog` Prisma model and migration.
- Add `AuditModule`, `AuditService`, and repository.
- Support fire-and-fail-safe audit writes from services.
- Add unit tests for audit payload shaping.

### Commit 4: Identity Schema

- Add `Session` and `RefreshToken` models.
- Add useful user indexes and auth metadata.
- Add dev seed for tenant, branch, and OWNER user.
- Add seed script to root package.

### Commit 5: Auth Backend

- Add auth module: login, refresh, logout, current user.
- Add password hashing service.
- Hash refresh tokens.
- Rotate refresh tokens.
- Audit login, failed login, refresh, logout.
- Add auth tests.

### Commit 6: Authorization And Tenant Context

- Add JWT guard, roles guard, `@Public()`, `@CurrentUser()`,
  `@RequireRoles()`.
- Add tenant/branch context builder.
- Reject branch context not owned by user's tenant.
- Add tests for tenant isolation and role failures.

### Commit 7: Catalog Schema

- Add `ProductCategory` and `Product`.
- Use integer minor units for product price.
- Include active/inactive and soft-delete fields.
- Add tenant-scoped unique rules.
- Add migration.

### Commit 8: Category API

- Add category repository/service/controller/DTOs.
- Enforce tenant isolation in repository.
- Add pagination, search, soft delete.
- Add Swagger decorators.
- Add tests.

### Commit 9: Product API

- Add product repository/service/controller/DTOs.
- Snapshot-ready fields: sellable/inventoried, price minor units, tax profile placeholder.
- Audit price changes.
- Add tests for permissions and tenant isolation.

### Commit 10: Backend Container Hardening

- Add API Dockerfile with multi-stage build.
- Add `.dockerignore`.
- Add optional compose API service with health dependency on Postgres/Redis.
- Validate compose config.

### Commit 11: Inventory Base

- Add units of measure, inventory items, and stock movement schema.
- Add controlled stock movement service.
- Do not expose direct stock updates.

### Commit 12: Cash And Sales Base

- Add cash sessions, cash movements, sales, sale items, payments.
- Implement draft sale, register payment, close sale in transactions.
- Add cash movement creation for cash payments.

### Commit 13: Purchases Base

- Add suppliers, purchase orders, receiving.
- Receiving creates stock movements transactionally.

### Commit 14: Reporting Read Models

- Add backend report endpoints for daily sales, cash closing, product sales,
  and inventory stock.
- Keep read queries separate from write-domain services.

### Commit 15: Fiscal Readiness Boundary

- Add fiscal profiles, provider config, invoices, invoice events.
- Add draft invoice creation from accepted sale data.
- No direct DIAN/provider submission yet.

## Acceptance Criteria For Each Backend Commit

- `bun run typecheck` passes.
- `bun run build` passes.
- Tests are added for behavior when runtime behavior changes.
- Prisma migrations are generated for schema changes.
- Endpoints return DTOs, never raw Prisma records.
- Tenant-owned repository methods require `TenantContext`.
- Business-critical mutations write audit logs.
- Swagger metadata is added for public API endpoints.

