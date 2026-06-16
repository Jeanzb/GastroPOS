# AGENTS.md — GastroAI Core Build Rules

## 1. Project Identity

GastroAI is a desktop-first SaaS platform for restaurants and food businesses.

The product helps restaurants control their daily operation from one place:

- POS and sales
- Tables and orders
- Cash register and shift closing
- Products and menu
- Inventory and stock movements
- Purchases and suppliers
- Employees and roles
- Reports and business metrics
- Colombian electronic invoicing readiness

Brand positioning:

> Inteligencia operativa para restaurantes.

Core promise:

> Less manual chaos, better control, better decisions.

The application must feel fast, reliable, clear, and operational. This is business software for real restaurants, not a decorative demo.

---

## 2. Product Type

This project is a desktop application with a cloud-ready backend.

Recommended architecture:

- Desktop client: Electron + React + TypeScript
- API backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Cache and queues: Redis
- Background jobs: BullMQ
- Validation: Zod or class-validator depending on the layer
- API documentation: Swagger/OpenAPI
- Authentication: JWT with refresh tokens
- Authorization: RBAC with future support for permissions
- Deployment: Docker-based backend
- Local development: Docker Compose

The Electron app must not contain sensitive business logic. Business rules belong in the backend/domain layer.

---

## 3. Non-Negotiable Engineering Principles

Every agent working on this codebase must follow these principles:

1. Build the core before visual extras.
2. Prefer clarity over cleverness.
3. Keep business rules out of controllers and UI components.
4. Use feature/domain modules.
5. Avoid massive services.
6. Avoid duplicated logic.
7. Every mutation that changes business-critical data must be auditable.
8. Every tenant-owned record must be scoped by tenant.
9. Never trust data coming from the client.
10. Design for production from the beginning.

---

## 4. Monorepo Structure

Use a monorepo to keep the desktop app, API, and shared contracts organized.

```txt
gastroai/
  apps/
    desktop/
      src/
        main/
        preload/
        renderer/
    api/
      src/
        modules/
        common/
        config/
        database/
        jobs/
        main.ts
  packages/
    contracts/
      src/
    ui/
      src/
    config/
      src/
  docker/
  docs/
  prisma/
  scripts/
  AGENTS.md
  docker-compose.yml
  package.json
  turbo.json
```

Use Bun as the package manager unless the environment explicitly requires otherwise.

Commands must use:

```bash
bun install
bun add <package>
bun run <script>
bunx <cli>
```

Do not use npm, yarn, or pnpm unless explicitly requested.

---

## 5. Core Backend Architecture

The backend must use NestJS with a modular domain-oriented structure.

Each domain module should follow this structure:

```txt
modules/
  sales/
    application/
      commands/
      queries/
      services/
      use-cases/
    domain/
      entities/
      value-objects/
      events/
      policies/
      errors/
    infrastructure/
      repositories/
      mappers/
    presentation/
      controllers/
      dto/
    sales.module.ts
```

For small modules, avoid overengineering, but still keep clear separation:

```txt
modules/
  products/
    products.controller.ts
    products.service.ts
    products.repository.ts
    dto/
    types/
    products.module.ts
```

Controllers must only handle HTTP concerns.

Services/use cases must orchestrate business workflows.

Repositories must be the only layer that directly talks to Prisma.

---

## 6. Initial Core Modules

Build these modules first.

### 6.1 Auth Module

Responsibilities:

- Login
- Refresh token
- Logout
- Password hashing
- Session management
- Current user endpoint
- Tenant context loading

Required entities:

- User
- Session
- RefreshToken

Security rules:

- Use bcrypt or argon2 for password hashing.
- Store refresh tokens hashed.
- Never return password hashes.
- Add rate limiting to login endpoints.
- Add audit logs for login, logout, failed login, and password changes.

---

### 6.2 Tenancy Module

Responsibilities:

- Tenant creation
- Tenant settings
- Branch/sede creation
- Active branch context
- Tenant isolation

Required entities:

- Tenant
- Branch
- TenantSettings

Multi-tenant rule:

