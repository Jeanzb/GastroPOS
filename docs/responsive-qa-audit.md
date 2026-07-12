# Auditoria estatica UX/UI - movimiento, performance, responsive e impresion

Fecha: 2026-07-04

Alcance: revision estatica de codigo y verificacion puntual de patrones criticos. No se monto Cypress, no se agrego infraestructura de testing automatizado y no se declara aprobacion visual completa de todos los viewports.

Viewports objetivo para verificacion manual posterior:

| Breakpoint | Tamano |
| --- | --- |
| Mobile pequeno | 375 px |
| Mobile grande | 430 px |
| Tablet | 768 px |
| Desktop base | 1366 px |

## Veredicto

La aplicacion ya tiene una base responsive y de movimiento mejor que una UI estatica: existen tokens de motion en `index.css`, utilidades de safe area, botones con feedback de presion, toasts animados, POS movil con sheet de comanda y varias pantallas basadas en shadcn/ui.

Antes de esta revision, el documento de auditoria era una lista de intenciones, no un reporte de hallazgos. Tambien habia duraciones hardcodeadas en primitives y componentes compartidos, y el formulario de compras tenia una grilla fija que podia romper en mobile.

## Hallazgos

| ID | Severidad | Tipo | Pantalla / accion | Ubicacion | Evidencia | Recomendacion / estado |
| --- | --- | --- | --- | --- | --- | --- |
| UX-001 | Alta | Proceso QA | Auditoria responsive | `docs/responsive-qa-audit.md` | El documento anterior describia checklist y Cypress, pero no registraba hallazgos reales ni respetaba el alcance de auditoria estatica solicitado. | Corregido: este archivo ahora es reporte de auditoria estatica con hallazgos accionables. |
| UX-002 | Media | Timing/easing | Sheets, dialogs, alert dialogs | `apps/desktop/src/renderer/src/components/ui/sheet.tsx`, `dialog.tsx`, `alert-dialog.tsx` | Habia `duration-300`, `duration-500` y `duration-200` dispersos en primitives base. | Corregido: ahora usan `--motion-duration-enter`, `--motion-duration-exit`, `--motion-duration-medium` y `--motion-enter`. |
| UX-003 | Media | Timing/easing | Platform, POS y toasts | `apps/desktop/src/renderer/src/assets/index.css` | Habia `180ms`, `220ms`, `340ms`, `420ms` y `0.3s ease-out` codificados a mano. | Corregido en patrones principales: se reemplazaron por tokens de motion. Mantener futuras animaciones en la misma escala. |
| UX-004 | Media | Microinteraccion | Selector de rol y tabs de mesas | `apps/desktop/src/renderer/src/components/layout/Topbar.tsx`, `apps/desktop/src/renderer/src/components/tables/TablesWorkspace.tsx` | El indicador animado usaba `360ms` directo aunque ya existia `--motion-duration-pop`. | Corregido: usa el token pop compartido. |
| UX-005 | Alta | Responsive/layout | Compras, lineas de insumos | `apps/desktop/src/renderer/src/components/purchases/PurchaseFormDialog.tsx` | La grilla `grid-cols-[1fr_72px_120px_110px_36px]` era fija para todos los tamanos. En mobile podia producir campos comprimidos o scroll horizontal dentro del dialog. | Corregido: el header se oculta en mobile, cada linea se apila con labels locales y desde `md` vuelve a tabla. |
| UX-006 | Media | Performance | Listas largas de productos, inventario, compras, empleados y tenants | `apps/desktop/src/renderer/src/components/**/*Table*.tsx`, `apps/desktop/src/renderer/src/components/pos/**/*.tsx` | La mayoria renderiza listas completas del estado recibido. Es aceptable con paginacion real, pero puede degradarse con 100+ filas o grids grandes. | Pendiente: mantener page size pequeno, virtualizar si se permiten listados grandes y memoizar filas de POS si se detecta re-render pesado. |
| UX-007 | Media | Color/tema | Componentes operativos y platform | `apps/desktop/src/renderer/src/assets/index.css`, varios `*.tsx` con clases arbitrarias | Hay colores directos (`#F2ECE3`, `#6B6359`, colores de toast) mezclados con tokens. | Pendiente: migrar colores recurrentes a tokens semanticos. No bloquear release, pero limita consistencia futura. |
| UX-008 | Media | Tipografia | Tablas, badges y headers compactos | Multiples `*.tsx` con `text-[11px]`, `text-[13px]`, `tracking-[0.08em]` | La escala tipografica operativa se repite de forma manual. | Pendiente: crear utilities semanticas o componentes de tabla/badge compartidos para evitar drift. |
| UX-009 | Media | Impresion | Recibo/comanda | `apps/desktop/src/renderer/src/components/print/PrintTicket.tsx`, `apps/desktop/src/renderer/src/assets/index.css`, `apps/desktop/src/renderer/src/components/dining/AccountDialogs.tsx` | Existe contenedor imprimible y estilo 80mm, pero no hay validacion real de 58mm ni QR/CUFE real. | Pendiente: soportar rollos 58/80mm como configuracion de sede e integrar QR/CUFE cuando DIAN/proveedor este listo. |
| UX-010 | Baja | Movimiento | Dashboard, barras por hora | `apps/desktop/src/renderer/src/components/dashboard/HourlySalesChart.tsx` | Las barras animaban con `duration-300` directo. | Corregido: usa token `--motion-duration-enter`. |

