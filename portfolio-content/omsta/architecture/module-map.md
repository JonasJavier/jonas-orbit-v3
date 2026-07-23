<!-- portfolio-content/omsta/architecture/module-map.md -->

# Mapa de módulos — OMSTA

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3`
> Basado en `INSTALLED_APPS`, `urls.py`, el análisis de imports entre apps del grafo
> versionado del repo y verificación puntual.

## 1. Aplicaciones Django (18 locales)

| App | Dominio | Rol | LOC (aprox.) |
|---|---|---|---:|
| `contabilidad` | CxC, CxP, notas AP/AR, pagos a suplidores, posteo por documento, DGII 606/607/608/623, vouchers | **Core / integrador** | 62.259 |
| `reservas` | Hotel, vuelo, crucero, paquete, seguro; pagos, planes de pago, comprobantes; suplidores | **Core / núcleo de negocio** | 50.558 |
| `usuarios` | Usuario personalizado con roles, auditoría de actividad, presencia, notificaciones, `CompanySettings` | Base estable | 17.927 |
| `nomina` | Empleados, períodos/entradas de nómina, retenciones AFP/SFS/ISR, vacaciones/licencias | Core (RRHH) | 14.102 |
| `sucursales` | Sucursales, departamentos, membresías con rol, horarios, métricas, API DRF | Organización | 11.275 |
| `crm` | Clientes y empresas, documentos y notas, secuencias con borrado suave | Core | 8.603 |
| `catalogs` | Catálogos genéricos (grupos e ítems) con jobs import/export | Auxiliar (proveedor) | 5.997 |
| `coa` | Catálogo de cuentas (chart of accounts) con jobs de import/export | Contable (proveedor) | 5.256 |
| `reports` | Report registry central y ejecución de datasets | Lectura/agregación | 5.221 |
| `banco` | Transacciones bancarias, conciliación, transferencias internas, auditoría | Contable | 4.651 |
| `ledger` | Libro mayor: asientos, `PostingProfile`, primitivas de posteo, registro de fuentes | Contable (hoja) | 4.320 |
| `tutoriales` | Gestor y visor in-app de tutoriales, seed idempotente | Auxiliar | 4.299 |
| `documentos` | Plantillas de políticas (cancelación), configuración de documentos | Auxiliar | 3.393 |
| `operations` | Experiencia compartida de procesos/jobs (feed, reintentos, descartes) | Plataforma | 3.275 |
| `divisas` | Monedas, tasas de cambio, configuración FX | Base estable (proveedor) | 3.242 |
| `dashboard` | Panel principal y resúmenes agregados | Lectura | 3.091 |
| `core` | Infraestructura transversal (adjuntos, filenames, handlers, middleware, PDF) | Plataforma | 1.713 |
| `security` | Hardening, gate de ubicación, acceso por módulo, políticas | Plataforma | 1.094 |

(LOC: grafo `codebase-memory` 2026-07-21, excluye `migrations/`.)

## 2. Qué es core y qué es auxiliar

- **Núcleo de dominio:** `reservas`, `contabilidad`, `crm`, `nomina`.
- **Columna contable:** `ledger`, `coa`, `banco`, `divisas`, `reports`.
- **Base estable compartida (alto fan-in, bajo fan-out):** `usuarios`, `security`,
  `core`, `divisas`, `catalogs`, `coa`, `sucursales`. Cambiar aquí tiene radio de
  impacto amplio.
- **Plataforma de procesos:** `operations` (jobs), Django Q2 + Redis.
- **Auxiliar / soporte:** `tutoriales`, `documentos`, `dashboard`.

## 3. Rutas por módulo (URLConf raíz)

`/` (dashboard) · `/reservas/` · `/crm/` · `/usuarios/` · `/banco/` ·
`/contabilidad/` · `/nomina/` · `/divisas/` · `/catalogo-cuentas/` (coa) ·
`/ledger/` · `/operaciones/` · `/reportes/` · `/tutoriales/` · `/documentos/` ·
`/sucursales/` · `/admin/`.
APIs DRF: `/api/` (sucursales, router) · `/api/divisas/` · `/api/catalogos/` ·
`/api/bank/` · `/api/contabilidad/` · alias de habitaciones por hotel ·
`/health/` · `/api-auth/` · `/select2/`.

## 4. Dependencias entre módulos (imports, grafo 2026-07-21)

| Origen → Destino | Imports | Lectura |
|---|---:|---|
| `contabilidad` → `reservas` | 90 | La contabilidad se construye sobre la reserva como hecho generador |
| `contabilidad` → `ledger` | 52 | Posteo de asientos desde CxC/CxP |
| `contabilidad` → `divisas` | 37 | Multimoneda en pagos y facturas |
| `contabilidad` → `reports` | 30 | Publicación de datasets al report registry |
| `contabilidad` → `usuarios` | 29 | Auditoría y permisos por rol |
| `reservas` → `divisas` | 23 | Snapshots de moneda en pagos |
| `nomina` → `catalogs` | 21 | Catálogos de conceptos de nómina |
| `reservas` → `security` | 20 | Gates de acceso y ubicación |
| `reservas` → `contabilidad` | 14 | Sentido a vigilar del par reservas↔contabilidad |
| `ledger` → `contabilidad` | 16 | Ciclo residual (mayormente router de UI y composition root) |

## 5. Diagrama de dependencias (dominios)

```mermaid
flowchart TD
    subgraph base["Base estable (proveedores)"]
      USU["usuarios<br/>identidad/roles"]
      SEC["security<br/>gates"]
      CORE["core"]
      DIV["divisas"]
      CAT["catalogs"]
      COA["coa"]
      SUC["sucursales"]
    end

    CRM["crm"]
    RES["reservas<br/>núcleo de negocio"]
    NOM["nomina"]
    BAN["banco"]
    CON["contabilidad<br/>integrador"]
    LED["ledger<br/>libro mayor (hoja)"]
    REP["reports"]
    OPS["operations<br/>jobs compartidos"]

    CRM --> RES
    RES --> CON
    NOM --> CON
    BAN --> CON
    CON --> LED
    CON --> DIV
    CON --> COA
    CON --> REP
    RES --> DIV
    RES --> SEC
    RES --> SUC
    RES --> USU
    LED -. contrato source_registry .-> CON
    OPS -. providers.py conoce el dominio .-> RES

    classDef stable fill:#eef2ff,stroke:#6366f1;
    class USU,SEC,CORE,DIV,CAT,COA,SUC stable;
