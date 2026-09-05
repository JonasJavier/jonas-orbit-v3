# Jonás Orbit v3 — Misión Endurance

Portafolio espacial de **Jonás Javier Encarnación** — desarrollador full-stack,
diseñador UX/UI y fotógrafo. Una experiencia narrativa inspirada en el cine
espacial científico: scroll cinematográfico como navegación principal y un
universo 3D como capa progresiva.

**Plan aprobado (fuente de verdad):**
[`docs/plans/jonas-orbit-v3-mission-endurance.md`](docs/plans/jonas-orbit-v3-mission-endurance.md)
— arquitectura, fases (F1A → F3), contenido como entregable, matriz de tests
(Appendix A) y condición de parada. Ninguna decisión arquitectónica se abre sin
pasar por ese documento.

## Estado

**Fase actual: F1A — setup técnico.** Estructura, pipeline de contenido,
calidad y deploy verificados; la coreografía de scroll, el starfield y el
diseño visual definitivo son el siguiente trabajo de F1A.

## Comandos

```bash
npm run dev        # desarrollo (corre velite antes)
npm run build      # build de producción (corre velite antes)
npm run start      # servir el build
npm run content    # compilar solo el contenido (velite)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run knip       # código muerto: archivos/exports/deps huérfanos
npm run test       # vitest (unit + componentes)
npm run test:e2e   # playwright (requiere `npm run build` previo)
npm run check      # lint + typecheck + knip + test + build
npm run preview    # build OpenNext + preview local en workerd
npm run deploy     # build OpenNext + deploy a Cloudflare
```

## Arquitectura (resumen)

- **Next.js (App Router) + OpenNext → Cloudflare Workers.** Versiones fijadas;
  se actualizan solo en tarea dedicada tras pasar la suite completa.
- **Contenido: Velite (pipeline único).** Estructura neutral al idioma en
  `content/worlds.data.ts` (identidad canónica `WorldId`); prosa localizada en
  `content/{locale}/worlds/*.mdx`. `getWorld(id, locale)` compone ambos lados.
  La paridad de contenido rompe el build solo para idiomas publicados
  (`content/site.data.ts`).
- **Rutas:** System Map en `/es` y seis destinos con rutas propias;
  casos de estudio en rutas propias. `/` → `/es` por
  redirect estático (sin proxy hasta F2A).
- **Los 6 destinos:** Tesseracto (historia) ·
  Miller (desarrollo) · Endurance (proyectos) · Edmunds (creatividad) ·
  Gargantúa (laboratorio) · Ranger (contacto).

## Estructura

```
app/[locale]/        System Map y rutas de destino (ES publicado; EN llega en F2A)
components/          componentes de presentación
content/             worlds.data.ts (estructura) + {es,en}/worlds/*.mdx (prosa)
lib/                 getWorld / getWorlds
e2e/                 smoke tests de Playwright
docs/plans/          el plan aprobado
docs/reviews/        test plan de la revisión de ingeniería
docs/experiments/    experimentos aparcados (con condiciones de entrada)
docs/deferred/       trabajo diferido (con condiciones de entrada)
docs/reference/v2/   código de v2 conservado como referencia (no se importa)
```

## Reglas del repo

Ver [`AGENTS.md`](AGENTS.md). Las tres más importantes: un solo pipeline MDX
(Velite), cero código/deps huérfanos (Knip en CI), y nada de código cuya única
función sea alterar una auditoría.
