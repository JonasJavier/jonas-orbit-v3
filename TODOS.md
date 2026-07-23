# TODOS — Jonás Orbit v3

Documento principal aprobado: [`docs/plans/jonas-orbit-v3-mission-endurance.md`](docs/plans/jonas-orbit-v3-mission-endurance.md)

Las tareas activas de implementación viven en **Next Steps** del plan principal. Este archivo captura únicamente trabajo diferido, aparcado o condicionado; nada de aquí bloquea el cierre del portafolio.

## Experimentos aparcados

- [Navegación adaptativa por intención](docs/experiments/intention-adaptive-navigation.md) — **DEFERRED / PARKED**. Solo se reconsidera tras F2 completa, analytics de eventos personalizados, hipótesis falsable, métrica definida y nueva aprobación explícita.

## Tareas diferidas con condiciones de entrada

- [Pruebas visuales de regresión](docs/deferred/visual-regression-testing.md) — **DEFERRED**, candidata a F1B/F2. Solo después de que F1A esté desplegada y visualmente estable; ejecución inicial en `main` o programada, nunca como bloqueo de cada PR.

## Tensiones abiertas de `/autoplan` (2026-07-23) — decisiones del dueño

Detalle en [`docs/reviews/autoplan-2026-07-23.md`](docs/reviews/autoplan-2026-07-23.md).
No bloquean el arranque de F1A, pero deben resolverse antes de sus fases indicadas.

- **T1 · Esquema de anclas** — el código usa slug localizado (`/es#proyectos`);
  el plan (A23) citaba `/es#endurance`. Auto-decidido: mantener slug localizado
  (ya construido, mejor UX en ES) y se corrigió el plan. Alternativa válida:
  WorldId canónico (anclas estables entre idiomas). Reabrir solo si se prioriza
  compartibilidad cross-locale. *Antes del freeze visual.*
- **T2 · Distribución/conversión** — añadir workstream: lista de aplicaciones,
  alineación LinkedIn/GitHub, canal directo (WhatsApp/email) junto al formulario,
  bloque de oferta freelance/servicios, CV en EN. Ambos modelos: hallazgo #1.
  *Antes o junto al deploy de F1A.* **Cambia alcance → confirmar.**
- **T3 · Fecha límite del e-commerce + fallback** — si los materiales no llegan
  en el timebox, promover el sitio de fotografía del cliente a 2.º caso completo
  de F1A y bajar el e-commerce a F1B. **Cambia alcance de F1A → confirmar.**
- **T4 · Deliverables del `/plan-design-review`** — el plan lo agenda pero sin
  definición de hecho. Requeridos: escala tipográfica (tokens), sistema de
  espaciado, archetipos por mundo, anatomía de cards (caso vs ficha), máquina de
  estados del formulario, nav persistente móvil, contrato WCAG 2.2 AA, arte del
  starfield, páginas 404/gracias. *Antes del freeze visual de F1A.*
- **T5 · Colisión de color** — acento de Ranger `#ff6f91` == `--color-signal-coral`
  (error). Repintar uno antes de construir el formulario de contacto.
- **T6 · `cosmicName` localizable** — "Tesseracto"/"Gargantúa" viven en
  `content/worlds.data.ts` (estructural, neutral al idioma) pero divergen del EN.
  Mover el nombre visible a la prosa o declararlo invariante. *Antes de F2A.*
- **T7 · Runtime del Worker de contacto** — resolver antes de escribir el handler:
  bindings de Cloudflare en dev/test (`initOpenNextCloudflareForDev`), claves de
  prueba de Turnstile, y la Rate Limiting Rule como IaC (no cabe en `wrangler.jsonc`).
- **`<html lang>` por locale** — hoy fijo en `es` en el layout raíz; mover bajo
  `[locale]` al empezar F2A (barato ahora, caro después). *Antes de F2A.*
- **Docs/CI pendientes** — Lighthouse perfil ligero (`?no3d=1`) por PR y
  comprobación de enlaces en main; job de deploy a Cloudflare cuando existan los
  secrets. El `docs/reviews/eng-review-test-plan-2026-07-21.md` que cita el plan
  no existe: la fuente canónica de tests es el Appendix A.

## Regla de cierre

Los elementos de este archivo:

- No son deuda técnica obligatoria.
- No impiden considerar terminado el proyecto en F2.
- No deben entrar al roadmap activo sin cumplir sus condiciones de entrada.
- Requieren aprobación explícita antes de convertirse en tareas comprometidas.
