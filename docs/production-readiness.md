# Preparación para producción

Lista operativa para publicar Jonás Orbit v3 sin confundir “el build compila”
con “el producto está listo”. No sustituye el plan, el Appendix A ni las
decisiones de diseño.

## Gates automáticos

Una versión candidata debe pasar, sin omitir pasos:

```bash
npm ci
npm audit --audit-level=high
npm run check
npm run test:e2e
npx playwright test --project=firefox --project=webkit
npm run preview
# En otra terminal, mientras el preview esté abierto:
npm run test:worker
```

En GitHub, el workflow de verificación cubre Chromium, Firefox, WebKit,
Lighthouse y enlaces. Tiene permisos de sólo lectura y límites de tiempo por
job. Para validar una rama candidata antes de fusionarla, ejecuta manualmente
el workflow **CI** eligiendo esa rama.

Mientras GitHub Actions siga bloqueado por facturación, Firefox y WebKit se
validan en Linux con la imagen oficial de Playwright, que reproduce el runner
de CI (el WebKit de Playwright en Windows no ofrece `AudioContext`):

```bash
docker run --rm --ipc=host -v "$PWD:/src:ro" mcr.microsoft.com/playwright:v1.61.1-noble bash -c '
  mkdir /work &&
  tar -C /src --exclude=./node_modules --exclude=./.next --exclude=./Fotos --exclude=./Disenos \
    --exclude=./portfolio-content --exclude=./assets -cf - . | tar -C /work -xf - &&
  cd /work && npm ci && npm run build &&
  CI=true npx playwright test --project=firefox --project=webkit'
```

El build de Railway ejecuta además `npm run check` completo (lint, tipos,
Knip, tests y build) sobre Linux con `NODE_ENV=production`: un fallo ahí
impide el despliegue.

## Estado al 28 de septiembre de 2026

- **Railway:** el servicio `web` construye desde la rama `production` de
  GitHub. El primer build completo en Railway pasó `npm run check` (61
  archivos, 588 tests, 34 rutas) y `next start` arrancó en el puerto 8080.
  El healthcheck responde 503 hasta que existan `TURNSTILE_SITE_KEY` y
  `TURNSTILE_SECRET_KEY` en las variables del servicio.
- **Control de abuso:** resuelto en la aplicación (ver «Contrato de entorno»).
- **GitHub Actions:** los runs no llegan a iniciar por facturación o límite de
  gasto de la cuenta. Es un bloqueo externo al código; las pruebas de esta
  versión se ejecutaron en local, en Linux (Docker) y en el build de Railway.
- **Pendiente del dueño:** crear el widget de Turnstile para
  `jonasjavier.dev`, poner sus dos claves en Railway y hacer una entrega real
  del formulario. Revisar a mano los dos enlaces externos que bloquean a
  clientes automáticos (Netflix 403, LinkedIn 999).
- **Recursos y producto:** el propietario confirmó derechos para publicar las
  tres pistas de audio y aprobó el diseño actual. Esto no sustituye las
  pruebas técnicas.

La evidencia de esta versión está en
[`reviews/production-release-2026-09-28.md`](reviews/production-release-2026-09-28.md);
la revisión anterior, en
[`reviews/repository-readiness-2026-09-27.md`](reviews/repository-readiness-2026-09-27.md).

## Contrato de entorno

El destino de producción es Next.js con `npm start` en Railway. El servicio
escucha el `PORT` suministrado por Railway (8080). `/api/health` devuelve 200
sólo cuando el modo de contacto es producción, el origen es HTTPS y las
variables de Turnstile/Resend están presentes y son coherentes con el
hostname; si no, devuelve 503 sin revelar qué valor falta. Esto no verifica
por sí solo que el dominio de Resend esté autorizado ni que un correo llegue:
hace falta una entrega real.

- **Cabeceras de seguridad** (`next.config.ts`): Content-Security-Policy sin
  nonces (todas las rutas se prerenderizan; el único origen externo es
  Turnstile), HSTS sin `includeSubDomains`, `nosniff`, `Referrer-Policy`,
  `X-Frame-Options: SAMEORIGIN`, COOP y `Permissions-Policy` (acelerómetro y
  giroscopio siguen permitidos para el paralaje). No se envía `X-Powered-By`.
  `public/_headers` sólo lo aplica Cloudflare.
- **Límite de tasa del contacto** (`app/api/contact/route.ts`,
  `lib/rate-limit.ts`): el dominio apunta directamente a Railway, sin el proxy
  de Cloudflare, así que la regla de `infra/cloudflare/` no aplica. La
  aplicación replica su contrato: cinco `POST /api/contact` por minuto e IP
  (`x-real-ip` del borde de Railway), bloqueo de 10 minutos, 429 con
  `Retry-After`. El estado vive en memoria: exacto con una réplica; con varias,
  cada una cuenta por separado.
- **Dominio antiguo:** `orbit.jonasjavier.dev` sigue conectado al servicio y
  redirige con 308 a `https://jonasjavier.dev`, conservando la ruta.