## Escala unica aprobada

Usar estos tokens como contrato visual:

| Token | Uso | Valor |
| --- | --- | --- |
| `--motion-duration-fast` | tap, hover, presion, cambio pequeno de color | `120ms` |
| `--motion-duration-medium` | cambios de estado, fades, feedback no critico | `200ms` |
| `--motion-duration-enter` | entrada de paneles, dialogs, charts | `320ms` |
| `--motion-duration-exit` | cierre de paneles y overlays | `240ms` |
| `--motion-duration-pop` | badges, cantidades, totales y confirmaciones pequenas | `380ms` |
| `--motion-snappy` | hover/tap, transiciones frecuentes | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--motion-enter` | aparicion estructural suave | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--motion-exit` | salida estructural rapida | `cubic-bezier(0.4, 0, 1, 1)` |
| `--motion-pop` | rebote controlado de elementos pequenos | `cubic-bezier(0.34, 1.5, 0.5, 1)` |

Reglas:

- No usar duraciones hardcodeadas en nuevos componentes.
- Reservar `--motion-pop` para badges, cantidades, totales y feedback alegre.
- Usar `--motion-enter` / `--motion-exit` para sheets, dialogs y overlays.
- Respetar `motion-reduce` y `prefers-reduced-motion`.

## Checklist responsive de aceptacion

Un componente se considera responsive solo si:

- Opera desde 375 px sin overflow horizontal global.
- Sus acciones tactiles criticas miden al menos 44 x 44 px.
- No depende de hover para acciones criticas.
- Tiene estados loading, empty, error y success cuando depende de datos.
- Usa shadcn/ui o una primitiva interna compatible.
- Mantiene una sola logica de datos para desktop y mobile.
- No corta dialogs/sheets con teclado virtual o alturas pequenas.
- Tiene navegacion clara hacia atras/cerrar en mobile.

## Backlog recomendado

1. Ejecutar capturas manuales en 375, 430, 768 y 1366 px para POS, mesas, compras, inventario, caja y platform.
2. Crear una primitiva `ResponsiveDataView` que use tabla en desktop y cards/lista en mobile sin duplicar logica.
3. Normalizar colores directos a tokens semanticos en la siguiente pasada visual.
4. Revisar listas largas con React Profiler antes de activar catalogos grandes en produccion.
5. Parametrizar impresion por sede: 58mm, 80mm, logo, NIT, datos fiscales y copias.
