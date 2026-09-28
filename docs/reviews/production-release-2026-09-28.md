# Versión de producción · 2026-09-28

## Alcance

Preparación final para publicar Jonás Orbit en Railway: seguridad HTTP,
control de abuso del formulario, metadatos para compartir, rutas
desconocidas, páginas de error, limpieza de `public/` y la vía de despliegue.
No cambia la arquitectura narrativa, la escena ni el contenido editorial.

Windows 11, Node 24.16.0, npm 11.13.0, build de producción local salvo donde
se indica Railway.

## Línea base (`5cf366e`)

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | PASS |
| `npm audit --audit-level=high` | PASS, 0 vulnerabilidades |
| `npm run check` | PASS: 58 archivos, 577 tests, 34 rutas |
| `npm run test:e2e` | 315/316: falla P7 (muelle) con 4 workers; 3/3 aislado |

## Hallazgos y correcciones

| Hallazgo | Corrección |
| --- | --- |
| Bajo `next start` no había ninguna cabecera de seguridad (`public/_headers` sólo aplica en Cloudflare) | CSP, HSTS, `nosniff`, Referrer-Policy, `SAMEORIGIN`, COOP y Permissions-Policy en `next.config.ts`; sin `X-Powered-By` |
| El dominio apunta a Railway sin proxy de Cloudflare: la regla de tasa de `infra/cloudflare/` no protegía el formulario | Límite en la aplicación con el mismo contrato (5/min por IP, bloqueo de 10 min, 429) |
| `orbit.jonasjavier.dev` duplicaba el sitio | 308 al origen canónico conservando la ruta |
| `/es` sin `og:image`; las páginas con `openGraph` propio perdían `site_name`, `locale` y `type` | Base común en `lib/site-metadata.ts` y tarjeta por defecto |
| Los casos compartían PNG de 2–3 MB como `og:image` | Tarjetas JPEG de 1200 × 630 (55–86 KB) generadas por `tools/prepare-projects.mjs`, con test |
| Idiomas y slugs desconocidos se renderizaban bajo demanda y se escribían en la caché del disco | `dynamicParams = false` en el layout de idioma y en los casos |
| Sin `error.tsx` ni `global-error.tsx` | Páginas de error con el lenguaje de la 404 y `retry` |
| `/brand/logo-options.html` (comparativa con script) servida en público; restos de create-next-app y derivados sin uso | Comparativa a `docs/media/brand/`; archivos sin uso retirados |
| `robots.txt` bloqueaba un `/spike/` inexistente; el sitemap sellaba cada URL con la fecha del build | Regla y `lastmod` retirados |
| `next.config.ts` importaba una devDependency al arrancar en producción | Importación dinámica sólo en `next dev` |
| P7 dependía del ritmo de `page.mouse.wheel` bajo carga | Los tres eventos de un gesto salen en el mismo tick |

## Verificación del árbol final

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | PASS: 61 archivos, 588 tests, 34 rutas |
| `NODE_ENV=production npm run check` (como el build de Railway) | PASS: 61 archivos, 588 tests |
| `npm run test:e2e` (Chromium escritorio y 375 px) | PASS: 316/316 en 5,5 min |
| Cabeceras en `next start` (`curl -I /es`) | CSP y las seis cabeceras presentes; sin `X-Powered-By` |
| `/fr`, `/es/nada`, `/es/proyectos/no-existe`, `/brand/logo-options.html` | 404 |
| Recorrido con la escena encendida: `/es`, Formación, Sobre mí, Creatividad, Observatorio, Proyectos, OMSTA, Contacto | Cero violaciones de CSP ni errores de consola; Turnstile carga y emite token bajo la política |
| Open Graph de `/es` | `og:image`, `site_name`, `locale`, `type` y `twitter:image` presentes |

## Railway

| Deployment | Commit | Resultado |
| --- | --- | --- |
| `89c8869e` | `347a197` | FAILED en build: 120 tests de componentes con `React.act is not a function` (`NODE_ENV=production` heredado por Vitest) |
| `befd7573` | `1050317` | Build PASS (Node 24.21.0, 588 tests, `next build`); `next start` listo en 75 ms en el puerto 8080; healthcheck 503 durante 5 minutos: faltan `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` |

## Sin verificar en esta revisión

- Entrega real del formulario (requiere las claves de Turnstile y una prueba
  autorizada por el dueño).
- Lighthouse de esta versión (la anterior: 98/100/100/100 en `?no3d=1`).
- Netflix (403) y LinkedIn (999) bloquean al cliente automático de enlaces.
