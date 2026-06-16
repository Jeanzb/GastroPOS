# GastroAI

**Inteligencia operativa para restaurantes.** SaaS multi-tenant de escritorio
para controlar ventas (POS), inventario, caja, compras, empleados y reportes
desde un solo lugar.

> Las reglas de arquitectura e ingeniería del proyecto viven en [`AGENTS.md`](AGENTS.md).

## Stack

| Capa            | Tecnología                                            |
| --------------- | ----------------------------------------------------- |
| Escritorio      | Electron + React 19 + TypeScript + Vite               |
| UI              | Tailwind CSS v4 (shadcn/ui en la fase de UI)          |
| Backend         | NestJS 11 + TypeScript                                |
| Base de datos   | PostgreSQL 16 + Prisma 6                              |
| Cache / colas   | Redis 7 + BullMQ (en fases posteriores)               |
| Auth            | JWT + refresh tokens + RBAC (en fases posteriores)    |
| Docs API        | Swagger / OpenAPI                                     |
| Monorepo        | Bun workspaces + Turbo                                |

## Estructura

```txt
gastroai/
  apps/
    api/        # NestJS API (/api/v1)
    desktop/    # Electron + React shell
  packages/
    contracts/  # Tipos compartidos front/back (framework-agnostic)
  prisma/       # Esquema y migraciones (fuente única del modelo de datos)
  docker-compose.yml
```

## Requisitos

- [Bun](https://bun.sh) ≥ 1.3
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL + Redis)
- Node.js ≥ 20 (para ejecutar el build de Electron)

## Puesta en marcha

```bash
# 1. Instalar dependencias (genera el cliente Prisma en postinstall)
bun install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL y Redis
bun run infra:up

# 4. Aplicar las migraciones de la base de datos
bun run db:migrate

# 5. Arrancar la API  (http://localhost:3000/api/v1)
bun run --cwd apps/api dev

# 6. En otra terminal, arrancar la app de escritorio
bun run --cwd apps/desktop dev
```

- Documentación de la API (Swagger): http://localhost:3000/api/v1/docs
- Health check: http://localhost:3000/api/v1/health/ready

## Scripts útiles (raíz)

| Script                      | Acción                                      |
| --------------------------- | ------------------------------------------- |
| `bun run infra:up` / `:down`| Levanta / detiene Postgres + Redis          |
| `bun run db:migrate`        | Crea y aplica migraciones (dev)             |
| `bun run db:studio`         | Abre Prisma Studio                          |
| `bun run typecheck`         | Typecheck de todo el monorepo               |
| `bun run format`            | Formatea con Prettier                       |

## Estado del proyecto

- [x] **Fase 1 — Foundation:** monorepo, Docker (Postgres + Redis), API NestJS
      con health + Swagger, Prisma con base multi-tenant, contratos compartidos,
      shell de Electron.
- [ ] **Fase 2 — Identidad y acceso:** auth (JWT + refresh), usuarios, roles,
      tenant/sede, guards.
- [ ] **Fase 3 — Configuración del negocio:** productos, categorías, inventario.
- [ ] **Fase 4 — Núcleo operativo:** caja, POS, ventas y pagos.

El orden completo de construcción está en [`AGENTS.md`](AGENTS.md) (§26).
