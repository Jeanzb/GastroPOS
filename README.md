# GastroIA

**Inteligencia operativa para restaurantes.** SaaS multi-tenant de escritorio
para controlar el catálogo, ventas (POS), inventario, caja, compras y reportes
desde un solo lugar, con datos confiables y aislamiento estricto por restaurante.

## Stack

| Capa          | Tecnología                                          |
| ------------- | --------------------------------------------------- |
| Escritorio    | Electron + React 19 + TypeScript + Vite             |
| UI            | Tailwind CSS v4 + shadcn/ui + TanStack Router/Query |
| Formularios   | React Hook Form + Zod                               |
| Backend       | NestJS 11 + TypeScript                              |
| Base de datos | PostgreSQL 16 + Prisma 6                            |
| Auth          | JWT + refresh tokens (rotación) + RBAC              |
| Docs API      | Swagger / OpenAPI                                   |
| Monorepo      | Bun workspaces + Turbo                              |

## Estructura

```txt
gastroia/
  apps/
    api/        # NestJS API (/api/v1)
    desktop/    # Electron + React (login, catálogo, fiscal)
  packages/
    contracts/  # Tipos compartidos front/back (framework-agnostic)
  prisma/       # Esquema y migraciones (fuente única del modelo de datos)
  docker-compose.yml
```

## Requisitos

- [Bun](https://bun.sh) ≥ 1.3
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL + Redis)
- Node.js ≥ 20 (para el build de Electron)

## Puesta en marcha

```bash
bun install                       # instala deps y genera el cliente Prisma
cp .env.example .env              # configura variables de entorno
bun run infra:up                  # levanta PostgreSQL + Redis (Docker)
bun run db:migrate                # aplica las migraciones
bun run db:seed                   # crea el tenant/sede/owner demo

bun run --cwd apps/api dev        # API en http://localhost:3000/api/v1
bun run --cwd apps/desktop dev    # app de escritorio (Electron)
```

Credenciales del seed para iniciar sesión:

| Campo       | Valor                  |
| ----------- | ---------------------- |
| Restaurante | `gastroai-demo`        |
| Correo      | `owner@gastroai.local` |
| Contraseña  | `ChangeMe123!`         |

- Swagger: http://localhost:3000/api/v1/docs
- Readiness: http://localhost:3000/api/v1/health/ready

## Scripts útiles (raíz)

| Script                       | Acción                              |
| ---------------------------- | ----------------------------------- |
| `bun run infra:up` / `:down` | Levanta / detiene Postgres + Redis  |
| `bun run db:migrate`         | Crea y aplica migraciones (dev)     |
| `bun run db:seed`            | Siembra datos demo idempotentes     |
| `bun run db:studio`          | Abre Prisma Studio                  |
| `bun run typecheck`          | Typecheck de todo el monorepo       |
| `bun run test`               | Tests (API)                         |

## Seguridad y multi-tenant

- Aislamiento por tenant forzado en el acceso a datos: un contexto por request
  (AsyncLocalStorage) más una extensión de Prisma que inyecta `tenantId` en los
  modelos del catálogo y **falla cerrado** si no hay contexto (nunca filtra
  datos entre restaurantes).
- Login con rate limiting, hashing de contraseñas (bcrypt) y mitigación de
  enumeración de usuarios; refresh tokens hasheados con rotación y detección de
  reuso (revoca la sesión ante un posible robo).
- Toda acción crítica deja registro de auditoría.

## Estado

- [x] Foundation: monorepo, Docker, API NestJS + Swagger, Prisma multi-tenant.
- [x] Identidad y acceso: auth (JWT + refresh), RBAC, sesiones, guards.
- [x] Catálogo: productos y categorías (CRUD, backend + UI).
- [x] Aislamiento de tenant cross-cutting + endurecimiento de seguridad.
- [~] Preparación fiscal Colombia (perfil + proveedor DIAN como capa de
  abstracción). **No es certificación legal DIAN**: para producción hay que
  integrar un proveedor/certificados reales y validar contra la documentación
  oficial de la DIAN (Anexo Técnico FE vigente).
- [ ] Núcleo operativo: caja, POS, ventas y pagos.
- [ ] Inventario y reportes.
