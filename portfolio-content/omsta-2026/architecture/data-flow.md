<!-- portfolio-content/omsta-2026/architecture/data-flow.md · 2026-09-25 · commit 3f5cea73 -->
# OMSTA — flujos de datos de punta a punta

Rutas de archivo relativas a la raíz del repo OMSTA. Diagramas:
`diagrams/flujo-reserva-cobro-fiscal.mmd` y `diagrams/flujo-movil-cobro.mmd`.
Todo lo que sigue se leyó en el código o en la doc citada (comprobado), salvo
lo marcado como inferencia.

---

## (a) Reserva → cobro → verificación → asiento → reporte fiscal DGII

### 1. Reserva

- Alta desde la web por los servicios de `reservas/services/`
  (`reservation_forms.py`, `hotel_reservations.py`, `flights.py`,
  `cruises.py`, `packages.py`, `insurance.py`, `other_service.py`…); la app
  usa los mismos vía `movil/services/alta_reserva.py`.
- Al guardar, la reserva crea o actualiza su **CxP al suplidor** sin importar
  contabilidad directamente: `reservas/services/reservations.py` llama a
  `upsert_reservation_payable` de `core/contracts/accounting.py`, cuya
  implementación registra `contabilidad/reservas_contracts.py` en
  `ContabilidadConfig.ready()`.
  Fuente: `docs/architecture/reservas-accounting-contract.md`.

### 2. Cobro (registro del abono)

- Vista web `PaymentCreateView` (`contabilidad/views/payments.py`) →
  `PaymentForm` (`contabilidad/forms`) →
  **`register_customer_payment`**
  (`contabilidad/services/receivables/payment_registration.py`), «la única
  puerta para registrar un abono desde una pantalla». En una transacción:
  - permiso (`user_can_manage_payment`);
  - anti-duplicado por `idempotency_key` (constraint parcial
    `uniq_pago_idempotency_key` en `reservas/models/payments.py`) o por
    ventana corta (`find_duplicate_customer_payment`);
  - el pago nace **`IN_REVIEW` («Por verificar»)**
    (`resolve_registered_payment_state` en `reservas/services/reservations.py`);
  - comprobantes (`core/attachments.persist_payment_attachments`) al
    almacenamiento privado;
  - movimiento bancario (`CustomerPaymentBankService`,
    `contabilidad/services/receivables/bank_sync.py`) y plan de cuotas
    (`reservas/services/payment_plans.sync_payment_plan_from_form`);
  - aviso a contabilidad con `transaction.on_commit` →
    `usuarios/services/notifications.notify_accounting_payment_received`.
- Un pago `IN_REVIEW` **no tiene asiento, no tiene recibo y no mueve el
  saldo**. Fuente: docstring de `contabilidad/services/payment_review.py`.

### 3. Verificación (contabilidad)

- `PaymentApplyView` (`contabilidad/views/payments.py`) →
  **`apply_customer_payment`** (`contabilidad/services/payment_review.py`):
  `IN_REVIEW` → `COMPLETED`, recalcula lo aplicado, genera el asiento,
  dispara el recibo del cliente y avisa a reservas. Idempotente; si el
  posteo falla, revierte todo y el pago sigue «Por verificar».
- Rechazo: `reject_customer_payment` → `FAILED` con motivo; nunca movió saldo.

### 4. Asiento contable (ledger)

- `post_customer_payment_if_needed` (`contabilidad/services/ledger/payments.py`)
  bloquea el pago y, si no tiene asiento, llama a
  `post_customer_payment` (`contabilidad/services/posting/customer_payments.py`)
  → `JournalEntry` en `ledger/models.py`. Antes de facturar, el cobro va a
  **anticipos de clientes (2201)**.
- `JournalEntry.post()` (`ledger/models.py`) bloquea la publicación en un
  período contable cerrado.
- Al emitir la factura con NCF (`contabilidad/services/invoice_issuance.py`
  `save_new_invoice_with_ncf`; rangos en `contabilidad/services/ncf_sequences.py`)
  se publica el **paquete contable atómico**
  (`contabilidad/services/posting/invoice_package.py`
  `publish_invoice_accounting_package`): venta (Dr CxC / Cr ingresos + ITBIS),
  costo y CxP, anticipo de proveedor, reclasificación del anticipo del cliente
  (Dr 2201 / Cr CxC) y cobros en borrador.
- Invariantes: CxC nunca acreedora, CxP nunca deudora, 2201 en cero tras
  facturar. Fuente: `docs/tecnica/arquitectura.md` §8.

### 5. Reporte fiscal DGII (606 / 607)

