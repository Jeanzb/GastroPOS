# Factus V2: guia de verificacion local

Esta guia comprueba la comunicacion entre renderer, API, PostgreSQL, Redis y la
frontera Factus V2. No reemplaza la validacion tributaria con contador ni una
certificacion en sandbox con credenciales reales.

## Alcance implementado

- SuperAdmin administra tenants, features, salud y telemetria sanitizada. No opera
  clientes, rangos ni documentos fiscales.
- Cada tenant guarda su conexion Factus cifrada con AES-256-GCM y selecciona el
  rango fiscal por sede.
- OAuth, refresh, rate limit, circuit breaker y tokens permanecen en backend. La
  copia de tokens en Redis tambien se cifra.
- POS genera una factura para consumidor final o cliente identificado, congela
  adquiriente, productos, impuestos, pagos y totales, y usa un reference code
  idempotente.
- El outbox recupera trabajos que no llegaron a Redis. Conflictos funcionales y
  errores no reintentables pasan a revision manual; temporales usan Retry-After o
  backoff con jitter.
- Facturas aceptadas son inmutables. Las correcciones se realizan con nota credito.

## Preparacion

1. Instalar dependencias: `bun install`.
2. Iniciar infraestructura: `bun run infra:up`.
3. Aplicar migraciones: `bun run db:migrate:deploy`.
4. Cargar datos locales: `bun run db:seed`.
5. Confirmar en `.env`:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`
   - `FACTUS_CREDENTIALS_ENCRYPTION_KEY` con 32 bytes en base64url, base64 o hex
   - `FISCAL_QUEUE_ENABLED=true`

Nunca incluir `.env`, credenciales Factus ni tokens en Git.

## Arranque

Terminal 1:

```powershell
cd apps/api
bun run dev
```

Terminal 2:

```powershell
cd apps/desktop
bun run dev
```

Servicios esperados:

- Renderer: `http://localhost:5173/`
- API: `http://localhost:3000/api/v1`
- Swagger local: `http://localhost:3000/api/v1/docs`
- Health: `http://localhost:3000/api/v1/health/ready`

## Verificacion automatizada

```powershell
bun run db:generate
bunx prisma validate --schema=prisma/schema.prisma
bun run typecheck
bun run test
bun run build
```

Con API y renderer activos:

```powershell
cd apps/desktop
node node_modules/cypress/bin/cypress run --e2e --browser electron --spec cypress/e2e/fiscal-workspace.cy.ts
node node_modules/cypress/bin/cypress run --e2e --browser electron --spec cypress/e2e/saas-platform.cy.ts
node node_modules/cypress/bin/cypress run --e2e --browser electron --spec cypress/e2e/branch-isolation.cy.ts
```

Los tres specs deben terminar con `All specs passed`.

## Checklist UI y API

### Plataforma SaaS

- [ ] Ingresar a `#/platform/login` con el usuario platform del seed.
- [ ] Crear un tenant y editar sus datos basicos.
- [ ] Suspenderlo y confirmar que su API operativa responde `403`.
- [ ] Reactivarlo y habilitar/deshabilitar features.
- [ ] Confirmar que no hay formularios de NIT, rangos, clientes ni documentos.
- [ ] Abrir Integraciones y verificar solo salud, latencia, volumen y errores
      sanitizados.

### Tenant fiscal

- [ ] Ingresar con `owner@gastroai.local` y seleccionar la sede `MAIN`.
- [ ] Abrir Facturacion y confirmar que cada request incluye
      `X-GastroIA-Branch-Id`.
- [ ] Configurar perfil tributario y sede. La emision debe permanecer bloqueada sin
      rango de factura activo.
- [ ] Abrir Conexion Factus. La respuesta nunca debe mostrar secret, password,
      access token ni refresh token.
- [ ] Intentar una URL distinta del host oficial del ambiente y confirmar `400`.

### Clientes

- [ ] Crear NIT `901234567` con DV `7` y municipio DIVIPOLA `11001`.
- [ ] Confirmar que la API devuelve `documentNumber=901234567` y `dv=7` separados.
- [ ] Cambiar el DV y confirmar que frontend y backend bloquean el guardado.
- [ ] Para `CO`, confirmar que DIVIPOLA es obligatorio; para otro pais se omite.
- [ ] Confirmar correo y direccion obligatorios para el registro fiscal.

### POS

- [ ] Cobrar una venta como Consumidor final. No debe pedir cliente ni crear una
      segunda factura al repetir la accion.
- [ ] Cobrar con Cliente identificado y validar documento, contacto y municipio.
- [ ] Probar descuento, propina, pago mixto y credito con fecha de vencimiento.
- [ ] Confirmar que el total POS coincide con base, impuestos, ajustes y pagos.
- [ ] Confirmar que precio, nombre, impuesto y adquiriente quedan congelados en la
      factura aunque luego cambie el maestro.
- [ ] Ver estados pendiente, aceptado, rechazado y fallido sin mostrar aceptacion
      antes de la confirmacion Factus.
- [ ] Sobre una factura aceptada, corregir solo mediante nota credito.

## Prueba Factus sandbox pendiente de credenciales

Para validar el proveedor externo se requieren credenciales sandbox propias del
tenant y un rango DIAN de pruebas. Ejecutar, en orden:

1. Guardar credenciales usando el host fijo `https://api-sandbox.factus.com.co`.
2. Verificar conexion y OAuth password grant.
3. Consultar rangos DIAN y asignar uno a la sede.
4. Emitir consumidor final, cliente NIT, descuento, propina, pago mixto y credito.
5. Capturar fixtures anonimizados de `201`, `401`, `404`, `409`, `422`, `429` y
   `5xx`.
6. Verificar CUFE, numero, PDF, XML y AttachedDocument.
7. Emitir una nota credito en sandbox y verificar sus artefactos.

Sin estos pasos no se debe afirmar que la conexion externa o el cumplimiento DIAN
estan certificados. Las reglas fiscales pueden cambiar y deben revisarse con un
contador o asesor tributario colombiano antes de produccion.

## Evidencia de este pase

Validado localmente el 12 de julio de 2026:

- PostgreSQL y Redis saludables.
- 32 migraciones aplicadas, esquema al dia.
- API `health`, `live` y `ready`: `ok`.
- Renderer HTTP: `200`.
- Build y typecheck de API, contratos y desktop: correctos.
- Tests backend: correctos.
- Cypress fiscal, plataforma e aislamiento: 3 de 3 correctos.
- Smoke API NIT/DV y allowlist de host Factus: correctos.