Every business record must include:

- tenantId
- branchId when branch-specific
- createdAt
- updatedAt
- createdById where applicable
- updatedById where applicable

Never allow a query to return data from another tenant.

Tenant isolation must be enforced in repositories, not only in controllers.

---

### 6.3 Users and Access Module

Responsibilities:

- User management
- Roles
- Permissions
- Invitations
- Staff account activation

Default roles:

- OWNER
- ADMIN
- CASHIER
- WAITER
- KITCHEN
- INVENTORY_MANAGER
- ACCOUNTANT

Access model:

- Start with RBAC.
- Keep permissions table-ready for future granular permissions.
- Use NestJS guards for route protection.
- Use decorators like `@CurrentUser()` and `@RequireRoles()`.

---

### 6.4 Catalog Module

Responsibilities:

- Products
- Categories
- Menus
- Modifiers
- Product availability
- Product pricing

Required entities:

- Product
- ProductCategory
- ProductModifierGroup
- ProductModifier
- PriceList

Product rules:

- Products may be sold, inventoried, or both.
- Products must support active/inactive state.
- Deleting products should be soft-delete when they have sales history.
- Price changes must be auditable.

---

### 6.5 Sales / POS Module

Responsibilities:

- Create sale
- Add items
- Apply discounts
- Apply taxes
- Register payment
- Close ticket
- Cancel ticket
- Print receipt data

Required entities:

- Sale
- SaleItem
- Payment
- Discount
- TaxBreakdown

Important rules:

- A closed sale must be immutable except through cancellation or correction flows.
- Prices used in a sale must be snapshotted.
- Product names used in a sale must be snapshotted.
- Tax values must be snapshotted.
- Payment total must equal sale total before closing.
- Cancelled sales must preserve original data.

---

### 6.6 Cash Register Module

Responsibilities:

- Open cash register
- Register cash movements
- Close cash register
- Compare expected cash vs counted cash
- Track cashier and branch

Required entities:

- CashSession
- CashMovement
- CashClosing

Movement types:

- OPENING_BALANCE
- CASH_IN
- CASH_OUT
- SALE_PAYMENT
- REFUND
- TIP
- ADJUSTMENT

Rules:

- A branch can have only one active cash session per cash register.
- A sale paid in cash must create a cash movement.
- Closing must store expected amount, counted amount, difference, notes, and responsible user.
- Cash session history must be auditable.

---

### 6.7 Inventory Module

Responsibilities:

- Inventory items
- Stock movements
- Stock adjustment
- Recipe/ingredient consumption
- Low stock alerts
- Kardex-style movement history

Required entities:

- InventoryItem
- StockMovement
- Recipe
- RecipeIngredient
- UnitOfMeasure

Movement types:

- PURCHASE
- SALE_CONSUMPTION
- ADJUSTMENT_IN
- ADJUSTMENT_OUT
- WASTE
- TRANSFER_IN
- TRANSFER_OUT
- RETURN

Rules:

- Never update stock without creating a stock movement.
- Stock on hand must be derived from movements or updated through a controlled transaction.
- Negative stock must be configurable by tenant.
- Unit conversion must be explicit.
- Inventory adjustments must require a reason.

---

### 6.8 Purchases and Suppliers Module

Responsibilities:

- Supplier management
- Purchase orders
- Purchase receiving
- Cost tracking
- Inventory entry from purchases

Required entities:

- Supplier
- PurchaseOrder
- PurchaseOrderItem
- PurchaseReceipt

Rules:

- Receiving a purchase must create stock movements.
- Product cost history must be preserved.
- Supplier invoices or support documents must be attachable in future versions.

---

### 6.9 Operations Module

Responsibilities:

- Tables
- Dine-in orders
- Kitchen order tickets
- Order status
- Table status

Required entities:

- Table
- Order
- OrderItem
- KitchenTicket

Order statuses:

- DRAFT
- SENT_TO_KITCHEN
- IN_PREPARATION
- READY
- SERVED
- CLOSED
- CANCELLED

Rules:

