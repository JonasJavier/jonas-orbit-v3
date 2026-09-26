<!-- portfolio-content/omsta-2026/web/modules.md -->

# OMSTA web — mapa completo de módulos

- **Fecha:** 2026-09-25
- **Commit analizado:** `3f5cea73` (rama `main`, árbol limpio)
- **Repositorio:** `CristecnoViajes_SRL` (Django 5.2 + DRF + PostgreSQL; marca visible «Omsta»)
- **Método:** `INSTALLED_APPS` leído de `CristecnoViajes_SRL/settings.py`; el URLconf se resolvió en tiempo de ejecución con
  `django.urls.get_resolver()` (1 173 rutas: 539 del admin de Django, 142 bajo `/api/`, el resto HTML/acciones). La
  navegación se leyó de `templates/layouts/`. Cada afirmación lleva `archivo:línea`; lo no verificado dice «pendiente».
- **Columna «Publicable»:** resultado de la captura del 2026-09-25 (`screenshots/manifest.md`); «no capturada» = no se tomó.

---

## 0. Cómo se decide quién ve qué

### Roles base (un rol por usuario)

`usuarios/models.py:231-236` — `superadmin`, `admin`, `contabilidad`, `reservas`, `clientes`.

### Módulos otorgados y roles efectivos

`security/access_policy.py:100-105` define 4 módulos otorgables (`crm`, `reservas`, `cobros`, `contabilidad`);
`security/access_policy.py:119-126` los traduce a roles efectivos con jerarquía `contabilidad ⊇ reservas ⊇ crm`;
`security/access_policy.py:151-180` (`roles_efectivos`): superusuario/`superadmin` → todo; `admin` → todos los
operativos; resto → roles derivados de sus módulos más los del rol base (`ROL_MODULOS_DEFAULT`, `:137-143`).

Abreviaturas usadas abajo:

| Abrev. | Roles efectivos | Fuente |
| --- | --- | --- |
| **FIN** | admin, contabilidad | `security/access_policy.py:19` |
| **PAGOS** | admin, contabilidad, reservas, cobros | `security/access_policy.py:22-27` |
| **CXC** | admin, contabilidad, cobros | `security/access_policy.py:37` |
| **RES** | admin, contabilidad, reservas, clientes (clientes solo ve las suyas) | `reservas/services/reservations.py:42-46` |
| **ADM** | admin (y superusuario) | `usuarios/views/*` `allowed_roles = ["admin"]` |
| **SUPER** | solo superadmin / superusuario | `usuarios/views/permissions.py:58` |
| **AUTH** | cualquier usuario autenticado | `LoginRequiredMixin` / `TutorialReadAccessMixin` |

### Tres capas de control

1. **Middleware por prefijo de URL** — `security/access_policy.py:55-86` (`MODULE_ACCESS_RULES`, gana el primer
   prefijo), aplicado por `security.middleware.ModuleRoleAccessMiddleware` (`settings.py:138`).
2. **Guardas por vista** — `allowed_roles` en `RoleAccessMixin` (`security/mixins.py:28`).
3. **Visibilidad del menú** — `core/context_processors.py:22-31` (`nav_can_*`, registrado en `settings.py:252`) y
   `is_admin` = `request.user.is_superuser or request.user.rol == 'admin'` (`templates/layouts/base_app.html:188-192`,
   `:251-255`). El menú solo oculta; el bloqueo real lo hacen las capas 1 y 2 (`core/context_processors.py:8-10`).

---

## 1. Navegación de la interfaz

Barra superior (`templates/layouts/base_app.html:77-167`): marca, botón **Mis procesos** (offcanvas de
`operations`, `:120-129`), **Notificaciones** (offcanvas, `:132-141`) y avatar → **Mi perfil** (`:148`).

Menú lateral (`templates/layouts/_app_navigation_inner.html`), el mismo en sidebar de escritorio y offcanvas móvil
(`templates/layouts/_app_navigation.html:2-6`). **6 secciones, 32 enlaces** (Caja & Pagos aparece dos veces):

| # | Sección | Condición de visibilidad | Enlaces → URL | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | **Principal** | siempre | Dashboard `/` · CRM `/crm/` · Reportes `/reportes/` (solo `nav_can_accounting` = FIN) | `_app_navigation_inner.html:8-51` |
| 2 | **Reservas** | `nav_can_reservas` (admin, contabilidad, reservas, cobros) | Gestión de Reservas `/reservas/` · Servicios `/reservas/productos/` · Caja & Pagos `/contabilidad/pagos/` (`nav_can_payments`) | `:53-98` |
| 3 | **Contabilidad** | `nav_can_contabilidad_group` (FIN o cobros) | *Cobros & Pagos:* CxC `/contabilidad/cuentas-por-cobrar/` (CXC) · CxP `/contabilidad/cuentas-por-pagar/` · Notas → Proveedores `/contabilidad/ap/notas/` y Clientes `/contabilidad/ar/notas/` · Caja & Pagos. *Libro Diario:* Libro Diario `/ledger/entries/` · Períodos `/ledger/periods/` · Salud contable `/contabilidad/salud-contable/` · Entrada de diario `/contabilidad/entrada-diario/`. *Catálogos:* Cuentas Bancarias `/banco/` · Registro de bancos `/banco/bancos/` · Plan de Cuentas `/catalogo-cuentas/` · Tipos & Categorías `/contabilidad/catalogos/` · Mapa de cuentas `/contabilidad/configuracion/mapa-de-cuentas/` · Configuración fiscal `/contabilidad/configuracion/regimen-fiscal/` · Secuencias NCF `/contabilidad/configuracion/secuencias-ncf/` (todo salvo CxC y Caja exige FIN) | `:100-270` |
| 4 | **Recursos Humanos** | `nav_can_accounting` (FIN) | Nómina `/nomina/` | `:272-301` |
| 5 | **Tutoriales** | siempre | Centro de Tutoriales `/tutoriales/` · Asistente `/tutoriales/asistente/` | `:303-337` |
| 6 | **Administración** | `is_admin` (superusuario o rol admin) | Configuración `/usuarios/config/` · Reportes de usuarios `/usuarios/config/reportes-usuarios/` · Sucursales `/sucursales/` · Monedas y Tasas `/divisas/` · Documentos y políticas `/documentos/` · Usuarios `/usuarios/users/` · Registro de Actividad `/usuarios/activity-log/` | `:339-410` |

URLs resueltas por nombre en `templates/layouts/base_app.html:48-74`.

**Menú secundario del panel de Configuración** (`usuarios/templates/usuarios/admin/config_panel.html:69-163`):
Mi perfil · Panel · Usuarios · Permisos (solo `is_superadmin`, `:108-114`) · Sucursales · Divisas · Empresa/DGII ·
Personalización · Retenciones legales (`/nomina/configuracion/retenciones/`) · Bitácora · Reportes de usuarios
(solo admin, `:162-163`).

---

## 2. Apps Django propias (19)

`settings.py:95-115`. Orden de las fichas: el de la narrativa del portafolio.

### 2.1 `dashboard` — Panel principal

