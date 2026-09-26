<!-- portfolio-content/omsta-2026/architecture/system-overview.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA — vista general del sistema

Un solo sistema con **dos clientes** (web y app móvil) sobre **un backend
Django compartido**. Diagrama: `diagrams/system.mmd`. Nodos: `nodes.yaml`.

## Forma

- **Monolito modular Django 5.2** con 19 apps propias y 150 modelos
  (`metrics.md`). Sin microservicios: las transacciones cruzan reserva →
  factura → asiento → banco y necesitan atomicidad real.
  Fuente: `docs/tecnica/arquitectura.md` §1 y §12.
- **Cliente web**: plantillas Django renderizadas en servidor + JS puntual
  (jQuery/HTMX, select2), sin SPA ni build step; WhiteNoise sirve estáticos.
  Fuente: mismo doc §11; `docs/architecture/plan-app-movil-2026-09.md` §1.
- **Cliente móvil «Omsta Móvil»**: Expo SDK 57 / React Native 0.86, Expo
  Router, TanStack Query, MMKV (caché de lectura), SecureStore y biometría.
  Consume solo `/api/movil/v1/` (94 endpoints) con JWT ligado al dispositivo.
  Fuente: `mobile/package.json`; `movil/urls.py`; `movil/authentication.py`.
- **Contrato web↔móvil**: esquema OpenAPI (`drf-spectacular`) en
  `mobile/api/schema.yaml` → tipos TS generados en `mobile/src/api/types.ts`;
  el CI móvil falla si divergen. Fuente: `docs/operaciones/app-movil.md` §7;
  `.github/workflows/mobile.yml`.

## Módulos de negocio (apps)

| Grupo | Apps | Rol |
| --- | --- | --- |
| Comercial | `reservas` (8 tipos de producto, pagos, cuotas, suplidores), `crm`, `catalogs` | Venta y operación |
| Financiero | `contabilidad` (factura NCF, CxC, CxP, DGII), `ledger` (mayor), `coa`, `banco`, `divisas`, `nomina` | Dinero y fiscal |
| Plataforma | `usuarios`, `security`, `sucursales`, `documentos`, `core`, `operations`, `reports`, `dashboard`, `tutoriales` | Acceso, documentos, jobs, reportes |
| Móvil | `movil` (dispositivos, JWT, tickets de push, 94 vistas DRF) | API del segundo cliente |

Fuente: `docs/tecnica/arquitectura.md` §3; conteo de modelos en `metrics.md`.

## Capas dentro de una app

`urls.py` → `views/` (HTTP, permisos) → `forms/` (validación) →
`services/` (transacción, asiento, efectos) / `selectors/` (lecturas) →
`models/` (invariantes en `save()`), más `api/` (DRF) y `tasks.py` (Q2).
Fuente: `docs/tecnica/arquitectura.md` §4.

**La API móvil no duplica reglas**: `movil/services/*` traduce JSON a los
mismos formularios y servicios de la web (p. ej. `PaymentForm` +
`register_customer_payment`). Fuente: `movil/services/pagos.py`.

## Fronteras protegidas por tests

- `ledger` no importa `contabilidad` (resolución por
  `ledger/source_registry.py`).
- `reservas` → contabilidad solo por `core.contracts.accounting`
  (`reservas/tests/test_accounting_boundary.py`).
- Techo de superficie pública de `Reserva`/`Pago`
  (`reservas/tests/test_god_model_surface.py`).

Fuente: `docs/tecnica/arquitectura.md` §5;
`docs/architecture/reservas-accounting-contract.md`.

## Seguridad y acceso

- Cerrado por defecto: `security.RequireLoginMiddleware` exige sesión salvo
  `LOGIN_EXEMPT_URLS`; `ModuleRoleAccessMiddleware` por prefijo de URL y rol;
  gate de ubicación (`LocationVerificationMiddleware`); bitácora de actividad.
- La app entra por `movil.middleware.MovilTokenAuthMiddleware`, colocado antes
  de `RequireLoginMiddleware`; solo login, refresh y archivos firmados son
  anónimos.
- Roles efectivos = rol base + módulos concedidos
  (`security.access_policy.roles_efectivos`).

Fuente: `docs/tecnica/arquitectura.md` §6–7; `CristecnoViajes_SRL/settings.py`.

## Datos e infraestructura

| Pieza | Rol | Regla |
| --- | --- | --- |
| PostgreSQL | Única fuente de verdad | Todo lo contable y auditable |
| Redis | DB 0 cola Django Q2 · DB 1 caché y sesiones `cached_db` | Volátil; nunca estado de negocio |
| Almacenamiento S3-compatible privado | Comprobantes, PDFs, exportaciones | URL firmada; dueño en BD |
| Worker Django Q2 | Correos, PDFs, exportaciones, alertas, import 623 | Encolar en `on_commit`; idempotente |

Fuente: `docs/architecture/redis-and-q2.md`; `docs/architecture/storage.md`;
`docs/tecnica/arquitectura.md` §9.

## Integraciones externas (verificadas en código)

- **SMTP** para correos (backend configurable; consola en demo y QA) —
  `CristecnoViajes_SRL/settings.py` (`EMAIL_BACKEND`).
- **IPinfo** para GeoIP de la bitácora, con caché 24 h — `usuarios/geoip.py`,
  `usuarios/services/__init__.py`.
- **Google Places (API v1)** desde el servidor para hoteles —
  `core/google_places.py`.
- **Expo / EAS** para builds de la app — `mobile/eas.json`.
- Expo Push: endpoint para guardar el token listo; la app aún no lo envía y **el envío no está implementado** (ver
  `case-notes.md`, «Estado actual»).
- DGII: **sin integración en línea**; se generan TXT/XLSX y la presentación es
  manual — `docs/architecture/dgii-cycle.md` §1.