- Kitchen tickets must preserve item state at the time they were sent.
- Changes after sending to kitchen must be traceable.
- Cancelled items require a reason.

---

### 6.10 Reporting Module

Responsibilities:

- Daily sales report
- Product sales report
- Cash closing report
- Inventory report
- Gross margin report
- Tax report base data

Reports must be read-optimized.

Do not mix reporting queries with write-domain services when complexity grows.

---

### 6.11 Colombian Electronic Invoicing Readiness Module

This module must be designed carefully.

For the initial core, do not implement direct DIAN certification unless explicitly planned.

Create an abstraction layer that allows future integration with:

- DIAN directly
- A Colombian technology provider
- Electronic invoice API provider

Initial responsibilities:

- Store fiscal configuration
- Store customer fiscal data
- Generate invoice draft
- Track invoice lifecycle
- Store external provider references
- Store CUFE/CUDE fields when available
- Store QR and XML/PDF references when available
- Track failures and retries

Required entities:

- FiscalProfile
- Invoice
- InvoiceLine
- InvoiceTax
- InvoiceEvent
- FiscalProviderConfig

Invoice statuses:

- DRAFT
- READY_TO_SEND
- SENT
- ACCEPTED
- REJECTED
- CANCELLED
- FAILED

Rules:

- Fiscal documents must be immutable after accepted.
- Rejections must store provider/DIAN error payloads.
- Retrying must create traceable events.
- Never hardcode tax behavior globally; taxes depend on tenant configuration and Colombian tax profile.
- Keep fiscal logic isolated from POS logic through an invoicing application service.

Important caution:

This software must not claim legal DIAN compliance until validated with current Colombian regulations and/or a certified provider.

---

## 7. Data Model Rules

All database tables must use:

- id
- tenantId where applicable
- branchId where applicable
- createdAt
- updatedAt
- deletedAt for soft-deletable business records
- createdById where useful
- updatedById where useful

Use UUIDs or CUIDs consistently.

Recommended Prisma ID:

```prisma
id String @id @default(cuid())
```

Never expose sequential database IDs to users.

Prefer explicit enums for business states.

Avoid JSON fields for core business data unless the structure is truly flexible or external-provider-specific.

---

## 8. Transaction Rules

Use database transactions for workflows that update multiple business records.

Mandatory transaction flows:

- Closing a sale
- Registering payment
- Creating cash movement from sale
- Receiving purchase and updating stock
- Inventory adjustment
- Closing cash session
- Creating invoice from sale
- Cancelling sale
- Transferring inventory between branches

A transaction must leave the system in a consistent state or fail completely.

---

## 9. Event Rules

Use domain/application events for side effects.

Examples:

- SaleClosed
- PaymentRegistered
- CashSessionOpened
- CashSessionClosed
- StockAdjusted
- PurchaseReceived
- InvoiceAccepted
- InvoiceRejected
- LowStockDetected

Events can trigger:

- Audit logs
- Notifications
- Report projections
- Inventory consumption
- Invoice workflows
- Background jobs

Do not put unrelated side effects directly inside controllers.

---

## 10. API Design Rules

Use REST for the initial version.

Base path:

```txt
/api/v1
```

Endpoint naming:

```txt
/api/v1/auth/login
/api/v1/tenants
/api/v1/branches
/api/v1/products
/api/v1/sales
/api/v1/cash-sessions
/api/v1/inventory-items
/api/v1/stock-movements
/api/v1/purchases
/api/v1/reports/daily-sales
```

Rules:

- Use plural nouns.
- Use kebab-case for URLs.
- Use pagination on list endpoints.
- Use filtering and sorting where needed.
- Never return raw Prisma models directly.
- Return DTOs or response objects.
- Use consistent error format.

