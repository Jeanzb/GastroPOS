# Facturacion DIAN: Limites de Plataforma y Tenant

## Decision de arquitectura

La facturacion electronica es una capacidad del restaurante, no una operacion del panel SuperAdmin. La plataforma administra disponibilidad, acceso al modulo y telemetria tecnica; cada tenant opera sus propios datos tributarios y documentos dentro de su sesion y sede activa.

Las credenciales, tokens, endpoints y detalles del proveedor son administrados exclusivamente por el backend. La aplicacion del restaurante muestra `Facturacion DIAN`, nunca el nombre del proveedor ni secretos tecnicos.

## SuperAdmin: alcance permitido

- Crear un tenant y su usuario owner inicial.
- Editar informacion basica de plataforma del tenant, actualmente el nombre comercial.
- Crear sedes iniciales y adicionales.
- Activar, suspender, archivar y consultar el estado general del tenant.
- Asignar plan y habilitar o deshabilitar el feature flag `dian.enabled`.
- Consultar salud global de API, PostgreSQL, Redis y facturacion electronica.
- Consultar metricas globales y logs tecnicos sanitizados de la integracion.

Los logs de plataforma no tienen `tenantId`, cliente, venta, factura, payload, XML, CUFE/CUDE ni credenciales. Solo incluyen proveedor, operacion tecnica, estado, HTTP, codigo sanitizado, latencia y fecha.

## SuperAdmin: operaciones prohibidas

- Crear, consultar, reintentar o descargar documentos fiscales de un restaurante.
- Crear notas credito o notas debito.
- Gestionar clientes finales, ventas POS, pagos o cierres de caja.
- Configurar perfil tributario, resolucion, prefijos o rangos DIAN de un tenant.
- Probar, editar o exponer credenciales, OAuth, endpoints o configuracion funcional del proveedor.

No debe existir ningun endpoint con el patron `/platform/tenants/:tenantId/fiscal/*`.

## Tenant: alcance funcional

Con rol `OWNER`, `ADMIN` o `ACCOUNTANT`, y con `dian.enabled` activo, el restaurante puede:

- Configurar razon social, NIT, responsabilidades, direccion, resolucion y rangos autorizados.
- Consultar y asignar rango de factura y rango de nota credito.
- Consultar el monitor fiscal de su sede activa.
- Abrir el detalle de un documento, su trazabilidad, CUFE/CUDE y disponibilidad de PDF/XML.
- Solicitar reintento y descarga de evidencias cuando el estado lo permita.
- Crear una nota credito desde un documento aceptado, sin editar la factura original.

Las rutas funcionales viven bajo `/api/v1/fiscal/*` y usan JWT de tenant. Ninguna acepta un `tenantId` enviado por el frontend.

## Aislamiento obligatorio

| Operacion            | Filtro requerido                               |
| -------------------- | ---------------------------------------------- |
| Listar documentos    | `tenantId + branchId`                          |
| Ver detalle          | `tenantId + branchId + documentId`             |
| Reintentar           | `tenantId + branchId + documentId`             |
| Descargar evidencias | `tenantId + branchId + documentId`             |
| Crear nota credito   | `tenantId + branchId + documentId`             |
| Ejecutar job fiscal  | `tenantId + branchId + invoiceId/creditNoteId` |

El backend toma la sede de `X-GastroIA-Branch-Id`, validada por `JwtAuthGuard`; no confia en un valor de sede del body. Si no existe sede activa, rechaza la operacion fiscal antes de consultar persistencia.

## Tickets implementados

### PLAT-01: Retirar la operacion fiscal de SuperAdmin

**Contexto:** la plataforma no debe actuar como el restaurante.

**Descripcion:** se eliminaron las rutas y servicios `platform/tenants/:id/fiscal/*`.

**Criterios de aceptacion:**

- No existe una ruta platform para emitir, consultar, reintentar o descargar documentos fiscales.
- SuperAdmin no puede crear notas credito ni administrar clientes, ventas o caja del tenant.
- Una busqueda de rutas no encuentra el patron `/platform/tenants/:tenantId/fiscal/*`.

**Estado:** Hecho.

### PLAT-02: Limitar el detalle del tenant a informacion de SaaS

**Contexto:** soporte necesita administrar ciclo de vida, no obligaciones tributarias del restaurante.

**Descripcion:** el detalle global contiene sedes, usuarios, plan, modulos, estado y edicion del nombre comercial.

**Criterios de aceptacion:**

- No hay pestaña ni formulario de perfil DIAN, NIT, resolucion, rangos o documentos.
- Crear sede, suspender/reactivar y editar nombre siguen disponibles para roles platform autorizados.
- La pestaña `Plan y modulos` no permite operar ventas ni fiscalizacion funcional.

**Estado:** Hecho.

### PLAT-03: Health y telemetria tecnica global