- **Rutas desconocidas:** `dynamicParams = false` en el layout de idioma y en
  los casos: una URL inventada es un 404 directo, sin render bajo demanda ni
  escritura en disco. Next registra cada una como
  `Error: Internal: NoFallbackError`; en los logs es un 404, no un fallo.

El preview de OpenNext/Cloudflare se conserva como prueba de compatibilidad:
su caché de Static Assets sirve rutas prerenderizadas sin R2. `test:worker`
comprueba rutas, redirect, 404 y un POST inválido sin correo. No despliega la
versión de producción en Railway.

La actualización dedicada de seguridad fija Next.js 16.3.6, OpenNext 1.20.6,
Vitest 4.1.11 y Wrangler 4.141.0, con PostCSS 8.5.28 y Sharp 0.35.4. Las
auditorías de producción y del árbol completo reportan cero avisos al
2026-09-28. CI bloquea avisos altos/críticos nuevos; la auditoría sigue
siendo obligatoria para cada candidato.

### Railway `jonas-orbit-v3` / `production` / `web`

| Ajuste | Valor |
| --- | --- |
| Origen | GitHub `JonasJavier/jonas-orbit-v3`, rama `production` |
| Builder | Railpack (Node 24 por `.nvmrc`/`devEngines`, npm 11.13.0) |
| Contexto de build | `.dockerignore` excluye fuentes, diseño, evidencia y `docs/` |
| Build | `npm run check` |
| Arranque | `npm start` |
| Healthcheck | `/api/health` (ventana de 5 minutos) |
| Réplicas | 1, `us-west2` |
| Dominios | `jonasjavier.dev` (canónico), `orbit.jonasjavier.dev` (redirige) |

`railway up` no sirve para este proyecto: `public/` comprime a ~280 MB y el
endpoint de subida de Railway responde 413. No se añade `railway.json`:
Railway lo ha sustituido por Infrastructure as Code; la configuración vive en
el servicio.

Variables del servicio (sólo nombres; los valores nunca salen de Railway):
`NEXT_PUBLIC_SITE_URL=https://jonasjavier.dev`,
`TURNSTILE_EXPECTED_HOSTNAME=jonasjavier.dev`, `CONTACT_RUNTIME_ENV=production`,
`RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`,
`TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`. `NEXT_PUBLIC_SITE_URL` se
incrusta en el build: cambiarla exige un despliegue nuevo.

El remitente debe pertenecer al dominio `send.jonasjavier.dev`, verificado en
Resend. El widget de Turnstile debe autorizar `jonasjavier.dev`.

Para completar las credenciales sin exponerlas: crear o seleccionar un widget
en [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
con ese hostname, tomar su site key y secret key, verificar un dominio de envío
en [Resend Domains](https://resend.com/domains) y crear en
[Resend API Keys](https://resend.com/api-keys) una clave limitada a envío y a
ese dominio. Introducir los valores únicamente en Railway → proyecto
`jonas-orbit-v3` → servicio `web` → entorno `production` → Variables. Aplicar
los cambios pendientes; no copiar valores a issues, chats ni commits.

## Publicación

Un push a `main` nunca publica. Publicar es mover la rama `production` a un
commit de `main` que ya pasó los gates:

1. Ejecutar los gates de arriba sobre el commit candidato.
2. `git push origin <commit>:production` (avance rápido; sin `--force`).
3. Railway construye con `npm run check` y sólo enruta tráfico al nuevo
   deployment cuando `/api/health` responde 200.
4. Verificar en vivo: `/api/health` 200, `/es`, los seis destinos, un caso de
   proyecto, `robots.txt`, `sitemap.xml`, canonical y Open Graph con
   `https://jonasjavier.dev`, cabeceras de seguridad y la redirección de
   `orbit.`. Tras cambiar el formulario, una entrega real autorizada.

Cuando GitHub Actions vuelva a funcionar, se puede activar **Wait for CI** en
el servicio para que Railway espere además a los checks del commit.

## Recuperación

- `railway deployment list --service web` muestra los deployments con su
  commit. El último sano se restaura desde el panel del servicio
  (**Rollback**) o moviendo `production` a su commit.
- Ante una regresión, vuelve a esa versión antes de investigar en producción.
- Si falla el contacto, revierte también sus variables al último conjunto
  verificado y comprueba una entrega real; las claves de prueba no sirven en
  el runtime de producción.
- Documenta la causa y añade una prueba que reproduzca el fallo antes del nuevo
  despliegue.

## GitHub y tamaño del repositorio

El repositorio contiene fuentes fotográficas, piezas de diseño y kits de
evidencia de proyectos. El pack de Git supera 1 GiB; migrarlo a Git LFS o a un
almacén de artefactos exigiría reescribir historial y coordinar todos los clones.
Esa operación debe ser una tarea dedicada y aprobada. La higiene cotidiana sí
es obligatoria: builds, logs, capturas de QA y comparativas temporales no se
versionan.
