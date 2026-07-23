<!-- portfolio-content/omsta/architecture/data-flow.md -->

# Flujos de datos de extremo a extremo — OMSTA

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3`
> Flujos reales derivados de servicios y modelos existentes
> (`reservas/services/`, `contabilidad/services/`, `ledger/services/posting.py`,
> `security/`) y del incidente documentado de la reserva #72. No son ejemplos
> inventados.

---

## Flujo 1 — Cobro de una reserva → asiento contable → Cuentas por Cobrar

**Historia:** un asesor cobra una reserva; el pago se valida, se convierte en
asiento de doble partida y actualiza los tableros de cobros y CxC.

Servicios involucrados (verificados en el grafo/baseline):
`reservas.services.reservations.create_reservation_payment` →
`ledger.services.posting.post_customer_payment` (convierte pagos completados en
asientos, aplica conversión de divisas, maneja excedentes como depósitos) →
`reservas.services.payment_health.build_payment_health` (saldos, vencimientos,
alertas) → dashboard / `contabilidad` (CxC).

```mermaid
sequenceDiagram
    actor Asesor
    participant UI as UI Reservas
    participant Svc as reservas.services (pago)
    participant Pago as Pago (idempotente)
    participant Post as ledger posting
    participant GL as JournalEntry/Line
    participant PG as PostgreSQL
    participant Dash as Dashboard / CxC

    Asesor->>UI: Registra pago (medio, monto, moneda)
    UI->>Svc: create_reservation_payment (transaction.atomic)
    Svc->>Pago: crea Pago + PaymentAllocation (valid())
    Svc->>Post: post_customer_payment (snapshot de tasa)
    Post->>GL: Débito Banco / Crédito Anticipos (2201)
    GL->>PG: asiento balanceado (D=C, diferencia 0.00)
    Svc-->>UI: recibo (PDF) + estado de cobro
    Dash->>PG: recalcula cobros, saldo por cobrar, alertas
```

**Detalle contable real (del incidente #72):** una reserva **no facturada**
registra el cobro completo como **anticipo de clientes** (pasivo, cuenta `2201`),
con débito en `1012` Banco. Al emitir la factura, el sistema **reclasifica**
automáticamente de anticipos a cuentas por cobrar. No hay asiento manual.

---

## Flujo 2 — Descuento sobre una reserva ya pagada → crédito a favor del cliente

**Historia (caso real, reserva #72):** el cliente pagó el total; días después se
aplica un 3 % de descuento. Como el dinero ya estaba en caja, el descuento deja
un **excedente = crédito a favor**. El sistema lo cuenta bien y ahora **avisa**.

```mermaid
sequenceDiagram
    actor Asesor
    participant UI as Editar reserva
    participant Svc as servicio de dinero
    participant Res as Reserva (total)
    participant Rec as Recibo
    participant Aviso as Aviso al guardar

    Asesor->>UI: Total 40.264,00 → aplica 3% → 39.056,08
    UI->>Svc: guarda edición (transaction.atomic)
    Svc->>Res: nuevo total < ya cobrado
    Svc->>Aviso: "quedaron 1.207,92 como crédito a favor..."
    Svc->>Rec: recibo declara monto realmente recibido + excedente
    Note over Svc,Rec: Corrección aplicada en PR fix/recibo-excedente-reserva-72
```

**Qué se reparó (evidencia: `docs/incidentes/2026-07-20-reserva-72-excedente.md`):**
1. El descuento se aplicaba "en silencio" → ahora aparece un aviso explícito al
   guardar si el nuevo total queda por debajo de lo ya cobrado.
2. El recibo declaraba menos de lo recibido → ahora muestra el monto real, el
   desglose (aplicado vs excedente) y un bloque "Crédito a favor del cliente".
3. Herramienta de diagnóstico de solo lectura:
   `python manage.py diagnosticar_excedente_reserva <n.º de reserva>`.

Este flujo es la mejor evidencia de **resolución de un problema real de negocio**:
no se "arregló un bug", se corrigió cómo el sistema comunica dinero al usuario.

---

## Flujo 3 — Autenticación → acceso por rol/sucursal/módulo

**Historia:** cada request autenticado pasa por una cadena de middleware que
impone login, ubicación y acceso por módulo antes de llegar a la vista.

Cadena real (`settings.MIDDLEWARE` + `security/`):
`RequireLoginMiddleware` → `LocationVerificationMiddleware` (gate de ubicación,
activo en prod) → `ModuleRoleAccessMiddleware` (403 si el rol no cubre el prefijo
de URL) → `CurrentUserMiddleware` (auditoría) → `ActivityTrackingMiddleware`.

```mermaid
sequenceDiagram
    actor Usuario
    participant Req as Request
    participant Login as RequireLogin
    participant Loc as LocationGate
    participant Mod as ModuleRoleAccess
    participant Pol as access_policy
    participant View as Vista
    participant Audit as UserActivityLog

    Usuario->>Req: GET /contabilidad/pagos/
    Req->>Login: ¿autenticado?
    Login->>Loc: ¿ubicación verificada? (prod)
    Loc->>Mod: prefijo /contabilidad/pagos/ → roles requeridos
    Mod->>Pol: user_has_role(user, roles)
    Note over Pol: superuser o rol 'superadmin' → todos los roles
    alt sin permiso
        Pol-->>Usuario: 403 PermissionDenied
    else con permiso
        Pol->>View: continúa
        View->>Audit: registra actividad
    end
```

Defensa en profundidad: el middleware **complementa** (no reemplaza) los guards por
vista (`RoleAccessMixin`/`role_required`). La visibilidad de frontend nunca es el
único control.

---

## Flujo 4 (bonus) — Exportación asíncrona con Django Q2

**Historia:** una exportación pesada (p.ej. XLSX de pagos, reporte DGII) no bloquea
el request: se encola y se procesa en el worker, con estado visible en el *tray* de
operaciones.

```mermaid
flowchart LR
    UI["Vista solicita export"] -->|schedule_django_q_job| Q["Redis (cola Q2, DB0)"]
    UI -->|"*Job durable en PostgreSQL"| PG[("PostgreSQL")]
    Q --> W["Worker qcluster"]
    W --> ART["Artefacto (Django storage / S3)"]
    W --> PG
    OPS["operations feed<br/>estado + reintento + descarte"] --> PG
```

`operations/lifecycle.py::schedule_django_q_job` centraliza el agendado;
`transaction.on_commit(...)` asegura que el job vea datos ya escritos; el estado
durable vive en PostgreSQL y la experiencia es compartida (no un panel por app).
