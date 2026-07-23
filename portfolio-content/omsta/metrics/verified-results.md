<!-- portfolio-content/omsta/metrics/verified-results.md -->

# Resultados y hallazgos — clasificación por evidencia

> **Fecha:** 2026-07-21 · **HEAD:** `da5a86b3`
> Este documento separa lo **comprobado** de lo **inferido** y de lo que
> **requiere confirmación de Jonás**. Regla del caso: no presentar una inferencia
> como hecho, y **no inventar métricas de negocio**.

---

## A. Resultados comprobados (código / config / git / docs)

Sustentados por archivos concretos, git o la documentación del propio repo:

1. **Sistema empresarial real en producción**, desplegado en Railway (web +
   worker Django Q2 + PostgreSQL + Redis). *Evidencia:* `railpack.json`,
   `docs/agents/deployment-checks.md`, settings de proxy/HSTS.
2. **Contabilidad de doble partida real** (no un CRUD): asientos con débito =
   crédito y diferencia 0.00, estados Publicado/Borrador, perfiles de posteo
   (`PostingProfile`). *Evidencia:* módulo `ledger`, captura `15-ledger-libro-diario`.
3. **Cumplimiento fiscal dominicano (DGII 606/607/608/623)**. *Evidencia:*
   `contabilidad/reporting/dgii_*`, modelos `DGII*`, comandos `seed_dgii_*`.
4. **Multimoneda con snapshots de tasa en el pago**. *Evidencia:* `divisas`
   (`Currency`, `ExchangeRate`, `FXConfig`), `Pago` guarda snapshots de moneda,
   `DEFAULT_USD_DOP_RATE`.
5. **Multisucursal y permisos por rol/sucursal/módulo/propiedad**. *Evidencia:*
   `sucursales` (`SucursalMembership`), `security/access_policy.py`,
   `ModuleRoleAccessMiddleware`, `UsuarioPersonalizado.rol/modulos`.
6. **Auditoría de actividad e integridad de sesión**. *Evidencia:*
   `usuarios` (`UserActivityLog`, `UserPresenceSession`), `ActivityTrackingMiddleware`,
   gate de ubicación (`LocationVerificationMiddleware`, "reporte #83").
7. **Idempotencia y validez de pagos** (`Pago.valid()/voided()`, correcciones,
   reembolsos, asignaciones). *Evidencia:* `reservas/models/payments.py`.
8. **Capa de servicios para flujos de dinero** (posteo, planes de pago, salud de
   pagos, notas AP/AR). *Evidencia:* `contabilidad/services/`, `reservas/services/`,
   `ledger/services/posting.py`.
9. **Procesamiento asíncrono con Django Q2** y experiencia compartida de procesos
   (`operations`). *Evidencia:* `Q_CLUSTER`, `operations/lifecycle.py`, jobs `*Job`.
10. **Generación de documentos PDF** (recibos, reportes) con WeasyPrint/reportlab.
    *Evidencia:* `core.pdf`, `reservas/services/pdf.py`, `railpack.json` (Pango).
11. **Reserva multi-producto** (hotel, vuelo, crucero, paquete, seguro).
    *Evidencia:* modelos verticales en `reservas/models/`.
12. **Suite de pruebas sustancial**: ~1.496 funciones `def test_` (pytest) + Jest.
    *Evidencia:* conteo `grep`; `pytest.ini`, `jest.config.js`.
13. **Mantenimiento en producción con disciplina**: 891 commits en ~16 meses,
    PRs hasta #199, refactors de deuda ejecutados y verificados, incidentes
    documentados. *Evidencia:* `git log`, `docs/architecture/*`, `docs/incidentes/*`.
14. **Corrección de un error real de negocio** (reserva #72: descuento sobre
    reserva ya pagada → crédito a favor): aviso al guardar + recibo que declara el
    monto realmente recibido + herramienta de diagnóstico.
    *Evidencia:* `docs/incidentes/2026-07-20-reserva-72-excedente.md`, PR
    `fix/recibo-excedente-reserva-72`, comando `diagnosticar_excedente_reserva`.

## B. Resultados cualitativos razonables (inferencia profesional — etiquetados)

Interpretaciones fundadas, no medidas:

- **[INFERENCIA]** El sistema centraliza en una sola plataforma lo que muchas
  agencias llevan en hojas de cálculo y sistemas separados (reservas, cobros,
  contabilidad, nómina): el modelo de datos y la UI conectan esos dominios.
- **[INFERENCIA]** La arquitectura de servicios explícitos hizo posible un refactor
  contable mayor (romper el ciclo `ledger↔contabilidad`) sin romper reglas de
  negocio — señal de mantenibilidad real, no decorativa.
- **[INFERENCIA]** El nivel de decisiones (doble partida, idempotencia, snapshots
  de moneda, auditoría, DGII) está por encima de la media de proyectos Django de
  este porte. (Coincide con la "opinión técnica sincera" del grafo del propio repo,
  que es a su vez un juicio, no una medición.)
- **[INFERENCIA]** El producto está en fase "se mantiene bien" más que "recién
  funciona": la deuda se paga en iteraciones y hay documentación de arquitectura viva.

## C. Información que REQUIERE CONFIRMACIÓN de Jonás (no inventar)

No hay evidencia en el repo para estas cifras; **no deben publicarse** sin que
Jonás las confirme con datos reales:

- **[REQUIERE CONFIRMACIÓN]** Nº de sucursales/usuarios/clientes reales en producción
  (los conteos de esta tarea son de la **base de desarrollo**: 19 reservas, 12
  clientes, 5 sucursales — datos sintéticos, no producción).
- **[REQUIERE CONFIRMACIÓN]** Volumen de reservas/pagos procesados en producción.
- **[REQUIERE CONFIRMACIÓN]** Tiempo ahorrado, reducción de errores operativos,
  incremento de ventas, conversión, o cualquier impacto económico.
- **[REQUIERE CONFIRMACIÓN]** Antigüedad en producción y tamaño del equipo usuario.
- **[REQUIERE CONFIRMACIÓN]** Rol exacto y alcance de la contribución de Jonás
  (¿desarrollador único? ¿líder? ¿con apoyo de agentes de código?). El historial
  muestra a `JonasJavier`/`Jonasavage01` como autor de los merges; conviene que él
  precise cómo describir la autoría.
- **[REQUIERE CONFIRMACIÓN]** Nombre real del cliente/negocio y qué nivel de
  identificación quiere hacerse público (el plan autoriza "OMSTA" como marca).

## D. No demostrado / fuera de alcance de esta tarea

- **[NO DEMOSTRADO]** Cobertura de líneas de test (no se ejecutó `coverage`).
- **[NO DEMOSTRADO]** Rendimiento (latencias, throughput): no se midió.
- **[NO DEMOSTRADO]** Uptime / disponibilidad en producción.
- **[NO DEMOSTRADO]** Escala real de datos en producción.

---

### Regla editorial para el caso de estudio

Donde no exista métrica cuantitativa **real y verificable**, usar resultados
**cualitativos honestos** (p.ej. "el negocio opera reservas, cobros y contabilidad
desde una sola plataforma con contabilidad de doble partida y cumplimiento fiscal
dominicano"), nunca porcentajes inventados.
