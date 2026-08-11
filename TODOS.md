# TODOS — Jonás Orbit v3

Documento principal aprobado: [`docs/plans/jonas-orbit-v3-mission-endurance.md`](docs/plans/jonas-orbit-v3-mission-endurance.md)
Pivote de navegación aprobado 2026-08-06: [`docs/plans/sistema-gargantua.md`](docs/plans/sistema-gargantua.md)

Las tareas activas de implementación viven en **Next Steps** del plan principal.
Este archivo conserva decisiones, tensiones y trabajo diferido; cuando un punto se
promueve a ejecución, su paquete activo se enlaza explícitamente aquí.

## Experimentos aparcados

- [Navegación adaptativa por intención](docs/experiments/intention-adaptive-navigation.md) — **DEFERRED / PARKED**. Solo se reconsidera tras F2 completa, analytics de eventos personalizados, hipótesis falsable, métrica definida y nueva aprobación explícita.

## Tareas diferidas con condiciones de entrada

- [Pruebas visuales de regresión](docs/deferred/visual-regression-testing.md) — **DEFERRED**, candidata a F1B/F2. Solo después de que F1A esté desplegada y visualmente estable; ejecución inicial en `main` o programada, nunca como bloqueo de cada PR.

## Tensiones abiertas de `/autoplan` (2026-07-23) — decisiones del dueño

Detalle en [`docs/reviews/autoplan-2026-07-23.md`](docs/reviews/autoplan-2026-07-23.md).
No bloquean el arranque de F1A, pero deben resolverse antes de sus fases indicadas.

- **T1 · CERRADA 2026-08-06 por el pivote.** Ya no hay anclas que decidir: cada
  mundo es una ruta (`/es/proyectos`), no una sección. Se conserva la decisión
  de fondo — **slug localizado con significado**, no `WorldId` en la URL — que
  es exactamente lo que aplica la §2 del pivote. Contexto original:
  el código usa slug localizado (`/es#proyectos`);
  el plan (A23) citaba `/es#endurance`. Auto-decidido: mantener slug localizado
  (ya construido, mejor UX en ES) y se corrigió el plan. Alternativa válida:
  WorldId canónico (anclas estables entre idiomas). Reabrir solo si se prioriza
  compartibilidad cross-locale. *Antes del freeze visual.*
- **T2 · Distribución/conversión** — ✅ RESUELTO 2026-07-23: añadido el workstream
  "Distribución y conversión" al plan (canal directo, oferta freelance, CV EN,
  alineación de perfiles, lista de aplicaciones como criterio de éxito). Ejecutar
  en F1A dentro de WP3 y WP6.
- **T3 · E-commerce** — ✅ RESUELTO 2026-07-23: el e-commerce sale de F1A; F1A
  lanza con OMSTA como único caso completo + 3 fichas. E-commerce y fotografía
  pasan a casos completos de F1B. Gate de Endurance desbloqueado. **Material
  recibido 2026-08-03:** las tres fichas F1A ya existen en
  `content/es/projects/`; Delicaté quedó redactado directamente como caso
  completo F1B con galería y evidencia técnica.
- **T4 · Deliverables del `/plan-design-review`** — ✅ **RESUELTO 2026-08-03.**
  La dirección “instrumentación orbital editorial”, escala tipográfica, sistema
  de espaciado, arquetipos por mundo, cards, máquina de estados del formulario,
  navegación móvil, contrato WCAG, starfield y páginas auxiliares quedaron
  definidos en `docs/design/wp0-visual-contract.md`; WP0-WP2 están implementados.
- **T5 · Colisión de color** — ✅ RESUELTO 2026-08-03: Ranger usa violeta orbital
  `#c58cff`; `--color-signal-coral` conserva `#ff7a66`, reservado para errores y
  señales semánticas del formulario. La identidad del mundo y el error ya no
  compiten.
- **T6 · `cosmicName` localizable** — "Tesseracto"/"Gargantúa" viven en
  `content/worlds.data.ts` (estructural, neutral al idioma) pero divergen del EN.
  Mover el nombre visible a la prosa o declararlo invariante. *Antes de F2A.*
- **T7 · Runtime del Worker de contacto** — ✅ RESUELTO 2026-08-03: contexto de
  Cloudflare inicializado en `next.config.ts`, claves oficiales de prueba y
  contrato Siteverify documentados, y rate limit de zona declarado con Terraform
  en `infra/cloudflare/`. WP3 implementa el Route Handler, Turnstile server-side,
  honeypot y entrega por Resend. Ver `docs/decisions/contact-runtime.md`.
- **`<html lang>` por locale** — hoy fijo en `es` en el layout raíz; mover bajo
  `[locale]` al empezar F2A (barato ahora, caro después). *Antes de F2A.*