- **607 (ventas)**: al contabilizar la factura,
  `contabilidad/services/posting/invoices.py` congela el snapshot fiscal con
  `freeze_invoice_607_snapshot` (`contabilidad/services/dgii/core.py`). Filas,
  diagnósticos y exportación en `contabilidad/reporting/dgii/`.
- **606 (compras)**: el comprobante del suplidor / factura de CxP congela su
  snapshot con `freeze_ap_bill_606_snapshot` o
  `freeze_reservation_supplier_bill_606_snapshot`
  (`contabilidad/services/posting/ap.py`,
  `contabilidad/services/payables/reservation_bills.py`,
  `contabilidad/models/ap.py`). Filas y exportación en
  `contabilidad/reporting/dgii_606/`.
- Ejecución por el registro genérico de reportes
  (`contabilidad/reporting/dgii/registry.py` → `reports/views.py`):
  libro interno XLSX o **TXT oficial**, este último solo si pasa las
  validaciones; cada intento deja auditoría. La presentación en la DGII es
  **manual**. Fuente: `docs/architecture/dgii-cycle.md` §1–3.
- Principio: el documento de negocio manda; el asiento confirma y concilia,
  no inventa filas fiscales. Fuente: mismo doc §2.

---

## (b) Login móvil → JWT → cobro con comprobante → verificación en contabilidad

### 1. Login y token

- App: `mobile/app/login.tsx` → `mobile/src/api/endpoints.ts` /
  `cliente.ts` → `POST /api/movil/v1/auth/login/`.
- Backend: `movil/views/auth.py` `LoginView` →
  `movil/services/autenticacion.py` `iniciar_sesion`, que reutiliza los
  controles del login web (throttling por identificador e IP, backend
  usuario-o-correo, bitácora `UserActivityLog`) y emite **un par JWT ligado al
  dispositivo** (`movil/authentication.py` `emitir_tokens`; modelo
  `DispositivoMovil` en `movil/models.py`).
- Tokens: access 15 min y refresh 30 días por defecto, rotación con lista
  negra (`SIMPLE_JWT` en `CristecnoViajes_SRL/settings.py`). La app los
  guarda en SecureStore (`mobile/src/auth/almacen.ts`) y protege la reapertura
  con biometría (`mobile/src/auth/biometria.ts`); `cliente.ts` serializa el
  refresh y reintenta la petición original.
- Cada petición: `movil.middleware.MovilTokenAuthMiddleware` (antes de
  `RequireLoginMiddleware`) valida el Bearer; `resolver_dispositivo` rechaza
  tokens de dispositivos revocados o con `auth_version` vieja.
- Ubicación: `POST /api/movil/v1/ubicacion/verificar/` con GPS nativo cuando
  el gate está activo (`docs/operaciones/app-movil.md` §4.5).

### 2. Registro del cobro con comprobante

- App: `mobile/app/reservas/[id]/pagos/nuevo.tsx` + `mobile/src/reservas/FormularioPago.tsx`
  (genera una `idempotency_key` por intento y la reutiliza en reintentos) y
  `mobile/src/reservas/Adjuntos.tsx`.
- Formulario descrito por el servidor: `GET reservas/<pk>/pagos/formulario/`
  (`FormularioPagoView` → `movil/services/pagos.formulario`).
- Comprobante: primero se sube como adjunto temporal a
  `POST reservas/adjuntos/` (`AdjuntoReservaView`, `movil/views/alta.py`);
  el pago referencia sus ids.
- Envío: `POST reservas/<pk>/pagos/` (`PagosReservaView`,
  `movil/views/pagos.py`) → `movil/services/pagos.registrar`:
  1. si la `idempotency_key` ya existe, devuelve el pago con
     `duplicado=true` **antes** de validar (incidente documentado en
     `docs/operaciones/app-movil.md` §6);
  2. traduce el JSON a `PaymentForm` (estado pedido «completed», el servidor
     lo deja «Por verificar»);
  3. llama a **`register_customer_payment`**, el mismo servicio que la web
     (paso (a)2).

### 3. Verificación y aplicación

- La API móvil **no expone aplicar/rechazar** (no hay rutas ni llamadas a
  `apply_customer_payment` en `movil/`; comprobado con grep). Contabilidad
  aplica desde la web: `PaymentApplyView` → `apply_customer_payment` →
  asiento en el ledger → recibo → aviso a reservas (pasos (a)3–4).
- La app ve el resultado en el historial (`GET reservas/<pk>/pagos/`, que
  reutiliza `reservas/services/payment_history.build_payment_history_context`)
  y en avisos (`notificaciones/…`). El recibo se sirve **en vivo** por enlace
  firmado (`movil/archivos.py`, ruta `archivos/<token>/`).
- Push al aplicar: previsto en el plan (Fase 2), **no implementado** en el
  backend a esta fecha.
