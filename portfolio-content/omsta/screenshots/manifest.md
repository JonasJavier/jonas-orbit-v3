<!-- portfolio-content/omsta/screenshots/manifest.md -->

# Manifest de capturas — OMSTA

> **Fechas de captura:** 2026-07-21 (base) y 2026-07-22 (profundidad: nómina,
> sucursales, usuarios, CRM). **HEAD:** `da5a86b3`. Origen: `http://127.0.0.1:8000`
> (desarrollo local, usuario demo `demo_portafolio`).
> Playwright a **1440×900** (desktop) y **390×844** (mobile). Datos **sintéticos** y
> **anonimizados** (ver `../demo/demo-data.md`).

## Resumen

- **Raw:** 38 capturas en `raw/` (34 desktop + 4 mobile).
- **Principal (sanitized):** 16 en `sanitized/` — narrativa del caso.
- **Secundarias:** 22 en `secondary/`.
- **Anonimización:** PII neutralizada en BD **antes** de capturar; no hizo falta
  redacción a nivel de píxel.

**Pilares:** **P1** Operación centralizada · **P2** Gestión integral de reservas ·
**P3** CRM conectado · **P4** Motor financiero-contable · **P5** Multimoneda/
multisucursal · **P6** Seguridad, roles y auditoría · **P7** Nómina.

> **Dato confirmado por Jonás (2026-07-22):** el negocio opera **2 sucursales
> reales: Santo Domingo y Santiago**. Los datos de sucursales en dev son
> sintéticos (p.ej. «Sucursal Centro Tutorial», código `TUT-SUC-SDQ`), pero la
> capacidad multisucursal que muestran es la que soporta esa operación real.

---

## Capturas principales (sanitized) — orden narrativo

### 01 · Dashboard — Panel ejecutivo `[P1]`
- **Archivo:** `01-dashboard-panel-ejecutivo.png` · **URL:** `/`
- **Muestra:** KPIs (reservas, cobros, comisión, saldo por cobrar RD$193.855),
  alertas operativas accionables, sidebar del ERP completo.
- **Por qué:** primera impresión; resume el alcance en una vista. **Rol:** gerencia.
- **Alt:** «Panel ejecutivo de OMSTA con KPIs de reservas, cobros y cuentas por
  cobrar, y alertas operativas».
- **Caption:** «Panel ejecutivo: la operación diaria —reservas, cobros, comisiones y
  saldos— en una sola vista, con alertas accionables.»

### 02 · Reservas — Listado `[P2]`
- **Archivo:** `03-reservas-listado.png` · **URL:** `/reservas/`
- **Muestra:** listado con filtros, búsqueda y estados de cobro. **Rol:** asesor.
- **Alt:** «Listado de reservas de OMSTA con filtros y estados de cobro».
- **Caption:** «Gestión de reservas: búsqueda, filtros por estado y acceso al detalle.»

### 03 · Reserva — Detalle (cockpit) `[P2][P4]`
- **Archivo:** `04-reserva-detalle.png` · **URL:** `/reservas/reserva/63/`
- **Muestra:** estado, % pagado, total/pagado/comisión/balance, pestañas (Resumen,
  Alojamiento, Pagos, Facturación, Expediente, Historial), ficha del cliente.
- **Alt:** «Detalle de reserva con indicadores financieros, pestañas y cliente».
- **Caption:** «El detalle de reserva reúne estado, cobros, comisión, facturación y
  auditoría en un solo lugar.»

### 04 · Reserva — Alta (formulario por pasos) `[P2]`
- **Archivo:** `05-reserva-nueva-hotel-form.png` · **URL:** `/reservas/nueva/hotel/`
- **Muestra:** asistente multi-sección con reglas de negocio (grupal ≥10 hab.,
  Day/Night Pass) y búsqueda de cliente/empresa.
- **Alt:** «Formulario de alta de reserva con navegación por secciones».
- **Caption:** «Alta de reserva por pasos, con reglas de negocio integradas.»

### 05 · CRM — Clientes y empresas `[P3]`
- **Archivo:** `07-crm-clientes-listado.png` · **URL:** `/crm/`
- **Muestra:** entidades del CRM con búsqueda y acciones. **Rol:** asesor.
- **Alt:** «Listado de entidades del CRM de OMSTA».
- **Caption:** «CRM conectado: los clientes del CRM son los mismos de reservas y cobros.»

### 06 · CRM — Ficha de cliente `[P3]`
- **Archivo:** `08-crm-cliente-detalle.png` · **URL:** `/crm/entities/client/27/`
- **Muestra:** ficha completa del cliente (datos, documentos, notas, actividad).
- **Por qué:** profundidad del CRM: expediente por cliente, no solo un listado.
- **Alt:** «Ficha de cliente en el CRM de OMSTA con documentos y notas».
- **Caption:** «Cada cliente tiene su expediente: datos, documentos, notas y su
  relación con reservas y pagos.»