- **Docs/CI pendientes** — ✅ RESUELTO 2026-08-03: los tres jobs existen en
  `.github/workflows/ci.yml` (Lighthouse del perfil ligero por PR, enlaces en
  main, deploy a Cloudflare que se omite mientras falten los secrets). El
  `docs/reviews/eng-review-test-plan-2026-07-21.md` que cita el plan no existe:
  la fuente canónica de tests es el Appendix A.

## Tensiones abiertas de la auditoría WP6 (2026-08-03)

- **T8 · SUSTITUIDA 2026-08-06** por la re-línea-base de
  [`sistema-gargantua.md`](docs/plans/sistema-gargantua.md) §8: se retira la
  cifra global única y se sustituye por presupuesto de ruta (JS propio sin
  baseline), presupuesto aparte del chunk 3D y de texturas, y Lighthouse ≥ 90 en
  el perfil ligero como único gate verificado en CI. **Sigue requiriendo que
  Jonás confirme las cifras tras medirlas en G1.** Diagnóstico original:
  El plan fija
  "JS inicial < 150KB gz"; el home carga 231 KiB gz. La causa no es el código de
  Jonás: `/es/privacidad`, casi sin interactividad, ya carga 147.7 KiB gz — el
  baseline de Next 16 + React 19 con App Router consume el 98 % del presupuesto
  por sí solo. Arrastra consigo el LCP (2.6 s contra 2.5 s), porque no lo causa
  la latencia (TTFB 4 ms) ni el hilo principal (TBT 10 ms). Lighthouse igualmente
  da 97/100/100/100. Opciones y análisis completo en
  `docs/status/f1a-readiness-2026-08-03.md`. **Requiere decisión del dueño antes
  de declarar F1A cerrada.** Mientras tanto el gate de LCP está en `warn`.

- **T9 · `designProse` es una colección huérfana.** `velite.config.ts` define la
  colección de diseños, pero no existe ningún `content/{es,en}/designs/` ni
  consumidor, y su esquema no basta para el gate de Edmunds (le faltan `src`,
  `alt` y orden). Knip no lo detecta porque no sigue colecciones de Velite.
  Rediseñarla al construir WP5, no conservarla como está. *Viola la regla 3
  ("cero huérfanos") del repositorio.*

## Decisiones abiertas del pivote (2026-08-06)

Detalle en [`docs/plans/sistema-gargantua.md`](docs/plans/sistema-gargantua.md) §14.

- **Cifras del presupuesto de JS** — ✅ **MEDIDAS 2026-08-07** al cerrar G1.
  Baseline compartido congelado en **145,6 KiB gz**; la home baja de 231 a
  **149,1 KiB gz** al desaparecer el aparato de scroll narrativo. Queda una
  decisión: `/es/contacto` gasta 71,9 KiB propios contra los 40 propuestos.
- **Slugs ES definitivos** — ✅ **CERRADA 2026-08-07**: fijados los funcionales.
  `tesseract` cambió de `historia` a `sobre-mi`; los otros seis ya coincidían.
- **Riesgo aceptado explícitamente:** no hay despliegue hasta que la escena esté
  lista, teniendo F1A prácticamente terminada. Mitigación disponible y **no
  activada**: G1 (migración de rutas, sin 3D) es desplegable por sí sola —
  y desde 2026-08-07 está construida, así que activarla es solo desplegar.

## Estado del pivote

- **G0** — cerrado como spike: el código vive ya en `components/scene/` y
  `app/spike/` se borró. **Sigue faltando la medición formal** en hardware real
  (portátil con Iris Xe y Android de referencia) para registrar el veredicto en
  `sistema-gargantua.md` §9. Ahora manda de verdad: de ahí salen el número de
  pasos y los topes de DPR de cada nivel.
- **G1** — ✅ completada 2026-08-07. 8 rutas, shell sin JS, sitemap de 12 URLs,
  OG por mundo.
- **G2** — construida 2026-08-07, **pendiente de validación visual en GPU**.
  Escena de geodésicas + 6 cuerpos en órbita real, canvas persistente en el
  layout, `cameraPose = f(ruta)`, gate de capacidad con veto al rasterizador por
  software, etiquetas ancladas con separación de colisiones. 110 unitarios y 54
  E2E en verde. Falta: mirarlo en un equipo con GPU, el botón visible de
  «Reducir efectos» y los tests G5/G6/G8/G11/G12.
- **G3** — siguiente. La primitiva de la transición ya existe: el peso de la
  mezcla temporal arranca en `1/(n+1)` y decae, que es exactamente lo que hay
  que sostener mientras la cámara se mueve.

## Regla de cierre

Los elementos aparcados o diferidos de este archivo:

- No son deuda técnica obligatoria.
- No impiden considerar terminado el proyecto en F2.
- No deben entrar al roadmap activo sin cumplir sus condiciones de entrada.
- Requieren aprobación explícita antes de convertirse en tareas comprometidas.

Esta regla no aplica a T4, T2 ni Docs/CI: ya forman parte de los paquetes activos
de F1A indicados arriba.
