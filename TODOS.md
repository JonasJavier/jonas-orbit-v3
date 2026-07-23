# TODOS — Jonás Orbit v3

Las tareas activas viven en los **Next Steps** del
[plan aprobado](docs/plans/jonas-orbit-v3-mission-endurance.md). Este archivo
captura solo lo diferido y lo operativo pendiente.

## Pendiente de decisión (paso 10 del plan)

- [ ] **Dominio propio** — decidir y configurar antes del deploy público de F1A.
- [ ] **Destino del deploy v2** — inventariar URLs públicas activas; si las hay,
      301 hacia v3 o reemplazo en el mismo proyecto Cloudflare.
- [ ] **Remoto GitHub + secrets** — crear repo remoto, configurar
      `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` para el deploy desde CI
      (el workflow actual solo valida; el job de deploy se añade con los secrets).

## Experimentos aparcados (no son deuda; con condiciones de entrada)

- [Navegación adaptativa por intención](docs/experiments/intention-adaptive-navigation.md)
  — DEFERRED/PARKED. Solo se reconsidera tras F2 completa + analytics de
  eventos + hipótesis falsable + nueva aprobación explícita.

## Trabajo diferido (con condiciones de entrada)

- [Pruebas visuales de regresión](docs/deferred/visual-regression-testing.md)
  — DEFERRED, candidata a F1B/F2. Solo tras F1A desplegada y visualmente
  estable; en main/programado, nunca por PR; DOM con `?no3d=1` primero.

## Operativo menor

- [ ] Reinstalar `@testing-library/user-event` cuando lleguen los tests de
      interacción de formulario (A12/A26) — se retiró en setup por la regla de
      cero deps sin uso.
- [ ] Fuentes definitivas (Space Grotesk + JetBrains Mono locales, subconjunto
      crítico) — trabajo visual de F1A; hoy hay pila del sistema.
