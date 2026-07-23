<!-- portfolio-content/omsta/demo/demo-script.md -->

# Guion de demostración — OMSTA

> Tres versiones según la audiencia. Cada paso indica página, acción, qué explicar,
> qué decisión técnica destacar, qué captura corresponde y qué **evitar** mostrar.
> Login demo: `demo_portafolio` (superadmin) en `http://127.0.0.1:8000`.
> **Evitar en todas:** URL/entorno local visible como "producción", el panel
> "Empresa y DGII" con datos fiscales, PDFs de recibo con datos de empresa, DevTools,
> y disparar exportaciones (requieren worker).

---

## Demo de 60 segundos (reclutador con poco tiempo)

**Objetivo:** demostrar alcance y madurez en una frase visual.

| Tiempo | Página | Acción / qué decir | Captura |
|---|---|---|---|
| 0:00–0:20 | `/` Dashboard | «OMSTA es un ERP en producción para una agencia de viajes. En una vista: reservas, cobros, comisión, saldo por cobrar y alertas operativas.» | `01` |
| 0:20–0:40 | `/reservas/reserva/63/` | «Cada reserva integra estado, cobros, comisión, facturación y auditoría en una pantalla.» Destacar: capa de servicios detrás. | `04` |
| 0:40–1:00 | `/ledger/entries/` | «Y detrás hay contabilidad de doble partida real: cada operación genera un asiento balanceado. No es un CRUD.» | `15` |

**Decisión técnica a destacar:** doble partida real + capa de servicios para el dinero.

---

## Demo de 3 minutos (entrevista técnica)

**Objetivo:** mostrar el flujo dinero de extremo a extremo y una decisión de arquitectura.

1. **Dashboard (0:00–0:30)** — `/`. Alcance del sistema y alertas accionables. *(cap. 01)*
2. **Alta de reserva (0:30–1:00)** — `/reservas/nueva/hotel/`. Formulario por pasos con
   reglas de negocio (reserva grupal ≥10 hab.). «Validación de UI siempre respaldada
   por servidor.» *(cap. 05)*
3. **Detalle de reserva (1:00–1:30)** — `/reservas/reserva/63/`. Estado, % pagado,
   comisión, balance; pestañas de pagos/facturación/historial. *(cap. 04)*
4. **Cuentas por Cobrar (1:30–2:10)** — `/contabilidad/cuentas-por-cobrar/`. Cartera,
   comisión efectiva, cobrado neto, pendiente. «El cobro de la reserva ya está aquí.» *(cap. 10)*
5. **Libro diario (2:10–2:50)** — `/ledger/entries/`. Asiento balanceado (D=C,
   diferencia 0.00), origen (Pago #…), estado Publicado. **Decisión:** `ledger`
   neutral + motor de posteo por documento en `contabilidad`; rompí el ciclo de
   dependencias sin romper reglas. *(cap. 15)*
6. **Cierre (2:50–3:00)** — «Reserva → cobro → asiento → reporte fiscal, sin
   re-digitación, en varias monedas.»

**Evitar:** entrar a exportaciones/reportes que encolan jobs; el panel Empresa/DGII.

---

## Demo de 7 a 10 minutos (cliente o entrevista profunda)

**Objetivo:** contar la historia completa de producto + arquitectura + mantenimiento.

### Acto 1 — La operación (0:00–2:30)
- **Dashboard** `/` *(01)*: KPIs y alertas. «Así arranca el día un administrador.»
- **CRM** `/crm/` *(cap. 07 / secundaria 08)*: «Los clientes del CRM son los mismos
  de reservas y cobros; no es una libreta aparte.»
- **Alta de reserva** `/reservas/nueva/hotel/` *(05)*: formulario por pasos, reglas
  de negocio, búsqueda de cliente.

### Acto 2 — El dinero (2:30–6:00)
- **Detalle de reserva** `/reservas/reserva/63/` *(04)*: estado, comisión, balance,
  pestañas, historial de auditoría.
- **Caja & Pagos** `/contabilidad/pagos/` *(09)*: registro de cobros; regla de
  comprobante (solo efectivo exento).
- **Cuentas por Cobrar** `/contabilidad/cuentas-por-cobrar/` *(10)* y **por Pagar**
  `/contabilidad/cuentas-por-pagar/` *(11)*: el circuito comercial completo.
- **Libro diario** `/ledger/entries/` *(15)*: doble partida balanceada. **Historia
  de la reserva #72**: descuento sobre reserva ya pagada → crédito a favor; cómo el
  sistema lo contabiliza (anticipos 2201) y cómo corregí el aviso y el recibo.

### Acto 3 — Escala, seguridad y madurez (6:00–9:00)
- **Divisas** `/divisas/` *(12)*: multimoneda con snapshots de tasa.
- **Sucursales** `/sucursales/` *(13)*: multisucursal con permisos por rol.
- **Auditoría** `/usuarios/activity-log/` *(14)*: «Con esto reconstruí la cronología
  exacta de la reserva #72.»
- **Nómina** `/nomina/` *(11 en manifest)*: RRHH con retenciones AFP/SFS/ISR.
- **Móvil** *(50, 52)*: los flujos clave funcionan en móvil.

### Cierre (9:00–10:00)
- «Es un sistema en producción, con 891 commits en ~16 meses, contabilidad formal,
  cumplimiento fiscal dominicano y deuda técnica pagada con pruebas. Está en la fase
  de mantenerse bien, no de recién funcionar.»
- CTA según audiencia (empleo / cliente).

**Evitar:** exportaciones que encolan jobs sin worker; el panel Empresa/DGII con
datos fiscales; cualquier PDF de recibo con datos de empresa; hablar de métricas de
negocio no confirmadas (ventas, ahorro, usuarios reales).
