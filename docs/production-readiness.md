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
job. No hay un deploy automático activo mientras estos gates estén abiertos.

Para validar una rama candidata antes de fusionarla, ejecuta manualmente el
workflow **CI** eligiendo esa rama. También comprueba Firefox/WebKit y enlaces.
Esto requiere resolver primero el bloqueo de facturación de Actions.

## Bloqueos vigentes al 27 de septiembre de 2026

- **Compatibilidad y calidad:** quedan fallos de WebKit que deben verificarse
  en Linux/Safari. En Windows, el WebKit de Playwright no ofrece `AudioContext`;
  la ejecución local del 2026-09-28 terminó con 295 tests aprobados, 19
  fallidos (18 WebKit, 1 Firefox) y 2 omitidos.
  Lighthouse pasa y los 351 enlaces internos responden;
  dos destinos externos bloquean al cliente automático y requieren revisión.
  Consulta la [revisión con resultados](reviews/repository-readiness-2026-09-27.md).
- **GitHub Actions:** los runs no llegan a iniciar por un problema de facturación
  o límite de gasto de la cuenta. Es un bloqueo externo al código.
- **Railway:** el proyecto aislado `jonas-orbit-v3`, ambiente `production` y
  servicio `web` existen. El dominio canónico `jonasjavier.dev` tiene DNS y
  TLS válidos, pero responde 404 porque el servicio todavía no tiene un
  deployment. El dueño informó de la configuración de Resend y correo;
  siguen pendientes la verificación de los nombres de variables, Turnstile
  para la raíz y una entrega real del formulario.
- **Control de abuso:** la regla de `infra/cloudflare/` no protege un origen en
  Railway por sí sola. Antes de abrir el formulario al público, hace falta
  protección de tasa en el borde o un mecanismo equivalente probado.
- **Recursos y producto:** el propietario confirmó derechos para publicar las
  tres pistas de audio y aprobó el diseño actual. Esto no sustituye las
  pruebas técnicas.

## Contrato de entorno

El destino de producción es Next.js con `npm start` en Railway. El servicio
escucha el `PORT` suministrado por Railway. `/api/health` devuelve 200 sólo
cuando el modo de contacto es producción, el origen es HTTPS y las variables
de Turnstile/Resend están presentes y son coherentes con el hostname; si no,
devuelve 503 sin revelar qué valor falta. Esto no verifica por sí solo que el
dominio de Resend esté autorizado ni que un correo llegue: hace falta una
entrega real.

El preview de OpenNext/Cloudflare se conserva como prueba de compatibilidad:
su caché de Static Assets sirve rutas prerenderizadas sin R2. `test:worker`
comprueba rutas, redirect, 404 y un POST inválido sin correo. No despliega la
versión de producción en Railway.

La actualización dedicada de seguridad fija Next.js 16.3.6, OpenNext 1.20.6,
Vitest 4.1.11 y Wrangler 4.141.0, con PostCSS 8.5.28 y Sharp 0.35.4. Las
auditorías de producción y del árbol completo reportan cero avisos en esta
rama al 2026-09-27. CI bloquea avisos altos/críticos nuevos; la auditoría sigue
siendo obligatoria para cada candidato.

### Railway `jonas-orbit-v3` / `production` / `web`

El dueño indicó que cambió `NEXT_PUBLIC_SITE_URL` a
`https://jonasjavier.dev` y `TURNSTILE_EXPECTED_HOSTNAME` a
`jonasjavier.dev`; `CONTACT_RUNTIME_ENV=production` permanece. Comprobar
la presencia y coherencia de estas variables sin imprimir secretos:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`

El remitente debe pertenecer al dominio `send.jonasjavier.dev`, verificado en
Resend. El widget de Turnstile debe autorizar `jonasjavier.dev`. El build
configurado en Railway es `npm run check`, el arranque es `npm start` y el
healthcheck es
`/api/health`. No se debe añadir un `railway.json` a un servicio nuevo: Railway
lo ha sustituido por Infrastructure as Code; por ahora esta configuración se
mantiene en el servicio.

Para completar las credenciales sin exponerlas: crear o seleccionar un widget
en [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
con ese hostname, tomar su site key y secret key, verificar un dominio de envío
en [Resend Domains](https://resend.com/domains) y crear en
[Resend API Keys](https://resend.com/api-keys) una clave limitada a envío y a
ese dominio. Introducir los cinco valores únicamente en Railway → proyecto
`jonas-orbit-v3` → servicio `web` → entorno `production` → Variables. Aplicar
los cambios pendientes; no copiar valores a issues, chats ni commits.

## Publicación

1. Cerrar los bloqueos de compatibilidad, facturación y control de abuso.
2. Ejecutar la suite local desde un checkout limpio.
3. Verificar el preview de OpenNext y el formulario en modo de prueba.
4. Confirmar DNS, TLS, canonical, Open Graph, `robots.txt` y `sitemap.xml`.
5. Configurar los cinco valores pendientes directamente en Railway y verificar
   Resend/Turnstile; no imprimir secretos en terminales ni logs.
6. Publicar desde `main` sólo con todos los jobs verdes. Conectar el repositorio
   a Railway únicamente con **Wait for CI** habilitado, o desplegar manualmente
   una revisión exacta tras los gates; no activar autodeploy sin esa protección.
7. Confirmar que `/api/health` responde 200 y probar `/es`, los seis destinos,
   un caso de proyecto y el contacto con una entrega real autorizada.

## Recuperación

- Conserva el identificador del último deployment sano de Railway.
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
