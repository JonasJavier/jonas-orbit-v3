# Preparación para producción

Lista operativa para publicar Jonás Orbit v3 sin confundir “el build compila”
con “el producto está listo”. No sustituye el plan, el Appendix A ni las
decisiones de diseño.

## Gates automáticos

Una versión candidata debe pasar, sin omitir pasos:

```bash
npm ci
npm run check
npm run test:e2e
npx playwright test --project=firefox --project=webkit
npm run preview
```

En GitHub, el deploy depende de Chromium, Firefox, WebKit, Lighthouse y la
comprobación de enlaces. El workflow tiene permisos de sólo lectura y límites
de tiempo por job.

## Bloqueos vigentes al 27 de septiembre de 2026

- **Dependencias:** `npm audit --omit=dev` reporta avisos activos, incluido uno
  crítico. Se resuelven en una actualización dedicada, con versiones fijadas y
  la suite completa; no con `npm audit fix --force` dentro de otra feature.
- **GitHub Actions:** los runs no llegan a iniciar por un problema de facturación
  o límite de gasto de la cuenta. Es un bloqueo externo al código.
- **Dominio:** `jonasjavier.dev` todavía no resuelve. No se publica como enlace
  activo ni se configura como canonical hasta que DNS y TLS estén verificados.
- **Runtime:** faltan confirmar en Cloudflare los bindings requeridos del
  formulario y aplicar la regla de rate limiting de `infra/cloudflare/`.
- **Recursos:** la procedencia y licencia de las dos grabaciones de Jonás siguen
  pendientes.
- **Producto:** la valoración visual del propietario continúa pendiente en las
  áreas marcadas por `AGENTS.md`.

## Contrato de entorno

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