Standard error response:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product was not found.",
    "details": {}
  }
}
```

---

## 11. Validation Rules

Backend validation:

- Validate body, params, and query.
- Use DTOs.
- Validate business rules in services/use cases, not DTOs.
- DTO validation handles shape.
- Domain validation handles meaning.

Frontend validation:

- Every form must use React Hook Form + Zod.
- Types must be inferred from schemas.
- Never trust frontend validation as security.

Shared contracts:

- Put shared request/response types in `packages/contracts`.
- Keep contracts framework-agnostic.

---

## 12. Desktop App Architecture

Electron app structure:

```txt
apps/desktop/src/
  main/
    app.ts
    window.ts
    menu.ts
    ipc/
    updater/
  preload/
    index.ts
  renderer/
    app/
    routes/
    pages/
    components/
    features/
    services/
    hooks/
    lib/
    stores/
```

Rules:

- Use Electron security best practices.
- Disable Node integration in renderer.
- Enable context isolation.
- Expose only safe APIs through preload.
- Do not access secrets from renderer.
- Do not put database credentials in the desktop app.
- Desktop app communicates with backend API.
- Keep IPC minimal and typed.

Required Electron window settings:

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath
}
```

Desktop responsibilities:

- UI rendering
- Authentication flow
- Local user preferences
- Printing integration
- Optional local cache for non-sensitive data
- App updates in future versions

Backend responsibilities:

- Business rules
- Persistence
- Authorization
- Fiscal logic
- Audit logs
- Integrations
- Reports

---

## 13. Frontend Renderer Rules

Frontend stack:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- TanStack Router
- React Hook Form
- Zod
- Zustand only for UI/session state where needed

Project structure:

```txt
renderer/
  features/
    sales/
      components/
      hooks/
      services/
      schemas/
      types/
      pages/
    inventory/
    cash/
    products/
  components/
    layout/
    ui/
    shared/
  routes/
  lib/
  stores/
```

Rules:

- Components must not fetch data directly.
- Use TanStack Query for server state.
- Use Zustand only for client UI state.
- Every data-dependent screen must have skeleton states.
- Every mutation must show success/error feedback.
- Use optimistic updates only for non-critical flows.
- Critical flows like sales, cash closing, and invoicing must wait for server confirmation.
- Use clear empty states.
- Use keyboard-friendly POS interactions.

---

## 14. UI/UX Product Rules

The application is for fast operational use.

Design priorities:

1. Speed
2. Clarity
3. Low cognitive load
4. High contrast
5. Large touch-friendly targets where POS is involved
6. Clear status indicators
7. Strong error recovery

Important screens:

- Login
- Tenant/branch selector
- Dashboard
- POS
- Table/order view
- Kitchen screen
- Cash register opening
- Cash register closing
- Products
- Inventory
- Stock movements
- Reports
- Fiscal configuration
- Invoice status monitor

Never design mission-critical actions without confirmation:

- Cancel sale
- Delete product
- Close cash session
- Adjust stock
- Void payment
- Retry fiscal document
- Change fiscal settings

---

## 15. Audit and Traceability

Audit logs are mandatory for business-critical actions.

Audit log fields:

- id
- tenantId
- branchId
- actorUserId
- action
- entityType
- entityId
- before
- after
- metadata
- ipAddress
- userAgent
- createdAt

Audit these actions:

- Login and failed login
- User creation
- Role changes
- Product price changes
- Sale cancellation
- Payment registration
- Cash opening
- Cash closing
- Stock adjustment
- Purchase receiving
- Fiscal configuration changes
- Invoice submission
- Invoice rejection
- Invoice retry

---

## 16. Security Rules

Required:

- Hash passwords with argon2 or bcrypt.
- Use JWT access token with short expiration.
- Use refresh token rotation.
- Validate tenant access on every request.
- Add request rate limiting.
- Use Helmet.
- Enable CORS only for known origins.
- Never log secrets.
- Never expose stack traces in production.
- Use environment variables for secrets.
- Add input validation everywhere.
- Use guards for authentication and authorization.

Recommended NestJS packages:

```bash
bun add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
bun add @nestjs/throttler helmet
```

If using argon2:

```bash
bun add argon2
```

---

## 17. Observability Rules

Every production-like backend must include:

- Structured logs
- Request correlation ID
- Health endpoint
- Metrics-ready architecture
- Error tracking readiness

Recommended packages:

```bash
bun add pino nestjs-pino
bun add @nestjs/terminus
```