### 07 · Contabilidad — Caja & Pagos `[P4]`
- **Archivo:** `09-contabilidad-caja-pagos.png` · **URL:** `/contabilidad/pagos/`
- **Muestra:** cobros del período, medios de pago, comprobantes.
- **Alt:** «Módulo de caja y pagos de OMSTA».
- **Caption:** «Caja & Pagos: registro de cobros con reglas de comprobante.»

### 08 · Contabilidad — Cuentas por Cobrar `[P4]`
- **Archivo:** `10-cuentas-por-cobrar.png` · **URL:** `/contabilidad/cuentas-por-cobrar/`
- **Muestra:** cartera total, comisión efectiva (11,72 %), cobrado neto, pendiente,
  toggles de período y filtros.
- **Alt:** «Cuentas por Cobrar con tarjetas de cartera, comisión y saldos».
- **Caption:** «Cuentas por Cobrar: cartera, comisión efectiva y saldos con filtros.»

### 09 · Ledger — Libro diario (doble partida) `[P4]`
- **Archivo:** `15-ledger-libro-diario.png` · **URL:** `/ledger/entries/`
- **Muestra:** asientos balanceados (D=C, diferencia 0.00), estados
  Publicado/Borrador, origen trazable (Pago #…).
- **Por qué:** **el diferenciador** — contabilidad real, no un CRUD.
- **Alt:** «Libro diario de OMSTA con asientos balanceados de doble partida».
- **Caption:** «Cada operación genera un asiento balanceado, con estado de
  publicación y trazabilidad al documento de origen.»

### 10 · Nómina — Dashboard `[P7]`
- **Archivo:** `19-nomina.png` · **URL:** `/nomina/` *(recapturada 2026-07-22 con
  datos demo sembrados)*
- **Muestra:** panel de nómina con empleados y períodos activos.
- **Alt:** «Dashboard de nómina de OMSTA».
- **Caption:** «Nómina integrada al ERP: empleados, períodos y retenciones de ley.»

### 11 · Nómina — Detalle de período `[P7]`
- **Archivo:** `31-nomina-periodo-detalle.png` · **URL:** `/nomina/periodos/14/`
- **Muestra:** período abierto (jul-2026) con flujo guiado (crear → generar →
  revisar/pagar → cerrar), totales devengado/deducciones/neto ($592.088,47 /
  $183.612,83 / $408.475,64), 10 empleados, acciones masivas de pago, y el aviso de
  integración contable de nómina.
- **Por qué:** la nómina por dentro: cálculo real con retenciones y conexión al ledger.
- **Alt:** «Detalle de un período de nómina con totales devengado, deducciones y neto».
- **Caption:** «Un período de nómina: generación, revisión y pago con totales de
  devengado, deducciones (AFP/SFS/ISR) y neto — conectado a la contabilidad.»

### 12 · Sucursales — Listado `[P5]`
- **Archivo:** `21-sucursales.png` · **URL:** `/sucursales/`
- **Muestra:** sucursales con estados y estructura.
- **Contexto real (confirmado):** el negocio opera 2 sucursales — Santo Domingo y
  Santiago; el sistema las modela con departamentos, membresías y permisos.
- **Alt:** «Gestión de sucursales en OMSTA».
- **Caption:** «Multisucursal: la agencia opera Santo Domingo y Santiago sobre esta
  estructura de sucursales, departamentos y roles.»

### 13 · Sucursal — Detalle `[P5]`
- **Archivo:** `33-sucursal-detalle.png` · **URL:** `/sucursales/170/`
- **Muestra:** cockpit de sucursal: badges (Activa, Principal, Fuera de horario),
  KPIs (empleados, departamentos, años operando), tarjetas de gestión (equipo,
  departamentos, horarios, métricas, documentos con vencimientos, reporte de
  ventas) y mapa.
- **Alt:** «Detalle de una sucursal con equipo, departamentos, horarios y métricas».
- **Caption:** «Cada sucursal es una unidad operativa completa: equipo, horarios,
  métricas, documentos y ventas.»

### 14 · Usuarios — Edición con roles `[P6]`
- **Archivo:** `35-usuario-editar-roles.png` · **URL:** `/usuarios/users/363/edit/`
- **Muestra:** formulario de usuario (acceso, rol, cuenta activa, foto, documentos
  del empleado) dentro del panel administrativo (Usuarios, Permisos, Sucursales,
  Empresa y DGII, Retenciones).
- **Alt:** «Formulario de edición de usuario con rol y acceso al panel administrativo».
- **Caption:** «Gestión de usuarios: acceso, rol y relación laboral en un solo
  formulario; los permisos reales se imponen en el servidor.»

### 15 · Auditoría — Registro de actividad `[P6]`
- **Archivo:** `25-auditoria-actividad.png` · **URL:** `/usuarios/activity-log/`
- **Muestra:** bitácora de acciones por usuario.
- **Alt:** «Registro de actividad de usuarios en OMSTA».
- **Caption:** «Auditoría de actividad: con esta bitácora se reconstruyó la
  cronología exacta del caso de la reserva #72.»

### 16 · Mobile — Dashboard `[P1]`
- **Archivo:** `50-mobile-dashboard.png` · **URL:** `/` (390×844)
- **Alt:** «Panel de OMSTA en vista móvil».
- **Caption:** «Responsive: el panel ejecutivo se adapta a móvil sin perder KPIs.»

---

## Capturas secundarias (secondary/)

| ID | Archivo | Módulo | Qué muestra | Historia |
|---|---|---|---|---|
| S1 | `06-reservas-servicios-productos.png` | Reservas | Catálogo de servicios/productos | P2 |
| S2 | `11-cuentas-por-pagar.png` | Contabilidad | Cockpit de CxP (obligaciones a suplidores) | P4 |
| S3 | `12-contabilidad-pago-reserva.png` | Contabilidad | Pago asociado a una reserva (historia #72) | P4 |
| S4 | `13-notas-cliente-ar.png` | Contabilidad | Notas de crédito/débito a clientes (AR) | P4 |
| S5 | `14-notas-proveedor-ap.png` | Contabilidad | Notas a proveedores (AP) | P4 |
| S6 | `16-entrada-diario-form.png` | Contabilidad | Formulario de entrada de diario | P4 |
| S7 | `17-plan-de-cuentas-coa.png` | COA | Plan/catálogo de cuentas | P4 |
| S8 | `18-banco-cuentas.png` | Banco | Cuentas bancarias y transacciones | P4 |
| S9 | `20-divisas-tasas.png` | Divisas | Monedas y tasas de cambio | P5 |
| S10 | `22-documentos-politicas.png` | Documentos | Configuración de documentos y políticas | P2 |
| S11 | `23-reportes.png` | Reportes | Report registry / datasets | P4 |
| S12 | `24-usuarios-roles.png` | Usuarios | Listado de usuarios | P6 |
| S13 | `27-tutoriales-centro.png` | Tutoriales | Centro de tutoriales in-app | P1 |
| S14 | `28-configuracion-empresa.png` | Config | Panel administrativo (resumen) | P6 |
| S15 | `29-nomina-empleados.png` | Nómina | Gestión de empleados | P7 |
| S16 | `30-nomina-periodos.png` | Nómina | Listado de períodos de nómina | P7 |
| S17 | `32-nomina-retenciones.png` | Nómina | Retenciones legales (AFP/SFS/ISR) configurables | P7 |
| S18 | `34-sucursal-reporte.png` | Sucursales | Reporte comercial de una sucursal | P5 |
| S19 | `36-crm-empresa-detalle.png` | CRM | Ficha de empresa (RNC ficticio) | P3 |
| S20 | `51-mobile-reservas-listado.png` | Reservas (móvil) | Listado de reservas en móvil | P2 |
| S21 | `52-mobile-reserva-detalle.png` | Reservas (móvil) | Detalle de reserva en móvil | P2 |
| S22 | `53-mobile-cuentas-por-cobrar.png` | Contabilidad (móvil) | CxC en móvil | P4 |

Todas: datos sintéticos, sin anonimización pendiente.

## Cambios de selección (2026-07-22)

A petición de Jonás se profundizó en **nómina, sucursales, CRM y usuarios**:

- **Entraron a principal:** `08-crm-cliente-detalle` (antes secundaria),
  `31-nomina-periodo-detalle`, `33-sucursal-detalle`, `35-usuario-editar-roles`;
  `19-nomina` recapturada con datos demo sembrados.
- **Pasaron a secundaria** (siguen disponibles): `11-cuentas-por-pagar`,
  `12-contabilidad-pago-reserva`, `20-divisas-tasas`, `52-mobile-reserva-detalle`.
- Racional: mantener el máximo de 16 principales equilibrando los 7 pilares
  (antes el bloque contable tenía 5 de 16; ahora P3/P5/P6/P7 tienen profundidad
  real, no solo portadas).

## Descartadas

- **Operaciones (`/operaciones/feed/`):** fragmento HTMX del *tray* (estado vacío),
  no página completa. Documentado en `../architecture/data-flow.md` (Flujo 4).

## Top 5 recomendadas

1. `01-dashboard-panel-ejecutivo` — impacto y alcance en una imagen.
2. `15-ledger-libro-diario` — el diferenciador (doble partida real).
3. `04-reserva-detalle` — profundidad de producto en una pantalla.
4. `31-nomina-periodo-detalle` — cálculo de nómina real conectado a contabilidad.
5. `33-sucursal-detalle` — la sucursal como unidad operativa completa.
