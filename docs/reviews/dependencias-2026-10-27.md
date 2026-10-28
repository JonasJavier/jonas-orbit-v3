# Seguridad de dependencias · 2026-10-27

## Alcance

GitHub reportaba 11 alertas de Dependabot abiertas en `main` (1 crítica,
2 altas, 7 moderadas, 1 baja) y la CI llevaba días roja en el paso
«Auditar dependencias» (`npm audit --audit-level=high`). `npm audit` veía
más que Dependabot: dos ejecuciones remotas de código críticas en Next.js
publicadas el 10-22, sharp/librsvg, zod, undici, body-parser, qs y glob.
Esta revisión cierra o justifica una por una las alertas y los avisos, con la
actualización mínima y sin tocar código de la aplicación. Mismo formato y
mismas reglas que la actualización dedicada del 09-27
([`repository-readiness-2026-09-27.md`](repository-readiness-2026-09-27.md)):
versiones exactas, sin `--force`, sólo `package.json` y el lockfile.

Qué corre en producción: Railway construye la rama `production` y sirve
`next start` (Linux glibc). En tiempo de ejecución sólo cuentan `next` (y lo
que trae: `sharp` para `/_next/image`, que la app usa en
`components/miller-certificates.tsx` y `miller-issuer-logo.tsx`), `react`,
`three` y `zod` (`lib/contact-schema.ts`, el formulario de contacto). Vite,
Vitest, Wrangler/Miniflare y OpenNext (con su Express) son herramientas de
desarrollo, tests y del preview de Cloudflare.

## Línea base

Commit: `935c542`. Windows, Node 24.16.0, npm 11.13.0.

| Comprobación | Resultado |
| --- | --- |
| Dependabot, alertas abiertas | 11: 1 crítica, 2 altas, 7 moderadas, 1 baja |
| `npm audit` | 14 paquetes: 2 críticos, 9 altos, 3 moderados |
| CI de `main` | FAIL en «Auditar dependencias» |

## Actualización

| Paquete | Antes | Después | Por qué esa versión |
| --- | --- | --- | --- |
| `next` | 16.3.6 | **16.4.3** | Las dos RCE críticas (GHSA-2464, GHSA-673q) y el DoS de Server Actions sólo se arreglan en 16.4.1; la línea 16.3 no recibe el parche (sí 15.5.28). 16.4.2 y 16.4.3 son backports de errores sin funciones nuevas. |
| `eslint-config-next` | 16.3.6 | 16.4.3 | Va con `next`. |
| `zod` | 4.4.3 | 4.6.7 | GHSA-mrhx se arregla en 4.6.6; 4.6.7 es su parche del día siguiente. |
| `@opennextjs/cloudflare` | 1.20.6 | 1.20.13 | 1.20.12 es la primera que declara `next >=16.4.1`; 1.20.13 es el último parche de la misma línea (trae `@opennextjs/aws` 4.1.12 → Express 5.3.0). |
| `vitest` | 4.1.11 | 4.1.12 | Arreglo de `@vitest/mocker`. |
| `wrangler` | 4.143.1 | 4.153.0 | Primera con Miniflare 5.20261023 y undici 7.30.1. |
| override `sharp` | 0.35.4 | **0.35.5** | librsvg (GHSA-wq5f), que es también la causa de la RCE crítica de la optimización de imágenes de Next. Next 16.4.3 ya pide `^0.35.5`; Velite sigue pidiendo `^0.34.5`, así que el override sigue haciendo falta. |
| override `postcss` | 8.5.28 | 8.5.28 | Sin cambio: Next 16.4.3 sigue fijando `postcss` 8.5.23. |
| override nuevo `@node-minify/core` → `glob` | 10.3.3 | 10.5.0 | `@node-minify/core` 9.0.2 (dentro de OpenNext) fija `glob` exacto en 10.3.3; 10.5.0 es la misma mayor con el arreglo. Acotado a ese paquete. |

Transitivas dentro de sus rangos, sólo en el lockfile: `vite` 8.1.5 → 8.3.5,
`source-map-js` 1.2.1 → 1.2.2, `proxy-addr` 2.0.7 → 2.0.8, `body-parser`
2.3.0 → 2.4.0, `qs` 6.16.0 → 6.17.0, `undici` (Miniflare) → 7.30.1.

## Alertas de Dependabot, una por una

| # | Paquete | Relación | Arreglo | ¿Afecta a producción? | Estado |
| --- | --- | --- | --- | --- | --- |
| 25, 26 | `next` (GHSA-3w37, Draft Mode filtrado por `use cache`) | directa, runtime | 16.3.8 | No: la app no usa `use cache` ni `draftMode`. | Cerrada con 16.4.3 |
| 27 | `proxy-addr` (GHSA-jqcg, crítica) | transitiva: OpenNext → Express | 2.0.8 | No: Express sólo existe en el adaptador de Cloudflare; `next start` no lo carga, y el límite de tasa del contacto lee `x-forwarded-for` en `lib/rate-limit.ts`, sin `proxy-addr`. | Cerrada con 2.0.8 |
| 28 | `source-map-js` (GHSA-68fv, alta) | transitiva: Tailwind/PostCSS, jsdom | 1.2.2 | No: sólo procesa mapas en el build y los tests; no recibe mapas de terceros. | Cerrada con 1.2.2 |
| 30, 31, 32 | `vite` (launch-editor en Windows: GHSA-698v, 587h, r825) | transitiva de desarrollo | 8.1.6 | No: servidor de desarrollo de Vitest; producción no lleva Vite. | Cerrada con 8.3.5 |
| 34, 35 | `vite` (GHSA-9jrq, rq7h) | transitiva de desarrollo | 8.1.6 | No, mismo motivo. | Cerrada con 8.3.5 |
| 33, 36 | `@vitest/mocker` (GHSA-xp26, qxg6) | transitiva de desarrollo | 4.1.12 | No: sólo tests. | Cerrada con 4.1.12 |