Health endpoints:

```txt
GET /api/v1/health
GET /api/v1/health/ready
GET /api/v1/health/live
```

Log critical events:

- Sale closed
- Cash session closed
- Invoice failed
- Stock adjustment
- Auth failure
- Background job failure

Do not log:

- Passwords
- Refresh tokens
- Full payment card data
- Sensitive customer fiscal payloads unless masked

---

## 18. Testing Rules

Testing is mandatory for the core.

Backend testing:

- Unit tests for domain services
- Integration tests for repositories/use cases
- E2E tests for critical API flows

Critical test flows:

- Login
- Tenant isolation
- Create product
- Open cash session
- Create sale
- Register payment
- Close sale
- Create stock adjustment
- Receive purchase
- Close cash session
- Create invoice draft

Recommended packages:

```bash
bun add -d jest ts-jest supertest
```

Frontend testing:

- Component tests where useful
- E2E tests for critical flows
- Use Cypress or Playwright

Do not test only happy paths. Test permissions and tenant isolation.

---

## 19. Jobs and Queues

Use BullMQ for background work.

Recommended jobs:

- Send email notification
- Generate report export
- Process invoice submission
- Retry failed fiscal document
- Detect low stock
- Generate daily summary
- Sync external provider status

Recommended packages:

```bash
bun add @nestjs/bullmq bullmq ioredis
```

Rules:

- Jobs must be idempotent when possible.
- Failed jobs must be retryable.
- Store external provider responses.
- Use dead-letter strategy for repeated failures.

---

## 20. File Export Rules

The system should support future exports:

- PDF
- Excel
- CSV

Initial exports:

- Daily sales report
- Cash closing report
- Product list
- Inventory stock report
- Stock movement history

Recommended packages:

```bash
bun add exceljs
bun add pdfmake
```

Do not generate large files synchronously in request/response flow. Use jobs for heavy exports.

---

## 21. Colombian Fiscal Context Rules

For the core, design for fiscal readiness.

Do not hardcode Colombian tax assumptions in random services.

Create dedicated fiscal configuration:

- Business legal name
- NIT
- Tax regime
- Fiscal responsibilities
- Municipality
- Address
- Invoice resolution metadata
- Prefix
- Numbering range
- Provider configuration
- Environment: test/production

Customer fiscal data:

- Document type
- Document number
- Full name or business name
- Email
- Phone
- Address
- Municipality
- Tax responsibility where applicable

Fiscal document rules:

- Keep numbering logic isolated.
- Keep provider-specific payloads isolated.
- Keep XML/PDF/QR references as attachments or external URLs.
- Track all status changes.
- Store rejection reasons.
- Make fiscal data auditable.

Important:

Before production use in Colombia, validate legal obligations with current DIAN rules and/or certified technology provider documentation.

---

## 22. Naming Conventions

General:

- Files: kebab-case
- Classes: PascalCase
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Database fields: camelCase in Prisma schema
- API routes: kebab-case
- Enums: PascalCase enum name, UPPER_SNAKE_CASE members

Examples:

```ts
export enum SaleStatus {
  DRAFT = 'DRAFT',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}
```

---

## 23. Code Style Rules

Do:

- Use explicit types for public methods.
- Keep functions small.
- Keep controllers thin.
- Keep repositories focused.
- Use dependency injection.
- Use transactions for multi-step writes.
- Use enums for fixed business states.
- Use constants for repeated values.
- Use mappers between persistence and response DTOs.

Do not:

- Put business logic in controllers.
- Return raw Prisma entities from controllers.
- Duplicate tenant filters manually in many places without helper/repository discipline.
- Use `any` unless there is a justified external payload boundary.
- Add comments that explain obvious code.
- Add fake fallbacks for impossible scenarios.
- Swallow errors silently.
- Mix fiscal provider logic directly into sales services.
- Put secrets in frontend or desktop code.

---

## 24. Recommended Backend Libraries

Core:

```bash
bun add @nestjs/config
bun add @nestjs/swagger swagger-ui-express
bun add @prisma/client
bun add zod
bun add dayjs
```