- **Qué hace:** indicadores, alertas y rankings del día/mes (destinos, reservas) para el usuario.
- **Roles:** admin, clientes, contabilidad, reservas (`dashboard/views.py:11-13`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:23`, `dashboard/urls.py:7`, plantilla `dashboard/templates/dashboard/dashboard.html`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Dashboard | `/` | dashboard | sí — principal `w02-dashboard` |

### 2.2 `reservas` — Venta y operación (6 verticales)

- **Qué hace:** reservas de hotel, vuelo, paquete, crucero, seguro y «otro servicio»; hoteles, suplidores y catálogos
  de aerolíneas/destinos/navieras/barcos; documentos al cliente (confirmación, voucher, recibo, rooming list).
- **Roles:** RES para reservas y catálogos (`reservas/views/reservations.py:741,1004`; `flight_catalog.py:27`);
  hoteles `admin, reservas` (`reservas/views/hotels.py:523-828`); suplidores `admin, reservas, contabilidad`
  (`reservas/views/suppliers.py:41,264`); cancelación/compensación `superadmin, admin, reservas, contabilidad`
  (`reservas/services/cancellation.py:175`, `credit_transfers.py:77`). El listado `/reservas/` admite además
  staff y gestores de sucursal (`reservas/views/public.py:50-58`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:26`, `reservas/urls.py:128-422`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Gestión de Reservas | `/reservas/` | listado | sí — principal `w03-reservas-listado` |
| Nueva reserva (6 tipos) | `/reservas/nueva/<tipo>/` con `tipo` ∈ `hotel, vuelo, paquete, crucero, seguro, otro-servicio` (`reservas_home.html:1276-1311`) | formulario | sí — principal `w10-nueva-reserva-vuelo` |
| Detalle de reserva | `/reservas/reserva/<pk>/` (plantilla según tipo, `reservations.py:1004-1020`) | detalle | sí — principal `w04-reserva-hotel-resumen` |
| Editar reserva | `/reservas/reserva/<pk>/editar/` | formulario | no capturada |
| Rooming list (grupal) | `/reservas/reserva/<pk>/rooming-list/` | formulario | no — texto cortado ([excluded.md](../excluded.md)) |
| Confirmación / voucher / rooming PDF | `/reservas/reserva/<pk>/confirmacion/pdf/`, `…/voucher/pdf/`, `…/rooming-list/pdf/` | reporte (PDF) | no capturada |
| Servicios (hub de catálogos) | `/reservas/productos/` | dashboard | sí — `raw/w24-centro-productos` |
| Hoteles | `/reservas/hoteles/` · `/reservas/hoteles/<pk>/` · `/reservas/agregar-hotel/` · `/reservas/hoteles/<pk>/editar/` | listado · detalle · formulario · formulario | sí — `raw/w25-hoteles` |
| Suplidores | `/reservas/suplidores/` · `/reservas/suplidores/<pk>/` · `/reservas/suplidores/nuevo/` | listado · detalle · formulario | sí — `raw/w27-suplidores` |
| Catálogo de vuelos | `/reservas/vuelos/catalogo/?tab=airlines\|airports` · `/reservas/vuelos/catalogo/aerolineas/<pk>/` · `/reservas/vuelos/catalogo/destinos/<pk>/` | listado · detalle · detalle | no capturada |
| Catálogo de cruceros | `/reservas/cruceros/catalogo/?tab=lines\|ships` · `/reservas/cruceros/catalogo/navieras/<pk>/` · `/reservas/cruceros/catalogo/barcos/<pk>/` | listado · detalle · detalle | no capturada |

### 2.3 `crm` — Clientes y empresas

- **Qué hace:** fichas de clientes y empresas con documentos, notas, historial de pagos y exportaciones.
- **Roles:** `admin, clientes` en todas las vistas (`crm/views.py:522,735,991,1031`); por jerarquía cualquier
  módulo operativo otorga `clientes` (`security/access_policy.py:119-126`). Enlace de menú siempre visible.
- **Evidencia:** `CristecnoViajes_SRL/urls.py:24`, `crm/urls.py:25-93`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| CRM (clientes / empresas) | `/crm/` | listado | sí — principal `w13-crm-clientes` |
| Alta de entidad | `/crm/entities/create/` | formulario | no capturada |
| Ficha de cliente / empresa | `/crm/entities/client/<pk>/` · `/crm/entities/company/<pk>/` | detalle | sí — `raw/w35-crm-cliente-ficha` |
| Editar entidad | `/crm/entities/edit/client/<pk>/` (o `company`) | formulario | no capturada |
| Ficha PDF | `/crm/entity/client/<pk>/pdf/` | reporte (PDF) | no capturada |

### 2.4 `contabilidad` — Cobros, facturación, CxC/CxP, notas, DGII, salud contable

- **Qué hace:** Caja & Pagos, facturación con NCF, CxC, CxP (reservas y compras/gastos), notas de crédito/débito,
  registros DGII 606/608/623, entradas de diario, configuración fiscal y la pantalla de Salud contable.
- **Roles:** FIN por defecto (`security/access_policy.py:61`); Caja & Pagos PAGOS
  (`contabilidad/services/payment_permissions.py:18`, `access_policy.py:56`); lista CxC CXC
  (`contabilidad/views/receivables.py:209`, `access_policy.py:60`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:28-31`, `contabilidad/urls/*.py`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Caja & Pagos | `/contabilidad/pagos/` (`urls/payments.py:7`) | listado | sí — principal `w15-caja-pagos` |
| Nuevo pago / editar / reembolso | `/contabilidad/pagos/nuevo/` · `/contabilidad/pagos/<pk>/editar/` · `/contabilidad/pagos/<pk>/reembolso/` | formulario | sí — `raw/w39-registrar-pago` |
| Pagos de una reserva | `/contabilidad/pagos/reserva/<pk>/` (pk = reserva, `urls/payments.py:55`) | detalle | no capturada |
| Estado de cuenta PDF | `/contabilidad/pagos/reserva/<pk>/estado-cuenta.pdf` | reporte (PDF) | no capturada |
| Cuentas por Cobrar | `/contabilidad/cuentas-por-cobrar/?tab=receivable\|por_abonar\|abonadas\|collected\|all` (`views/receivables.py:187-196`) | listado | no capturada |
| Facturar reserva / factura PDF | `/contabilidad/facturas/<pk>/nueva/` · `/contabilidad/facturas/<pk>/pdf/` (pk = reserva, `views/receivables.py:515`, `:1080`) | formulario · reporte (PDF) | no capturada |
| Cuentas por Pagar | `/contabilidad/cuentas-por-pagar/?scope=reservas\|compras\|todas&state=payable\|por_abonar\|abonadas\|paid\|all` (`views/payables.py:241-272`) | listado | no capturada |
| Detalle CxP | `/contabilidad/cuentas-por-pagar/detalle/<pk>/` | detalle | sí — principal `w20-cxp-saldada` |
| Documentos de proveedor | `/contabilidad/cuentas-por-pagar/<payable_id>/documentos-proveedor/` · `…/documentos-proveedor/nuevo/` · `…/documentos-proveedor/<pk>/` | listado · formulario · detalle | sí — `raw/w50-documentos-proveedor-cxp` |
| Pago a proveedor | `/contabilidad/proveedores/pagos/` | formulario | sí — `raw/w51-pago-suplidor-form` |
| Compras y gastos | `/contabilidad/ap/compras-gastos/nuevo/` · `/contabilidad/ap/compras-gastos/<pk>/` · `…/<pk>/fiscal-606/` | formulario · detalle · formulario | sí — `raw/w52-compra-gasto-form` |
| Notas CxP | `/contabilidad/ap/notas/` · `/contabilidad/ap/notas/nueva/` · `/contabilidad/ap/notas/<pk>/` | listado · formulario · detalle | no — vacía ([excluded.md](../excluded.md)) |
| Notas CxC | `/contabilidad/ar/notas/` · `/contabilidad/ar/notas/nueva/` · `/contabilidad/ar/notas/<pk>/` | listado · formulario · detalle | no — vacía ([excluded.md](../excluded.md)) |
| Salud contable | `/contabilidad/salud-contable/` (`urls/accounting_health.py:10`) | dashboard | sí — principal `w26-salud-contable` |
| Entrada de diario | `/contabilidad/entrada-diario/` · `…/nuevo/` · `…/<uuid>/` | listado · formulario · detalle | no — vacía ([excluded.md](../excluded.md)) |
| Mapa de cuentas | `/contabilidad/configuracion/mapa-de-cuentas/` | dashboard | sí — principal `w30-mapa-de-cuentas` |
| 606 manuales | `/contabilidad/configuracion/606-manuales/` · `…/nuevo/` | listado · formulario | no — vacía ([excluded.md](../excluded.md)) |
| Régimen fiscal | `/contabilidad/configuracion/regimen-fiscal/` | listado | sí — principal `w28-configuracion-fiscal-itbis` |
| Secuencias NCF | `/contabilidad/configuracion/secuencias-ncf/` · `…/nueva/` | listado · formulario | sí — principal `w29-secuencias-ncf` |
| Retención 623 | `/contabilidad/dgii/623/nuevo/` · `/contabilidad/dgii/623/importar/` | formulario | sí — `raw/w75-623-registrar` |

### 2.5 `catalogs` — Tipos & Categorías

- **Qué hace:** catálogos parametrizables (bancos, métodos de pago, estados, conceptos de nómina…).
- **Roles:** `admin, contabilidad` (`catalogs/views.py:81`). Montada dentro de `contabilidad` como sub-namespace.
- **Evidencia:** `catalogs/urls.py:11-31`; códigos de grupo en `catalogs/constants.py:12-27`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Grupos de catálogo | `/contabilidad/catalogos/` | listado | sí — `raw/w67-catalogos` |
| Detalle de grupo | `/contabilidad/catalogos/clases/<code>/` (p. ej. `PAYMENT_METHOD`) | detalle | sí — `raw/w68-catalogo-metodos-pago` |
| Nuevo grupo | `/contabilidad/catalogos/nueva/` | formulario | no capturada |

### 2.6 `coa` — Plan de cuentas

- **Qué hace:** catálogo de cuentas contables con importación/exportación.
- **Roles:** FIN (`coa/mixins.py:32`, `access_policy.py:68`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:69`, `coa/urls.py:9-15`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Plan de cuentas | `/catalogo-cuentas/` | listado | no — desborde horizontal ([excluded.md](../excluded.md)) |
| Nueva cuenta / importar | `/catalogo-cuentas/nuevo/` · `/catalogo-cuentas/importar/` | formulario | sí — `raw/w63-cuenta-nueva` |

### 2.7 `ledger` — Libro diario y períodos

- **Qué hace:** asientos (borrador/publicado/reverso), asientos por reserva y cierre de períodos contables.
- **Roles:** FIN (`ledger/views.py:57`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:70`, `ledger/urls.py:9-27`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Libro diario | `/ledger/entries/` | listado | sí — principal `w23-libro-diario` |
| Asiento | `/ledger/entries/<uuid>/` · `/ledger/entries/<uuid>/edit/` | detalle · formulario | sí — principal `w24-asiento-explicado` |
| Asientos de una reserva | `/ledger/reserva/<id>/entries/` | listado | sí — principal `w25-asientos-de-una-reserva` |
| Períodos contables | `/ledger/periods/` | listado | sí — principal `w27-cierre-de-periodo` |

### 2.8 `reports` — Report registry

- **Qué hace:** índice y ejecutor único de reportes registrados (vista previa + exportación XLSX/PDF/TXT) y dashboard contable.
- **Roles:** FIN para el módulo (`reports/views.py:92`, `access_policy.py:79`); cada reporte declara `allowed_roles`.
- **Evidencia:** `CristecnoViajes_SRL/urls.py:75`, `reports/urls.py:16-36`, registro en `reports/apps.py:14-66`.
- **Reportes registrados en ejecución (14):**

| ID | Título | Categoría | En índice | Registro |
| --- | --- | --- | --- | --- |
| `accounts-receivable` | Cuentas por Cobrar (CxC) | Contabilidad | sí | `contabilidad/reporting/ar.py:236` |
| `accounts-payable` | Cuentas por Pagar (CxP) | Contabilidad | sí | `contabilidad/reporting/ap.py:291` |
| `cash-bank` | Caja / Banco | Contabilidad | sí | `contabilidad/reporting/cash_bank.py:924` |
| `reservations` | Reporte de Reservas | Reservas | sí | `reservas/reporting/reservations.py:790` |
| `dgii` | DGII (tablero) | Fiscal | sí | `contabilidad/reporting/dgii/registry.py:150` |
| `dgii-606` · `dgii-607` · `dgii-608` · `dgii-623` | Formatos 606/607/608/623 | Fiscal | no (se entra desde `dgii`) | `contabilidad/reporting/dgii/registry.py:169-231` |
| `trial_balance` · `balance_sheet` · `general_ledger` · `expense_listing` · `income_statement` | Balanza, Balance General, Libro Mayor, Análisis de Gastos, Estado de Resultados | Contabilidad financiera | sí | `contabilidad/reporting/financial.py:608-701` |

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Índice de reportes | `/reportes/` | dashboard | sí — principal `w40-centro-de-reportes` |
| Dashboard contable | `/reportes/contabilidad/dashboard/` | dashboard | no capturada |
| Ejecutar reporte | `/reportes/run/<report_id>/` | reporte | sí — `raw/w106-reporte-cxc` |

### 2.9 `banco` — Banco

- **Qué hace:** movimientos bancarios, transferencias internas, conciliación y registro de cuentas bancarias.
- **Roles:** FIN (`banco/views.py:66`, `access_policy.py:63`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:27`, `banco/urls.py:31-54`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Panel bancario | `/banco/panel/` | dashboard | no — comentario de plantilla impreso ([excluded.md](../excluded.md)) |
| Movimientos | `/banco/?tab=all\|entries\|exits` (`banco/views.py:345`) | listado | no capturada |
| Conciliación | `/banco/conciliacion/` | dashboard | sí — principal `w32-banco-conciliacion` |
| Registro de bancos | `/banco/bancos/` · `/banco/bancos/nuevo/` | listado · formulario | sí — `raw/w79-banco-cuentas` |
| Nuevo movimiento / transferencia interna | `/banco/transacciones/nueva/` · `/banco/transacciones/transferencia-interna/` | formulario | sí — `raw/w80-banco-transaccion-nueva` |

### 2.10 `nomina` — Nómina y RR. HH.

- **Qué hace:** empleados, períodos y volantes, retenciones legales (AFP/SFS/ISR), vacaciones, licencias, permisos,
  autoservicio del empleado e integración contable.
- **Roles:** FIN (+ grupos Gerencia/RRHH) (`nomina/views/dashboard.py:18-19`, `access_policy.py:66`); autoservicio
  `/nomina/my/` para admin, contabilidad, reservas, clientes (`access_policy.py:46-51,65`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:32`, `nomina/urls.py:11-243`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Dashboard de nómina | `/nomina/` | dashboard | sí — principal `w33-nomina-resumen` |
| Empleados | `/nomina/empleados/` · `/nomina/empleados/nuevo/` · `/nomina/empleados/<pk>/` · `/nomina/empleados/<pk>/configurar/` | listado · formulario · detalle · formulario | sí — `raw/w82-nomina-empleados` |
| Períodos | `/nomina/periodos/` · `/nomina/periodos/nuevo/` · `/nomina/periodos/<pk>/` | listado · formulario · detalle | sí — `raw/w85-nomina-periodos` |
| Entrada (volante) | `/nomina/entradas/<pk>/detalle/` | detalle | no capturada |
| Vacaciones | `/nomina/vacaciones/` · `/nomina/vacaciones/calendario/` · `/nomina/vacaciones/nueva/` | listado · dashboard · formulario | sí — `raw/w87-nomina-vacaciones` |
| Licencias / permisos | `/nomina/leaves/licenses/` · `/nomina/leaves/permissions/` | listado | no — vacía ([excluded.md](../excluded.md)) |
| Autoservicio | `/nomina/my/licenses/` · `/nomina/my/permissions/` | listado | no capturada |
| Reportes / importar | `/nomina/reportes/` · `/nomina/importar/` | reporte · formulario | sí — `raw/w91-nomina-reportes` |
| Configuración | `/nomina/configuracion/` · `/nomina/configuracion/contabilidad/` · `/nomina/configuracion/retenciones/` | formulario · formulario · listado | no capturada |

### 2.11 `divisas` — Monedas y tasas

- **Qué hace:** monedas, tasas históricas, conversor y actividad, en un tablero con pestañas.
- **Roles:** FIN (`divisas/services.py:14`, `divisas/views.py:68`); lectura de tasa/conversión abierta a roles
  operativos (`access_policy.py:73-74`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:33`, `divisas/urls.py:18-20`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Tablero de divisas | `/divisas/?tab=fx-config\|fx-currencies\|fx-rates\|fx-converter\|fx-activity` (`divisas/views.py:140-153`) | dashboard | no capturada |
| Editar moneda / tasa | `/divisas/moneda/<pk>/editar/` · `/divisas/tasa/<pk>/editar/` | formulario | no capturada |

### 2.12 `sucursales` — Sucursales y organización

- **Qué hace:** sucursales con dashboard, reporte, departamentos, miembros, horarios, documentos, métricas y **mapa**.
- **Roles:** menú solo admin; listado y mapa AUTH filtrados por visibilidad (`sucursales/views/sucursal_crud.py:47-54`,
  `views/map.py:19`); alta solo admin del sistema (`sucursal_crud.py:115`, `sucursales/permissions.py:238`);
  sub-pantallas para gerente de sucursal o admin (`sucursales/permissions.py:188`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:86-89`, `sucursales/urls.py:15-210`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Sucursales | `/sucursales/` | listado | sí — principal `w37-sucursales` |
| **Mapa de sucursales** | `/sucursales/mapa/` | dashboard (mapa) | no — privacidad ([excluded.md](../excluded.md) §5) |
| Detalle / alta / edición | `/sucursales/<pk>/` · `/sucursales/crear/` · `/sucursales/<pk>/editar/` | detalle · formulario · formulario | no — privacidad (mapa) ([excluded.md](../excluded.md)) |
| Dashboard / reporte / configuración | `/sucursales/<pk>/dashboard/` · `/sucursales/<pk>/reporte/` · `/sucursales/<pk>/configuracion/` | dashboard · reporte · formulario | sí — `raw/w97-sucursal-dashboard` |
| Sub-listados | `/sucursales/<pk>/departamentos/` · `…/miembros/` · `…/horarios/` · `…/documentos/` · `…/metricas/` | listado | no capturada |
| Reporte general | `/sucursales/reportes/general/` | reporte | no — montos truncados ([excluded.md](../excluded.md)) |

### 2.13 `documentos` — Documentos y políticas

- **Qué hace:** configuración de los 7 documentos emitidos, plantillas de políticas, valores por defecto y correos automáticos.
- **Roles:** `admin, contabilidad, reservas` (`documentos/services.py:20`, `access_policy.py:82`); en el menú solo admin.
- **Evidencia:** `CristecnoViajes_SRL/urls.py:80-83`, `documentos/urls.py:22-53`; tipos en `documentos/catalog.py:24-60`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Hub de documentos | `/documentos/` | dashboard | sí — principal `w38-centro-de-documentos` |
| Editar documento | `/documentos/documento/<kind>/` con `kind` ∈ `proforma, factura_final, recibo, consolidado, estado_cuenta, voucher, recibo_proveedor` | formulario | no — vista previa vacía ([excluded.md](../excluded.md)) |
| Vista previa del documento | `/documentos/documento/<kind>/vista-previa/` (HTML con datos de muestra, `documentos/views.py:296-320`) | reporte | no capturada |
| Valores por defecto / correos automáticos | `/documentos/valores-por-defecto/` · `/documentos/correos-automaticos/` | formulario | no capturada |
| Políticas | `/documentos/politicas/` · `/documentos/politicas/nueva/` | listado · formulario | sí — `raw/w103-politicas` |

### 2.14 `usuarios` — Cuentas, perfil, permisos, bitácora, notificaciones, configuración

- **Qué hace:** login, gestión de usuarios y sesiones/dispositivos, permisos por módulo, perfil, bitácora con
  geolocalización, presencia en línea, notificaciones, reportes internos de usuarios y ajustes de empresa.
- **Roles:** gestión ADM (`usuarios/views/user_admin.py:69-322`, `activity.py:178-335`, `sessions.py:55`,
  `settings.py:38-58`); permisos SUPER (`usuarios/views/permissions.py:58`); notificaciones y «mis reportes» todos
  los roles (`usuarios/views/notifications.py:27`, `user_reports.py:39`); panel `/usuarios/config/` solo exige login
  (`usuarios/views/dashboard.py:210`) aunque el menú lo muestra solo a admin.
- **Evidencia:** `CristecnoViajes_SRL/urls.py:25`, `usuarios/urls.py:10-239`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Login | `/usuarios/login/` | formulario | sí — principal `w01-login` |
| Verificación de ubicación | `/usuarios/ubicacion/` | formulario | no capturada |
| Panel de configuración | `/usuarios/config/` | dashboard | sí — `raw/w113-config-resumen` |
| Empresa / DGII · Personalización | `/usuarios/config/empresa-dgii/` · `/usuarios/config/personalizacion/` | formulario | no — sin logo ([excluded.md](../excluded.md)) |
| Permisos | `/usuarios/config/permisos/` | listado | no — 403 para admin ([excluded.md](../excluded.md) §1) |
| Usuarios | `/usuarios/users/` · `/usuarios/users/create/` · `/usuarios/users/<pk>/edit/` · `/usuarios/users/<pk>/password/` | listado · formulario | sí — principal `w42-usuarios` |
| Sesiones y dispositivos | `/usuarios/users/<pk>/sesiones/` | detalle | no — vacía ([excluded.md](../excluded.md)) |
| Perfil | `/usuarios/perfil/` · `/usuarios/perfil/<pk>/` | detalle | sí — `raw/w121-perfil` |
| Usuarios en línea | `/usuarios/online-users/` | listado | no — privacidad ([excluded.md](../excluded.md) §5) |
| Bitácora | `/usuarios/activity-log/` · `/usuarios/activity-log/<pk>/` | listado · detalle | no — «0 registros» incoherente ([excluded.md](../excluded.md)) |
| Notificaciones | `/usuarios/notificaciones/` · `/usuarios/notificaciones/<pk>/` | listado · detalle | sí — principal `w41-notificaciones` |
| Reportes de usuarios (admin) | `/usuarios/config/reportes-usuarios/` · `…/kanban/` · `…/<pk>/` | listado · dashboard · detalle | no capturada |
| Reportar / mis reportes | `/usuarios/reportes/crear/` · `/usuarios/reportes/mis-reportes/` · `…/<pk>/` | formulario · listado · detalle | no capturada |

### 2.15 `tutoriales` — Centro de tutoriales

- **Qué hace:** guías (PDF) en la app con visor, búsqueda, categorías y un asistente por módulo/intención.
- **Roles:** lectura AUTH (`tutoriales/views.py:40-46`); gestión solo admin (`tutoriales/views.py:52`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:76-79`, `tutoriales/urls.py:11-41`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Centro de tutoriales | `/tutoriales/` | listado | sí — principal `w44-tutoriales` |
| Asistente | `/tutoriales/asistente/` | dashboard | sí — `raw/w123-tutoriales-asistente` |
| Tutorial | `/tutoriales/<slug>/` (slug: pendiente, depende de `seed_tutoriales`) | detalle | sí — `raw/w123-tutoriales-asistente` |
| Nuevo tutorial / categorías | `/tutoriales/nuevo/` · `/tutoriales/categorias/` | formulario · listado | no capturada |

### 2.16 `operations` — Mis procesos

- **Qué hace:** feed compartido de trabajos en segundo plano (exportaciones, DGII, catálogos) con reintento y descarte.
- **Roles:** AUTH (`operations/views.py:21`).
- **Sin página propia:** el feed es un fragmento HTMX (`operations/includes/feed_root.html`, `operations/views.py:53-56`)
  que se muestra en el offcanvas «Mis procesos» (`templates/layouts/base_app.html:120-129,294-297`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:71-74`, `operations/urls.py:14`.

| Pantalla | URL GET | Tipo | Publicable |
| --- | --- | --- | --- |
| Mis procesos (bandeja) | `/operaciones/feed/?layout=tray` (fragmento) | dashboard | no capturada |

### 2.17 `movil` — API de Omsta Móvil

- **Qué hace:** API REST para la app Expo (JWT por dispositivo, push). **No tiene pantallas web.**
- **Roles:** por vista; CxC móvil CXC (`access_policy.py:85`).
- **Evidencia:** `CristecnoViajes_SRL/urls.py:93` (94 rutas bajo `/api/movil/v1/`, resolver en ejecución); esquema
  OpenAPI solo offline (`settings.py:758-763`: `SERVE_INCLUDE_SCHEMA: False`; archivo `mobile/api/schema.yaml`).

### 2.18 `security` — Control de acceso (sin UI)

- **Qué hace:** roles efectivos, middleware de login/ubicación/módulo y auditoría de superficie (`auditar_seguridad`).
- **Evidencia:** `settings.py:96`, `settings.py:136-138`, `security/access_policy.py`. Sin `urls.py`.

### 2.19 `core` — Utilidades transversales (sin UI propia)

- **Qué hace:** middleware de cabeceras/no-cache, context processors de navegación, adjuntos, PDF y manejador 403.
- **Evidencia:** `settings.py:97`, `core/context_processors.py`, `CristecnoViajes_SRL/urls.py:105` (`handler403`). Sin `urls.py`.

### Rutas fuera de apps propias

| Ruta | Qué es | Evidencia |
| --- | --- | --- |
| `/admin/` | Admin de Django (superusuario / staff) | `CristecnoViajes_SRL/urls.py:21` |
| `/api/` | Raíz del router DRF (sucursales, departamentos, membresías, usuarios); navegable con sesión | `CristecnoViajes_SRL/urls.py:91`, `settings.py:707-720` |
| `/api-auth/login/` | Login del Browsable API de DRF | `CristecnoViajes_SRL/urls.py:96` |
| `/health/` | Sonda JSON `{"status":"ok"}` | `CristecnoViajes_SRL/urls.py:16-17,94` |
| API docs (Swagger/Redoc) | **No existe**: `drf_spectacular` está instalado (`settings.py:93`) pero no hay ninguna ruta de esquema/UI | resolver en ejecución (0 coincidencias `schema/swagger/redoc`) |

---

## 3. Pantallas con mapas o ubicación (sensibles a privacidad)

La verificación de ubicación está activa por defecto fuera de DEBUG (`settings.py:666`); los datos de presencia y
bitácora guardan ciudad, IP y coordenadas de personas reales. **Capturar solo con datos demo o difuminados.**

| URL | Qué muestra | Evidencia |
| --- | --- | --- |
| `/usuarios/ubicacion/` | Pide la geolocalización del navegador | `usuarios/views/location_gate.py:44`, `location_gate.html:234` |
| `/usuarios/config/` | Usuarios en línea + **iframe de mapa** con coordenadas de la ubicación actual | `config_panel.html:290-330` |
| `/usuarios/perfil/`, `/usuarios/perfil/<pk>/` | **Mapa embebido** de última ubicación, lat/long ± precisión, historial ciudad/IP | `usuarios/templates/usuarios/users/profile.html:210-304` |
| `/usuarios/online-users/` | Ciudad/país o **lat/long** de presencia por usuario | `online_users_list.html:120-125` |
| `/usuarios/activity-log/` | Ciudad/región/país e **IP** por evento; filtro por ubicación | `activity_log.html:188,305-315` |
| `/usuarios/activity-log/<pk>/` | IP, coordenadas y enlace «Abrir mapa» | `activity_detail.html:95-108` |
| `/usuarios/users/<pk>/sesiones/` | IP, ubicación por sesión, «ubicación verificada» por dispositivo | `user_sessions.html:69-135` |
| `/sucursales/mapa/` | **Mapa Google** con todas las sucursales | `sucursales/templates/sucursales/branch_map.html`, `static/sucursales/js/branch-map.js` |
| `/sucursales/<pk>/` | Coordenadas y enlace a mapa de la sucursal | `branch_detail.html:375-379,436` |
| `/sucursales/crear/`, `/sucursales/<pk>/editar/` | Selector de ubicación con Google Maps | `branch_form.html`, `static/sucursales/js/branch-form.js` |
| `/reservas/agregar-hotel/`, `/reservas/hoteles/<pk>/editar/` | Google Places/Maps JS (ubicación del hotel, no de personas) | `hotel_form.html:1384` |
| `/reservas/hoteles/<pk>/` | Enlace «ver en mapa» del hotel | `hotel_detail.html:153-158` |

No muestran mapa pero sí datos personales: fichas CRM (direcciones), empleados de nómina (salario), bitácora exportada.

---

## 4. Lista de rutas para capturar

`<pk>`, `<uuid>`, `<slug>`, `<kind>` se sustituyen al capturar. «Fragmento» = no es página completa.

| orden | módulo | URL de GET | tipo | requiere pk | notas |
| --- | --- | --- | --- | --- | --- |
| 1 | Dashboard | `/` | dashboard | no | Contenido cambia por rol |
| 2 | Reservas | `/reservas/` | listado | no | Filtros por GET; `?export=xlsx\|pdf` descarga (no capturar) |
| 3 | Reservas | `/reservas/nueva/hotel/` | formulario | no | |
| 4 | Reservas | `/reservas/nueva/vuelo/` | formulario | no | |
| 5 | Reservas | `/reservas/nueva/paquete/` | formulario | no | |
| 6 | Reservas | `/reservas/nueva/crucero/` | formulario | no | |
| 7 | Reservas | `/reservas/nueva/seguro/` | formulario | no | |
| 8 | Reservas | `/reservas/nueva/otro-servicio/` | formulario | no | |
| 9 | Reservas | `/reservas/reserva/<pk>/` (hotel) | detalle | sí | Pestañas Bootstrap sin `?tab=`: resumen, alojamiento, pagos, cuentas por pagar, facturación, documentos, actividad (`reserva_detalle.html:380-423`) |
| 10 | Reservas | `/reservas/reserva/<pk>/` (vuelo/crucero/paquete/seguro/otro) | detalle | sí | Pestañas: resumen, producto, viajeros, pagos, CxP, facturación, expediente, historial (`product_detail_base.html`) |
| 11 | Reservas | `/reservas/reserva/<pk>/editar/` | formulario | sí | |
| 12 | Reservas | `/reservas/reserva/<pk>/rooming-list/` | formulario | sí | Solo tiene sentido en reserva grupal |
| 13 | Reservas | `/reservas/reserva/<pk>/cancelacion/` | formulario | sí | Fragmento: GET devuelve JSON con `form_html` (modal); capturar desde el detalle |
| 14 | Reservas | `/reservas/reserva/<pk>/compensacion/` | formulario | sí | Fragmento (modal JSON) |
| 15 | Reservas | `/reservas/reserva/<pk>/correo/<tipo>/` | formulario | sí | Fragmento (JSON); `tipo` ∈ proforma, recibo, voucher, proveedor, confirmacion, recordatorio_pago (`reservas/views/correos.py:40-47`) |
| 16 | Reservas | `/reservas/reserva/<pk>/confirmacion/pdf/` | reporte | sí | PDF |
| 17 | Reservas | `/reservas/reserva/<pk>/voucher/pdf/` | reporte | sí | PDF |
| 18 | Reservas | `/reservas/reserva/<pk>/rooming-list/pdf/` | reporte | sí | PDF, grupal |
| 19 | Reservas | `/reservas/productos/` | dashboard | no | Hub «Servicios» |
| 20 | Reservas | `/reservas/hoteles/` | listado | no | |
| 21 | Reservas | `/reservas/hoteles/<pk>/` | detalle | sí | Enlace a mapa del hotel |
| 22 | Reservas | `/reservas/agregar-hotel/` | formulario | no | Google Places (mapa); requiere `GOOGLE_MAPS_API_KEY` |
| 23 | Reservas | `/reservas/suplidores/` | listado | no | |
| 24 | Reservas | `/reservas/suplidores/<pk>/` | detalle | sí | Pestañas |
| 25 | Reservas | `/reservas/suplidores/nuevo/` | formulario | no | |
| 26 | Reservas | `/reservas/vuelos/catalogo/?tab=airlines` | listado | no | También `?tab=airports` |
| 27 | Reservas | `/reservas/vuelos/catalogo/aerolineas/<pk>/` | detalle | sí | |
| 28 | Reservas | `/reservas/vuelos/catalogo/destinos/<pk>/` | detalle | sí | |
| 29 | Reservas | `/reservas/cruceros/catalogo/?tab=lines` | listado | no | También `?tab=ships` |
| 30 | Reservas | `/reservas/cruceros/catalogo/navieras/<pk>/` | detalle | sí | |
| 31 | Reservas | `/reservas/cruceros/catalogo/barcos/<pk>/` | detalle | sí | |
| 32 | CRM | `/crm/` | listado | no | Clientes/empresas; `?tab=clients\|companies` solo en el parcial HTMX (`crm/views.py:798`) |
| 33 | CRM | `/crm/entities/create/` | formulario | no | |
| 34 | CRM | `/crm/entities/client/<pk>/` | detalle | sí | Datos personales |
| 35 | CRM | `/crm/entities/company/<pk>/` | detalle | sí | |
| 36 | CRM | `/crm/entities/edit/client/<pk>/` | formulario | sí | |
| 37 | CRM | `/crm/entity/client/<pk>/pdf/` | reporte | sí | PDF |
| 38 | Cobros | `/contabilidad/pagos/` | listado | no | Caja & Pagos; filtros GET |
| 39 | Cobros | `/contabilidad/pagos/nuevo/` | formulario | no | |
| 40 | Cobros | `/contabilidad/pagos/reserva/<pk>/` | detalle | sí | pk = reserva |
| 41 | Cobros | `/contabilidad/pagos/<pk>/editar/` | formulario | sí | pk = pago |
| 42 | Cobros | `/contabilidad/pagos/<pk>/reembolso/` | formulario | sí | |
| 43 | Cobros | `/contabilidad/pagos/reserva/<pk>/estado-cuenta.pdf` | reporte | sí | PDF |
| 44 | Cobros | `/contabilidad/cuentas-por-cobrar/?tab=receivable` | listado | no | Pestañas `?tab=por_abonar\|abonadas\|collected\|all` |
| 45 | Contabilidad | `/contabilidad/facturas/<pk>/nueva/` | formulario | sí | pk = reserva |
| 46 | Contabilidad | `/contabilidad/facturas/<pk>/pdf/` | reporte | sí | PDF; pk = reserva |
| 47 | Contabilidad | `/contabilidad/cuentas-por-pagar/?scope=reservas&state=payable` | listado | no | `scope=compras\|todas`, `state=por_abonar\|abonadas\|paid\|all` |
| 48 | Contabilidad | `/contabilidad/cuentas-por-pagar/detalle/<pk>/` | detalle | sí | |
| 49 | Contabilidad | `/contabilidad/cuentas-por-pagar/<payable_id>/documentos-proveedor/` | listado | sí | |
| 50 | Contabilidad | `/contabilidad/cuentas-por-pagar/documentos-proveedor/nuevo/` | formulario | no | |
| 51 | Contabilidad | `/contabilidad/cuentas-por-pagar/documentos-proveedor/<pk>/` | detalle | sí | |
| 52 | Contabilidad | `/contabilidad/proveedores/pagos/` | formulario | no | Pago a suplidor |
| 53 | Contabilidad | `/contabilidad/ap/compras-gastos/nuevo/` | formulario | no | |
| 54 | Contabilidad | `/contabilidad/ap/compras-gastos/<pk>/` | detalle | sí | |
| 55 | Contabilidad | `/contabilidad/ap/notas/` | listado | no | Notas a proveedores |
| 56 | Contabilidad | `/contabilidad/ap/notas/nueva/` | formulario | no | |
| 57 | Contabilidad | `/contabilidad/ap/notas/<pk>/` | detalle | sí | |
| 58 | Contabilidad | `/contabilidad/ar/notas/` | listado | no | Notas a clientes |
| 59 | Contabilidad | `/contabilidad/ar/notas/nueva/` | formulario | no | |
| 60 | Contabilidad | `/contabilidad/ar/notas/<pk>/` | detalle | sí | |
| 61 | Contabilidad | `/contabilidad/salud-contable/` | dashboard | no | 5 secciones ancladas; bloques pesados |
| 62 | Contabilidad | `/contabilidad/entrada-diario/` | listado | no | |
| 63 | Contabilidad | `/contabilidad/entrada-diario/nuevo/` | formulario | no | |
| 64 | Contabilidad | `/contabilidad/entrada-diario/<uuid>/` | detalle | sí | uuid |
| 65 | Contabilidad | `/contabilidad/configuracion/mapa-de-cuentas/` | dashboard | no | |
| 66 | Contabilidad | `/catalogo-cuentas/` | listado | no | Plan de cuentas |
| 67 | Contabilidad | `/catalogo-cuentas/nuevo/` | formulario | no | |
| 68 | Contabilidad | `/catalogo-cuentas/importar/` | formulario | no | |
| 69 | Contabilidad | `/contabilidad/catalogos/` | listado | no | Tipos & Categorías |
| 70 | Contabilidad | `/contabilidad/catalogos/clases/PAYMENT_METHOD/` | detalle | sí | Requiere código de grupo (slug), no pk |
| 71 | Contabilidad | `/contabilidad/catalogos/nueva/` | formulario | no | |
| 72 | Ledger | `/ledger/entries/` | listado | no | Libro diario |
| 73 | Ledger | `/ledger/entries/<uuid>/` | detalle | sí | uuid |
| 74 | Ledger | `/ledger/reserva/<id>/entries/` | listado | sí | Asientos de una reserva |
| 75 | Ledger | `/ledger/periods/` | listado | no | Períodos contables |
| 76 | Fiscal | `/reportes/run/dgii/` | dashboard | no | Tablero DGII; período por defecto (`dgii/registry.py:47`) |
| 77 | Fiscal | `/reportes/run/dgii-606/` | reporte | no | Oculto del índice; filtro de período |
| 78 | Fiscal | `/reportes/run/dgii-607/` | reporte | no | Idem |
| 79 | Fiscal | `/reportes/run/dgii-608/` | reporte | no | Idem |
| 80 | Fiscal | `/reportes/run/dgii-623/` | reporte | no | Idem |
| 81 | Fiscal | `/contabilidad/ap/compras-gastos/<pk>/fiscal-606/` | formulario | sí | Corrección fiscal 606 |
| 82 | Fiscal | `/contabilidad/configuracion/606-manuales/` | listado | no | |
| 83 | Fiscal | `/contabilidad/configuracion/606-manuales/nuevo/` | formulario | no | |
| 84 | Fiscal | `/contabilidad/dgii/623/nuevo/` | formulario | no | |
| 85 | Fiscal | `/contabilidad/dgii/623/importar/` | formulario | no | |
| 86 | Fiscal | `/contabilidad/configuracion/regimen-fiscal/` | listado | no | |
| 87 | Fiscal | `/contabilidad/configuracion/secuencias-ncf/` | listado | no | |
| 88 | Fiscal | `/contabilidad/configuracion/secuencias-ncf/nueva/` | formulario | no | |
| 89 | Banco | `/banco/panel/` | dashboard | no | |
| 90 | Banco | `/banco/?tab=all` | listado | no | `?tab=entries\|exits` |
| 91 | Banco | `/banco/conciliacion/` | dashboard | no | |
| 92 | Banco | `/banco/bancos/` | listado | no | |
| 93 | Banco | `/banco/bancos/nuevo/` | formulario | no | |
| 94 | Banco | `/banco/transacciones/nueva/` | formulario | no | |
| 95 | Banco | `/banco/transacciones/transferencia-interna/` | formulario | no | |
| 96 | Nómina | `/nomina/` | dashboard | no | |
| 97 | Nómina | `/nomina/empleados/` | listado | no | Datos personales |
| 98 | Nómina | `/nomina/empleados/nuevo/` | formulario | no | |
| 99 | Nómina | `/nomina/empleados/<pk>/` | detalle | sí | Salario y datos personales |
| 100 | Nómina | `/nomina/empleados/<pk>/configurar/` | formulario | sí | |
| 101 | Nómina | `/nomina/periodos/` | listado | no | |
| 102 | Nómina | `/nomina/periodos/nuevo/` | formulario | no | |
| 103 | Nómina | `/nomina/periodos/<pk>/` | detalle | sí | |
| 104 | Nómina | `/nomina/entradas/<pk>/detalle/` | detalle | sí | Volante |
| 105 | Nómina | `/nomina/vacaciones/` | listado | no | |
| 106 | Nómina | `/nomina/vacaciones/calendario/` | dashboard | no | Calendario |
| 107 | Nómina | `/nomina/vacaciones/nueva/` | formulario | no | |
| 108 | Nómina | `/nomina/leaves/licenses/` | listado | no | |
| 109 | Nómina | `/nomina/leaves/permissions/` | listado | no | |
| 110 | Nómina | `/nomina/my/licenses/` | listado | no | Autoservicio (todos los roles operativos) |
| 111 | Nómina | `/nomina/my/permissions/` | listado | no | Autoservicio |
| 112 | Nómina | `/nomina/reportes/` | reporte | no | Formulario de reporte |
| 113 | Nómina | `/nomina/importar/` | formulario | no | |
| 114 | Nómina | `/nomina/configuracion/` | formulario | no | |
| 115 | Nómina | `/nomina/configuracion/contabilidad/` | formulario | no | Integración contable |
| 116 | Nómina | `/nomina/configuracion/retenciones/` | listado | no | AFP/SFS/ISR |
| 117 | Divisas | `/divisas/?tab=fx-config` | dashboard | no | |
| 118 | Divisas | `/divisas/?tab=fx-currencies` | dashboard | no | |
| 119 | Divisas | `/divisas/?tab=fx-rates` | dashboard | no | |
| 120 | Divisas | `/divisas/?tab=fx-converter` | dashboard | no | |
| 121 | Divisas | `/divisas/?tab=fx-activity` | dashboard | no | |
| 122 | Divisas | `/divisas/moneda/<pk>/editar/` | formulario | sí | |
| 123 | Sucursales | `/sucursales/` | listado | no | |
| 124 | Sucursales | `/sucursales/mapa/` | dashboard | no | **MAPA** (Google Maps) |
| 125 | Sucursales | `/sucursales/<pk>/` | detalle | sí | **Coordenadas + enlace a mapa** |
| 126 | Sucursales | `/sucursales/crear/` | formulario | no | **Mapa** selector; solo admin del sistema |
| 127 | Sucursales | `/sucursales/<pk>/dashboard/` | dashboard | sí | |
| 128 | Sucursales | `/sucursales/<pk>/reporte/` | reporte | sí | |
| 129 | Sucursales | `/sucursales/<pk>/configuracion/` | formulario | sí | |
| 130 | Sucursales | `/sucursales/<pk>/departamentos/` | listado | sí | |
| 131 | Sucursales | `/sucursales/<pk>/miembros/` | listado | sí | Nombres de empleados |
| 132 | Sucursales | `/sucursales/<pk>/horarios/` | listado | sí | |
| 133 | Sucursales | `/sucursales/<pk>/documentos/` | listado | sí | |
| 134 | Sucursales | `/sucursales/<pk>/metricas/` | listado | sí | |
| 135 | Sucursales | `/sucursales/reportes/general/` | reporte | no | |
| 136 | Documentos | `/documentos/` | dashboard | no | Hub |
| 137 | Documentos | `/documentos/documento/proforma/` | formulario | no | Repetible por `kind` (7 tipos) |
| 138 | Documentos | `/documentos/documento/proforma/vista-previa/` | reporte | no | HTML con datos de muestra: buena candidata |
| 139 | Documentos | `/documentos/valores-por-defecto/` | formulario | no | |
| 140 | Documentos | `/documentos/correos-automaticos/` | formulario | no | |
| 141 | Documentos | `/documentos/politicas/` | listado | no | |
| 142 | Documentos | `/documentos/politicas/nueva/` | formulario | no | |
| 143 | Reportes | `/reportes/` | dashboard | no | Índice del report registry |
| 144 | Reportes | `/reportes/contabilidad/dashboard/` | dashboard | no | |
| 145 | Reportes | `/reportes/run/accounts-receivable/` | reporte | no | Filtros GET |
| 146 | Reportes | `/reportes/run/accounts-payable/` | reporte | no | Pestañas `?tab=` (`contabilidad/reporting/ap.py:36`) |
| 147 | Reportes | `/reportes/run/cash-bank/` | reporte | no | `?tab=payments` por defecto (`cash_bank.py:901`) |
| 148 | Reportes | `/reportes/run/reservations/` | reporte | no | Pestañas `?tab=` (`reservas/reporting/reservations.py:115`) |
| 149 | Reportes | `/reportes/run/trial_balance/` | reporte | no | Balanza de comprobación |
| 150 | Reportes | `/reportes/run/balance_sheet/` | reporte | no | Balance general |
| 151 | Reportes | `/reportes/run/income_statement/` | reporte | no | Estado de resultados |
| 152 | Reportes | `/reportes/run/general_ledger/` | reporte | no | Libro mayor |
| 153 | Reportes | `/reportes/run/expense_listing/` | reporte | no | Análisis de gastos |
| 154 | Usuarios | `/usuarios/users/` | listado | no | Solo admin |
| 155 | Usuarios | `/usuarios/users/create/` | formulario | no | Selector de módulos |
| 156 | Usuarios | `/usuarios/users/<pk>/edit/` | formulario | sí | |
| 157 | Usuarios | `/usuarios/users/<pk>/sesiones/` | detalle | sí | **IP y ubicación** por sesión/dispositivo |
| 158 | Permisos | `/usuarios/config/permisos/` | listado | no | **Solo superadmin** |
| 159 | Usuarios | `/usuarios/perfil/` | detalle | no | **Mapa de última ubicación** |
| 160 | Usuarios | `/usuarios/perfil/<pk>/` | detalle | sí | **Mapa** de otro usuario (admin) |
| 161 | Actividad | `/usuarios/online-users/` | listado | no | **Presencia con ciudad o lat/long** |
| 162 | Actividad | `/usuarios/activity-log/` | listado | no | **Ciudad e IP** por evento; filtros GET |
| 163 | Actividad | `/usuarios/activity-log/<pk>/` | detalle | sí | **IP, coordenadas, «Abrir mapa»** |
| 164 | Usuarios | `/usuarios/notificaciones/` | listado | no | También bandeja offcanvas (fragmento `…/feed/`) |
| 165 | Usuarios | `/usuarios/notificaciones/<pk>/` | detalle | sí | |
| 166 | Usuarios | `/usuarios/config/reportes-usuarios/` | listado | no | Solo admin |
| 167 | Usuarios | `/usuarios/config/reportes-usuarios/kanban/` | dashboard | no | Kanban |
| 168 | Usuarios | `/usuarios/config/reportes-usuarios/<pk>/` | detalle | sí | |
| 169 | Usuarios | `/usuarios/reportes/crear/` | formulario | no | Cualquier rol |
| 170 | Usuarios | `/usuarios/reportes/mis-reportes/` | listado | no | |
| 171 | Configuración | `/usuarios/config/` | dashboard | no | **Iframe de mapa + usuarios en línea** |
| 172 | Configuración | `/usuarios/config/empresa-dgii/` | formulario | no | Datos fiscales de la empresa |
| 173 | Configuración | `/usuarios/config/personalizacion/` | formulario | no | |
| 174 | Tutoriales | `/tutoriales/` | listado | no | |
| 175 | Tutoriales | `/tutoriales/asistente/` | dashboard | no | |
| 176 | Tutoriales | `/tutoriales/<slug>/` | detalle | sí | slug (pendiente) |
| 177 | Tutoriales | `/tutoriales/nuevo/` | formulario | no | Solo admin |
| 178 | Tutoriales | `/tutoriales/categorias/` | listado | no | Solo admin |
| 179 | Operaciones | `/operaciones/feed/?layout=tray` | dashboard | no | **Fragmento HTMX**; capturar abriendo «Mis procesos» en cualquier página |
| 180 | Otros | `/usuarios/login/` | formulario | no | Sin sesión (`LOGIN_EXEMPT_URLS`) |
| 181 | Otros | `/usuarios/ubicacion/` | formulario | no | **Pide geolocalización**; solo si `LOCATION_GATE_ENABLED` |
| 182 | Otros | `/api/` | listado | no | Raíz navegable DRF |
| 183 | Otros | `/api-auth/login/` | formulario | no | Login del Browsable API |
| 184 | Otros | `/admin/` | dashboard | no | Admin de Django; solo superusuario/staff |
| 185 | Otros | `/health/` | reporte | no | JSON; no aporta visualmente |
| — | Otros | API docs (Swagger/Redoc) | — | — | **No existe** en la web; el esquema OpenAPI se genera offline para la app (`mobile/api/schema.yaml`) |

---

## 5. Observaciones para quien capture

- **Reportes de nómina no registrados:** `nomina/reporting/payroll.py:345-431` define 3 reportes
  (`payroll-period-summary`, `payroll-entry-details`, `payroll-deductions`) pero `reports/apps.py:14-66` no llama a
  su `register_reports()`; en ejecución `/reportes/run/payroll-*` no existe (solo lo usa
  `reports/tests/test_payroll_reports.py:12`).
- **Etiqueta del menú:** «Cuentas Bancarias» apunta a `/banco/` (movimientos), y «Registro de bancos» a
  `/banco/bancos/` (`_app_navigation_inner.html:213-226`).
- **Administración usa el rol base, no los roles efectivos:** `base_app.html:188` compara `request.user.rol == 'admin'`.
- **Panel `/usuarios/config/` solo exige login** (`usuarios/views/dashboard.py:210`); el menú lo oculta a no-admin.
- **`clientes` puede abrir reservas propias** (`reservas/services/reservations.py:43`) pero el menú Reservas no se le
  muestra (`core/context_processors.py:25`).
- Los detalles de reserva usan pestañas Bootstrap sin parámetro de URL: cada pestaña requiere un clic antes de capturar.
