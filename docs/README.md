# Documentación — Jonás Orbit v3

Índice de la documentación del repositorio. La fuente de verdad del alcance,
arquitectura, fases, criterios y matriz de tests es el plan aprobado.

## Mapa

| Ruta | Qué contiene |
|---|---|
| [`plans/jonas-orbit-v3-mission-endurance.md`](plans/jonas-orbit-v3-mission-endurance.md) | **Plan aprobado** (fuente de verdad): fases F1A→F3, contenido como entregable, Appendix A (matriz de tests), condición de parada. |
| [`reviews/`](reviews/) | Salidas de revisiones (CEO/diseño/eng/DX, autoplan). |
| [`experiments/`](experiments/) | Hipótesis opcionales que pueden no implementarse nunca. |
| [`deferred/`](deferred/) | Trabajo válido pospuesto hasta cumplir sus condiciones de entrada. |
| [`reference/v2/`](reference/v2/) | Código de v2 SOLO como referencia (excluido de tsconfig y Knip). |

## Reglas

- El plan canónico no se reabre en decisiones ya tomadas; los cambios de alcance
  pasan por él.
- `TODOS.md` (raíz) contiene solo trabajo diferido/aparcado; las tareas activas
  viven en `Next Steps` del plan.
- `experiments/` y `deferred/` no son deuda técnica: requieren aprobación
  explícita antes de entrar al roadmap activo.