Database:

```bash
bun add -d prisma
```

Auth/security:

```bash
bun add @nestjs/jwt @nestjs/passport passport passport-jwt
bun add bcrypt
bun add helmet
bun add @nestjs/throttler
```

Redis/jobs:

```bash
bun add @nestjs/bullmq bullmq ioredis
```

Logging/health:

```bash
bun add pino nestjs-pino
bun add @nestjs/terminus
```

Utilities:

```bash
bun add decimal.js
bun add nanoid
bun add exceljs
```

Use `decimal.js` or integer minor units for money. Never use floating point for money.

---

## 25. Money and Decimal Rules

Money must be handled safely.

Preferred approach:

- Store money in integer minor units when possible.
- Example: COP as pesos without decimals.
- For tax calculations or currencies with decimals, use Decimal.

Rules:

- Never use JavaScript floating point for totals.
- Always calculate totals server-side.
- Client can display estimates, but backend is source of truth.
- Store sale subtotal, tax total, discount total, and grand total.
- Store payment total separately.
- Validate total consistency before closing sale.

---

## 26. MVP Build Order

Build the core in this order:

### Phase 1 — Foundation

- Monorepo setup
- Docker Compose
- PostgreSQL
- Redis
- NestJS API
- Prisma setup
- Electron + React shell
- Shared contracts package
- Environment configuration

### Phase 2 — Identity and Access

- Auth
- Users
- Roles
- Tenant
- Branch
- Current user/session
- Route guards

### Phase 3 — Business Setup

- Products
- Categories
- Basic price management
- Inventory items
- Units of measure
- Suppliers

### Phase 4 — Operation Core

- Open cash session
- POS sale draft
- Add/remove sale items
- Register payment
- Close sale
- Create cash movements
- Basic receipt data

### Phase 5 — Inventory Core

- Stock movements
- Stock adjustment
- Purchase receiving
- Low stock alerts
- Basic inventory report

### Phase 6 — Reporting Core

- Daily sales
- Cash closing
- Top products
- Basic gross margin
- Inventory valuation base

### Phase 7 — Fiscal Readiness

- Fiscal profile
- Invoice draft
- Invoice status tracking
- Fiscal provider abstraction
- Error/retry model

Do not start advanced AI features before the operational core is stable.

---

## 27. Definition of Done

A feature is done only when:

- Backend endpoint exists.
- DTO validation exists.
- Service/use case contains business logic.
- Repository handles persistence.
- Tenant isolation is enforced.
- Authorization is enforced.
- Audit logging exists if business-critical.
- Tests exist for important behavior.
- Swagger docs are updated.
- Frontend screen exists if part of UI.
- Loading, empty, success, and error states exist.
- The feature works in Docker-based local environment.
- README or docs are updated if setup changed.

---

## 28. Agent Workflow

When an AI agent receives a task, it must:

1. Read this AGENTS.md.
2. Identify the affected module.
3. Check existing patterns before adding new ones.
4. Propose the implementation plan briefly.
5. Implement the smallest complete vertical slice.
6. Add or update tests.
7. Update exports/barrels where applicable.
8. Run formatting, linting, tests, and build if available.
9. Report changed files and commands run.
10. Mention any missing environment variables or manual setup.

Agents must not create unrelated features.

Agents must not perform broad refactors unless requested.

Agents must not change architecture rules without explicit approval.

---

## 29. First Vertical Slice to Build

The first complete vertical slice should be:

> Login + tenant/branch context + product category CRUD + product CRUD.

This validates:

- Auth
- Authorization
- Tenant isolation
- Database setup
- API structure
- Frontend routing
- Forms
- Tables
- TanStack Query
- Desktop shell
- Basic UI consistency

After this, build:

> Open cash session + create sale + register payment + close sale.

That is the real operational heart of GastroAI.

---

## 30. Final Reminder

GastroAI must be built like a real business system.

The goal is not only to make screens.

The goal is to create a reliable operational core that can support restaurants, cashiers, administrators, accountants, and owners with trustworthy data.