```

## 6. Ciclos y su estado (del grafo versionado)

| Par | Estado / riesgo |
|---|---|
| `contabilidad ↔ ledger` | **Muy reducido**: `ledger/{models,forms,services}` con 0 imports de contabilidad; restan router de UI + composition root |
| `contabilidad ↔ reservas` | Sentido `reservas → contabilidad` (14) es la parte a vigilar |
| `operations ↔ dominio` | `operations/providers.py` conoce ~7 apps (hub invertido); candidato a invertir con registro |
| `crm ↔ reservas`, `banco ↔ contabilidad`, `coa ↔ ledger`, `reservas ↔ documentos` | Ciclos menores por señales/jobs |

Los ciclos residuales se resuelven en runtime (imports diferidos, señales,
`apps.get_model`), pero dificultan pruebas aisladas — foco de la agenda de mejora.

## 7. Modelos principales por app

- **reservas:** `Reserva`, `HabitacionReserva`, `ReservaEstadoLog`, `Pago`,
  `PaymentAllocation`, `PaymentPlan`/`PaymentInstallment`, `PaymentCorrection`,
  `PaymentRefund`; verticales `FlightReservation`, `CruiseReservation`,
  `PackageReservation`, `InsuranceReservation`; hotelería `Hotel`, `TipoHabitacion`,
  `Tarifa`, `HotelOccupancy`; suplidores `Supplier`, `SupplierContract`.
- **contabilidad:** `Invoice`, `AccountsPayable`, `ReservationSupplierBill`,
  `SupplierPayment`, `APBill`/`APPayment`, `APNote`/`ARNote`, modelos DGII,
  `JournalVoucher`.
- **ledger:** `JournalEntry`, `JournalLine`, `PostingProfile`, `CashAccountMapping`.
- **coa:** `ChartAccount`, `AccountClass`, `AccountType`, `ChartAccountJob`.
- **banco:** `BankTransaction`, `InternalTransfer`, `BankAccountGLMapping`,
  `AuditLogEntry`.
- **crm:** `Cliente`, `Empresa`, `EntitySequence` (borrado suave).
- **nomina:** `Employee`, `PayrollPeriod`/`PayrollEntry`/`PayrollEntryLine`,
  `RetencionLegal`, `PayrollPostingConfig`.
- **usuarios:** `UsuarioPersonalizado`, `UserActivityLog`, `UserPresenceSession`,
  `UserNotification`, `CompanySettings`.
- **divisas:** `Currency`, `ExchangeRate`, `FXConfig`.
- **sucursales:** `Sucursal`, `Departamento`, `SucursalMembership`.
