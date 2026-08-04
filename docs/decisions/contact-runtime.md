# Decisión de runtime y seguridad del contacto — 2026-08-03

## Runtime

- Producción: Route Handler de Next dentro del Worker generado por OpenNext.
- Desarrollo: `initOpenNextCloudflareForDev()` en `next.config.ts` carga el proxy
  de Wrangler y expone el contexto con la misma forma.
- El handler obtendrá bindings mediante `getCloudflareContext()` dentro de la
  petición. No se llama en el nivel superior ni durante generación estática.
- PostgreSQL, KV o un binding de Rate Limiting no se añaden para este flujo. La
  limitación de solicitudes ocurre en el Ruleset Engine antes de llegar al Worker.

## Turnstile

Claves públicas oficiales para desarrollo y E2E:

| Escenario | Sitekey | Secret |
| --- | --- | --- |
| Éxito | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Fallo | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |
| Token repetido | sitekey de éxito | `3x0000000000000000000000000000000AA` |

Las claves reales se configuran como secretos de Cloudflare y nunca usan prefijo
`NEXT_PUBLIC_`. El navegador solo recibe el sitekey; el secret existe únicamente
en el servidor. Producción debe rechazar las claves de prueba durante el arranque o
la primera petición.

El handler validará siempre el token con Siteverify, limitará su longitud a 2.048
caracteres, enviará `CF-Connecting-IP` cuando exista, establecerá timeout y
comprobará `action` y hostname en producción. Los errores internos no se devuelven
al visitante.

El widget usa renderizado explícito con `action: contact`. El navegador obtiene
el sitekey en tiempo de ejecución desde `GET /api/contact`; ninguna clave queda
horneada en el bundle. E2E activa `CONTACT_RUNTIME_ENV=test` y usa un token
determinista que solo es aceptado bajo ese modo. Producción rechaza tanto el modo
de prueba como las claves oficiales de prueba.

## Entrega del mensaje

La entrega usa la API HTTP de Resend directamente, sin SDK adicional. El handler
envía una versión de texto y otra HTML escapada, usa el correo del visitante como
`reply_to`, añade una clave de idempotencia por intento y aplica timeout. El
portafolio no persiste el mensaje en una base de datos.

Bindings y secretos necesarios en producción:

| Nombre | Tipo | Propósito |
| --- | --- | --- |
| `CONTACT_RUNTIME_ENV=production` | var en `wrangler.jsonc` | Cierra las rutas de prueba |
| `TURNSTILE_SITE_KEY` | secret | Sitekey que el endpoint entrega al navegador |
| `TURNSTILE_SECRET_KEY` | secret | Validación server-side con Siteverify |
| `TURNSTILE_EXPECTED_HOSTNAME` | secret | Host exacto aceptado por la validación |
| `RESEND_API_KEY` | secret | Autoriza la entrega por Resend |
| `CONTACT_FROM_EMAIL` | secret | Remitente verificado, por ejemplo `Orbit <contacto@dominio>` |
| `CONTACT_TO_EMAIL` | secret | Buzón privado que recibe la transmisión |

Configuración, sin registrar valores en Git:

```powershell
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put TURNSTILE_EXPECTED_HOSTNAME
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_FROM_EMAIL
npx wrangler secret put CONTACT_TO_EMAIL
```

Antes del primer deploy hay que verificar el dominio remitente en Resend. En una
preview local que deba entregar correo se pasan las mismas variables al proceso;
para QA automatizado se mantiene `CONTACT_DELIVERY_MODE=test`.

## Rate limiting como IaC

`infra/cloudflare/contact-rate-limit.tf` declara un ruleset de zona en la fase
`http_ratelimit`: cinco `POST /api/contact` por 60 segundos, por IP y centro de
datos; al superar el umbral, bloqueo de diez minutos. La respuesta 429 se presenta
como estado recuperable en el formulario.

## Fuentes oficiales

- https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/terraform/additional-configurations/rate-limiting-rules/
- https://resend.com/docs/api-reference/emails/send-email