## Avisos de `npm audit` que Dependabot aún no mostraba

| Aviso | Paquete | ¿Afecta a producción? | Estado |
| --- | --- | --- | --- |
| GHSA-2464 (crítica, RCE en `/_next/image` vía librsvg en Linux glibc) | `next` + `sharp` | **Sí**: Railway es Linux glibc y la app usa `next/image`, así que `/_next/image` y sharp están activos. | Cerrado: Next 16.4.3 + sharp 0.35.5 |
| GHSA-673q (crítica, RCE en `use cache` con arrays tipados) | `next` | No usamos `use cache`; Next pide actualizar igualmente. | Cerrado con 16.4.3 |
| GHSA-p3m5 (alta, DoS con Server Actions) | `next` | No hay `"use server"` en la app. | Cerrado con 16.4.3 |
| GHSA-cjq9 (alta, SSRF en la optimización de imágenes) | `next` | No: sin `images.remotePatterns`. | Cerrado con 16.4.3 |
| GHSA-4jqv, mcj8 (caché de SSG/ISR envenenada) | `next` | No: sin Pages Router ni catch-all de raíz (`[mundo]` con `dynamicParams = false`). | Cerrados con 16.4.3 |
| GHSA-f87g (rutas de imagen de metadatos con `dynamicParams`) | `next` | Bajo: `opengraph-image.tsx` existe, pero con `dynamicParams = false`. | Cerrado con 16.4.3 |
| GHSA-h694, 39w2 | `next` | No (`use cache`; endpoint MCP sólo del servidor de desarrollo). | Cerrados con 16.4.3 |
| GHSA-mrhx (alta, memoria al validar arrays sin tope) | `zod` | Bajo: el esquema del contacto no tiene arrays, pero corre con datos de cualquiera. | Cerrado con 4.6.7 |
| GHSA-wq5f (alta, librsvg) | `sharp` (también vía Velite y Miniflare) | Sí, ver GHSA-2464. | Cerrado con 0.35.5 |
| undici 7.0–7.30.0 (ocho avisos) | Miniflare | No: preview local de Cloudflare. | Cerrado con Wrangler 4.153.0 |
| GHSA-27r3, 6pq8 | `body-parser`, `qs` (Express de OpenNext) | No, como `proxy-addr`. | Cerrados en el lockfile |
| GHSA-5j98 (alta, `glob -c` de la CLI) | `glob` vía `@node-minify/core` | No: es la CLI de glob, que nadie ejecuta; sólo el build de OpenNext usa la librería. | Cerrado con el override acotado a 10.5.0 |

## Evidencia

Windows, Node 24.16.0, npm 11.13.0, sobre el lockfile final.

| Comprobación | Resultado |
| --- | --- |
| `npm install` | PASS, sin `--force` ni `--legacy-peer-deps` |
| `npm audit` | PASS: 0 avisos |
| `npm audit --omit=dev` | PASS: 0 avisos |
| `npm run check` | PASS: lint, typecheck, Knip, 65 archivos / 633 tests, build de 80 páginas con Next.js 16.4.3 |
| `npm run test:e2e`, primera pasada (antes del override de `glob`) | 374/376: fallan los dos `blog.spec.ts:84` |
| `npm run test:e2e`, sobre el lockfile final | 373/376: los dos `blog.spec.ts:84` y O10 en `mobile-chromium` |
| O10 repetido en solitario (`--repeat-each=3`) | PASS 3/3: es intermitente («Material mide menos de 44 px»), y pasó en la primera pasada |

**El fallo de `blog.spec.ts:84` no viene de las dependencias.** `efa6169`
(«Put Gargantua up close in the wallpapers post», del mismo día) añadió tres
fondos a `gargantua-wallpapers` (`articles.data.ts` declara 11) y el test sigue
esperando 8 descargas y nombres `gargantua-interstellar-wallpaper-*`; los
primeros planos se llaman `gargantua-interstellar-black-hole-*`. Falla igual
sin esta actualización. Ese commit no estaba publicado: `production` seguía
en `a6d3e3f`.

Aviso nuevo e inofensivo: Vite 8.3 advierte que `vitest.config.ts` se carga
como CommonJS (`configLoader: 'native'` será el valor por defecto en una
mayor futura). No cambia ningún resultado.

El preview de Cloudflare (`npm run test:worker`, OpenNext 1.20.13) lo
verifica la CI: workerd no arranca en el equipo del dueño.
