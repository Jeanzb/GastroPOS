# Auditoria responsive QA - GastroIA

Este documento define la auditoria obligatoria para migrar GastroIA a una experiencia responsive sin romper operacion, seguridad ni aislamiento de datos.

## Matriz de clasificacion

Cada componente o pantalla debe clasificarse en una categoria principal:

| Categoria | Ejemplos | Riesgo QA |
| --- | --- | --- |
| Layout estructural | shell, sidebar, topbar, contenedores | Alto |
| Navegacion | menus, tabs, dropdowns, selector de sede | Alto |
| Datos | tablas, listas, cards, filtros, paginacion | Alto |
| Formularios | inputs, selects, dialogs, validaciones | Alto |
| Operacion critica | POS, mesas, caja, cobro, inventario | Critico |
| Visualizacion | dashboards, reportes, graficos, KPIs | Medio |
| Feedback | toasts, alerts, skeletons, empty states | Medio |
| Platform/SaaS | superadmin, tenants, features, health | Alto |

## Estados de auditoria

| Estado | Significado |
| --- | --- |
| Aprobado | Cumple desktop, tablet, mobile y pruebas automatizadas |
| Ajuste menor | Requiere cambios de clases/layout sin alterar estructura |
| Refactor | Necesita primitiva responsive o cambio de composicion |
| Reemplazo | El patron actual no es apto para mobile/touch |

## Checklist por componente

- Funciona desde 360px de ancho.
- No genera overflow horizontal global.
- No depende de hover, tooltip o clic derecho para acciones criticas.
- Sus acciones son accesibles por touch.
- Los targets tactiles criticos miden al menos 44x44 px.
- Mantiene jerarquia visual clara en pantallas pequenas.
- Tiene loading, empty, error y success state cuando depende de datos.
- Usa shadcn/ui o una primitiva interna compatible.
- No duplica logica entre desktop y mobile.
- Tiene prueba automatizada o queda registrado como deuda QA.

## Viewports oficiales

| Nombre | Tamano |
| --- | --- |
| mobile-sm | 360x740 |
| mobile | 390x844 |
| mobile-lg | 430x932 |
| tablet | 768x1024 |
| tablet-lg | 834x1194 |
| desktop | 1366x768 |
| desktop-lg | 1440x900 |
| wide | 1920x1080 |

## Flujo de aprobacion

1. Auditar componente/pantalla y registrar categoria, estado y riesgo.
2. Si requiere refactor, mover la solucion a una primitiva compartida.
3. Validar con Cypress en la matriz de viewports cuando sea flujo critico.
4. Validar regresion visual para pantallas principales.
5. Confirmar que no se rompen permisos, tenant isolation ni branch scope.

## Criterio de release

El release responsive no queda aprobado hasta que POS, mesas, caja, inventario, compras, reportes y platform superadmin pasen pruebas en mobile, tablet y desktop con datos reales.
