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

## Rate limiting como IaC

`infra/cloudflare/contact-rate-limit.tf` declara un ruleset de zona en la fase
`http_ratelimit`: cinco `POST /api/contact` por 60 segundos, por IP y centro de
datos; al superar el umbral, bloqueo de diez minutos. La respuesta 429 se presenta
como estado recuperable en el formulario.

## Fuentes oficiales

- https://developers.cloudflare.com/turnstile/troubleshooting/testing/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/terraform/additional-configurations/rate-limiting-rules/
