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

En GitHub, el deploy depende de Chromium, Firefox, WebKit, Lighthouse y la
comprobación de enlaces. El workflow tiene permisos de sólo lectura y límites
de tiempo por job.

Para validar una rama candidata antes de fusionarla, ejecuta manualmente el
workflow **CI** eligiendo esa rama. También comprueba Firefox/WebKit y enlaces;
el deploy sigue restringido a `main`. Esto requiere resolver primero el bloqueo
de facturación de Actions, no credenciales de producción.

## Bloqueos vigentes al 27 de septiembre de 2026

- **Compatibilidad y calidad:** quedan fallos de WebKit que deben verificarse
  en un entorno compatible. Lighthouse pasa y los 351 enlaces internos responden;
  dos destinos externos bloquean al cliente automático y requieren revisión.
  Consulta la [revisión con resultados](reviews/repository-readiness-2026-09-27.md).
- **GitHub Actions:** los runs no llegan a iniciar por un problema de facturación
  o límite de gasto de la cuenta. Es un bloqueo externo al código.
- **Dominio:** `jonasjavier.dev` todavía no resuelve. No se publica como enlace
  activo ni se configura como canonical hasta que DNS y TLS estén verificados.
- **Runtime:** faltan confirmar en Cloudflare los bindings requeridos del
  formulario y aplicar la regla de rate limiting de `infra/cloudflare/`.
- **Recursos:** siguen pendientes los derechos de publicación de las dos
  grabaciones de efectos y de la banda sonora aportada por el propietario.
- **Producto:** la valoración visual del propietario continúa pendiente en las
  áreas marcadas por `AGENTS.md`.

## Contrato de entorno

OpenNext sirve las rutas prerenderizadas desde una caché de Static Assets de
sólo lectura, con interceptación habilitada. No requiere R2 ni revalidación.
El formulario sigue siendo dinámico. El gate `test:worker` prueba el runtime
local real: rutas HTML, redirect, 404 canónicos y un POST deliberadamente
inválido que no entrega correo. Esto no sustituye una entrega real autorizada.

La actualización dedicada de seguridad fija Next.js 16.3.6, OpenNext 1.20.6,
Vitest 4.1.11 y Wrangler 4.141.0, con PostCSS 8.5.28 y Sharp 0.35.4. Las
auditorías de producción y del árbol completo reportan cero avisos en esta
rama al 2026-09-27. CI bloquea avisos altos/críticos nuevos; la auditoría sigue
siendo obligatoria para cada candidato.

### GitHub Actions

| Tipo | Nombre | Propósito |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Desplegar el Worker con alcance mínimo |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Cuenta destino de Cloudflare |
| Variable | `NEXT_PUBLIC_SITE_URL` | Canonical, Open Graph y sitemap durante build |

### Cloudflare Worker

`wrangler.jsonc` declara como obligatorios estos secretos/bindings de runtime:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_EXPECTED_HOSTNAME`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`

El deploy falla si falta alguno. `keep_vars` conserva los valores administrados
en Cloudflare; ningún secreto se copia al repositorio.

## Publicación

1. Cerrar o aceptar explícitamente cada bloqueo anterior.
2. Ejecutar la suite local desde un checkout limpio.
3. Verificar el preview de OpenNext y el formulario en modo de prueba.
4. Confirmar DNS, TLS, canonical, Open Graph, `robots.txt` y `sitemap.xml`.
5. Configurar variables y secretos en GitHub y Cloudflare.
6. Aplicar `infra/cloudflare/` y comprobar el 429 sin reintento automático.
7. Publicar desde `main` sólo con todos los jobs verdes.
8. Probar `/es`, los seis destinos, un caso de proyecto y el contacto real.

## Recuperación

- Conserva el identificador del último deployment sano de Cloudflare.
- Ante una regresión, vuelve a esa versión antes de investigar en producción.
- Si falla el contacto, revierte también sus bindings al último conjunto
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
