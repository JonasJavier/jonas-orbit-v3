# Network — viñetas para el CV

Sin inflar. Cada viñeta sólo afirma cosas que están en `metrics.md` con su comando.
Elige **una o dos**; están ordenadas de más a menos recomendable.

---

## Español

### Opción A — alcance + oficio *(recomendada)*

> **Network — red social full-stack** · Diseñé y construí una red social completa como
> API REST en Django + SPA en React: feed con paginación por cursor, reposts y citas,
> comentarios en hilo, hashtags, menciones, marcadores y notificaciones con ocho tipos
> de evento, sobre 8 modelos de dominio y 37 operaciones de API documentadas en OpenAPI.
>
> Respaldada por **132 pruebas automatizadas en verde** (98 backend, 34 frontend) y un
> pipeline de CI que además de lint y tipos valida migraciones, `check --deploy` y la
> construcción de las dos imágenes Docker; desplegada y en funcionamiento con
> PostgreSQL y Redis.

### Opción B — dos viñetas separadas

> - Reescribí un proyecto académico monolítico de Django como **API REST versionada +
>   SPA en React/TypeScript**, con autenticación JWT con rotación de refresh y lista
>   negra, paginación por cursor para timelines y contadores de feed resueltos con
>   subconsultas correlacionadas en lugar de JOIN múltiples.
> - Lo llevé a producción: Docker multi-stage para ambos servicios, despliegue como
>   código, health-check, cabeceras de seguridad y CSP, procesado de imágenes en
>   servidor con limpieza de EXIF, y **132 pruebas en verde** en CI.

### Opción C — una sola línea, para un CV apretado

> **Network** — Red social full-stack (Django REST + React/TypeScript): 37 endpoints
> documentados en OpenAPI, feed con paginación por cursor, notificaciones de 8 tipos,
> 132 pruebas en verde y despliegue en contenedores con CI.

---

## English

### Option A — scope + craft *(recommended)*

> **Network — full-stack social network** · Designed and built a complete social
> network as a Django REST API plus a React SPA: cursor-paginated feed, reposts and
> quotes, threaded comments, hashtags, mentions, bookmarks and an eight-verb
> notification system, across 8 domain models and 37 OpenAPI-documented endpoints.
>
> Backed by **132 passing automated tests** (98 backend, 34 frontend) and a CI pipeline
> that, beyond lint and types, validates migrations, `check --deploy` and both Docker
> image builds; deployed and running against PostgreSQL and Redis.

### Option B — two separate bullets

> - Rewrote a monolithic Django coursework project as a **versioned REST API + a
>   React/TypeScript SPA**, with JWT auth using refresh rotation and blacklisting,
>   cursor pagination for timelines, and feed counters resolved through correlated
>   subqueries instead of multi-join aggregates.
> - Took it to production: multi-stage Docker images for both services,
>   deployment-as-code, a health probe, security headers and CSP, server-side image
>   processing with EXIF stripping, and **132 passing tests** in CI.

### Option C — single line

> **Network** — Full-stack social network (Django REST + React/TypeScript): 37
> documented API operations, cursor-paginated feed, 8 notification types, 132 passing
> tests, containerised deployment with CI.

---

## Línea de tecnologías del proyecto

**Español**

> React · TypeScript · Vite · Tailwind CSS · TanStack Query · Zustand · Django ·
> Django REST Framework · JWT · PostgreSQL · Redis · Docker · nginx · GitHub Actions

**English**

> React · TypeScript · Vite · Tailwind CSS · TanStack Query · Zustand · Django ·
> Django REST Framework · JWT · PostgreSQL · Redis · Docker · nginx · GitHub Actions

Versión corta, si el formato del CV sólo admite 6–8:

> React · TypeScript · Django REST Framework · PostgreSQL · Redis · Docker

---

## Duración, si tu formato de CV la pide

**Alrededor de dos semanas.** Es un dato tuyo, no deducible del repositorio (los 19
commits caben en 4 días porque el trabajo se subió en bloques).

En español: *«~2 semanas, en solitario»*. En inglés: *«~2 weeks, solo»*.

No está incluido en ninguna de las opciones de arriba a propósito: en un CV, una
duración corta junto a un alcance grande puede leerse como que el alcance es menor de
lo que es. Úsalo sólo si el formato lo exige o si el proyecto va en una sección de
proyectos con fechas.

---

## Qué **no** poner

- Nada sobre usuarios, tráfico, adopción o impacto: no hay datos, y Jonás ha
  confirmado que nadie externo lo ha usado.
- Nada sobre tiempo real, WebSockets o notificaciones push: **no existen** en el
  proyecto.
- «PWA offline»: hay manifest instalable, pero **no hay service worker**.
- Porcentajes de mejora de rendimiento: no hay mediciones antes/después.
- Cobertura de tests en porcentaje: hay pruebas, pero no se midió la cobertura.
- «Proyecto de CS50W» a secas: minimiza el trabajo. Si mencionas el origen, encádenalo
  con lo que añadiste (ver `case-notes.md` §2).
- Nada sobre asistencia de IA en el desarrollo: decisión tomada, no se menciona.