**Contexto:** SuperAdmin debe detectar indisponibilidad sin leer datos comerciales de un restaurante.

**Descripcion:** se agregaron salud de facturacion electronica, resumen global y logs sanitizados.

**Criterios de aceptacion:**

- `GET /platform/health`, `/platform/integrations/summary` y `/platform/integrations/logs` requieren JWT platform.
- El log no persiste `tenantId`, documento, cliente, venta, payload, XML, CUFE/CUDE ni secretos.
- La interfaz deja explicito que solo muestra disponibilidad y diagnostico tecnico.

**Estado:** Hecho.

### PLAT-04: Estado del modulo fiscal por tenant

**Contexto:** la plataforma debe saber si el tenant tiene acceso a facturacion sin abrir sus documentos.

**Descripcion:** el detalle del tenant muestra el estado efectivo de `dian.enabled` y todos los modulos distinguen habilitado de deshabilitado.

**Criterios de aceptacion:**

- `Facturacion electronica DIAN: habilitada/deshabilitada` es visible en el detalle global.
- Un feature deshabilitado no se pinta como incluido ni activo.
- El estado procede de plan + override, no de datos fiscales del restaurante.

**Estado:** Hecho.

### PLAT-05: Conexion fiscal estrictamente global

**Contexto:** una sede o tenant no debe almacenar ni administrar OAuth, endpoint o credenciales del proveedor.

**Descripcion:** Factus se resuelve solo desde variables `FACTUS_*` del backend; se retiraron `FiscalProviderConfig` y su relacion por tenant.

**Criterios de aceptacion:**

- El perfil fiscal no contiene endpoint, provider, token, secreto ni configuracion de conexion.
- El adaptador Factus no recibe un provider o tenant como argumento.
- La migracion `20260709200000_global_platform_fiscal_connection` elimina la tabla de configuracion por tenant.

**Estado:** Hecho.

### TEN-01: Perfil DIAN del restaurante

**Contexto:** el tenant conserva la responsabilidad de sus datos legales y resoluciones.

**Descripcion:** `OWNER`, `ADMIN` y `ACCOUNTANT` administran razon social, NIT, responsabilidades, direccion y rangos desde `FiscalWorkspace`.

**Criterios de aceptacion:**

- El formulario no muestra Factus, OAuth, endpoint ni credenciales.
- Solo los roles fiscales autorizados acceden a `/api/v1/fiscal/profile`.
- El backend valida campos y conserva auditoria de cambios.

**Estado:** Hecho.

### TEN-02: Monitor fiscal y correcciones del tenant

**Contexto:** los documentos existen para la operacion fiscal del restaurante, no para soporte SaaS.

**Descripcion:** se implementaron rangos, monitor, detalle, evidencias, reintento y nota credito en rutas `/api/v1/fiscal/*`.

**Criterios de aceptacion:**

- Una factura aceptada es inmutable y las correcciones usan nota credito.
- El detalle conserva trazabilidad, respuestas fiscales y evidencias sin revelar secretos.
- La UI usa tabla en desktop y tarjetas en movil sin duplicar la logica de datos.

**Estado:** Hecho.

### ISO-01: Aislamiento tenant y sede

**Contexto:** una factura, evidencia o nota credito no puede cruzar restaurantes ni sedes.

**Descripcion:** consultas, mutaciones y jobs fiscales propagan `tenantId + branchId` y el backend toma la sede activa del JWT/header validado.

**Criterios de aceptacion:**

- Listado, detalle, retry, descarga y nota credito filtran por `tenantId + branchId`.
- Sin sede activa la operacion falla antes de acceder a persistencia.
- Los jobs llevan tenant, sede y documento/nota en su payload idempotente.

**Estado:** Hecho.

### ISO-02: Pruebas de fronteras fiscales

**Contexto:** el aislamiento debe ser verificable, no solo una convencion de codigo.

**Descripcion:** se cubrieron workflow de documento, nota credito, health global y mapeos Factus con pruebas unitarias e integracion local.

**Criterios de aceptacion:**

- Las pruebas comprueban que detalle, descarga y nota credito usan tenant y sede activa.
- El health global llama al adaptador sin configuracion tenant.
- Las comprobaciones visuales desktop y movil validan ausencia de Factus en la UI de restaurante y ausencia de operaciones fiscales en SuperAdmin.

**Estado:** Hecho.

## Pendiente de validacion de negocio

- Verificar credenciales, rangos y casos reales en sandbox antes de activar produccion.
- Confirmar con contador y asesor tributario el uso de IVA/INC, propinas y conceptos de correccion para cada tenant.
- Aplicar migraciones de base de datos y configurar alertas operativas antes de go-live.

Esta documentacion describe una implementacion tecnica; no sustituye validacion legal, contable ni tributaria vigente.
