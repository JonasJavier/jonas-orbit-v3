# Infraestructura Cloudflare

La regla de rate limiting del formulario vive aquí porque Wrangler no administra
el Ruleset Engine de la zona. Terraform usa el provider
`cloudflare/cloudflare` fijado en `5.22.0`.

## Aplicación

Requisitos externos: Terraform >= 1.8, un API token en
`CLOUDFLARE_API_TOKEN` con permiso `Zone WAF Write`, y el Zone ID del dominio.

```powershell
Set-Location infra/cloudflare
terraform init
terraform plan -var="cloudflare_zone_id=<ZONE_ID>"
terraform apply -var="cloudflare_zone_id=<ZONE_ID>"
```

Cloudflare admite un solo ruleset de entrada por zona y fase. Cualquier regla
futura de `http_ratelimit` debe añadirse al recurso `zone_rate_limits`, no crear
otro recurso paralelo.

La regla actual cuenta por centro de datos e IP, admite cinco `POST /api/contact`
en 60 segundos y bloquea durante 600 segundos al superar el límite. El cliente
debe tratar una respuesta 429 como recuperable y no reintentar automáticamente.
