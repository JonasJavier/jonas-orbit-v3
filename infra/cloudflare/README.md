# Cloudflare infrastructure

The form's Cloudflare rate-limit rule lives here because Wrangler does not manage the zone Ruleset Engine. Terraform pins the `cloudflare/cloudflare` provider at `5.22.0`.

## Apply the configuration

Requirements: Terraform 1.8 or later, a `CLOUDFLARE_API_TOKEN` with `Zone WAF Write` permission, and the domain's Zone ID.

```powershell
Set-Location infra/cloudflare
terraform init
terraform plan -var="cloudflare_zone_id=<ZONE_ID>"
terraform apply -var="cloudflare_zone_id=<ZONE_ID>"
```

Cloudflare allows one entry ruleset per zone and phase. Add future `http_ratelimit` rules to `zone_rate_limits` rather than creating a parallel resource.

The current rule counts requests per data center and IP, permits five `POST /api/contact` requests in 60 seconds, and blocks for 600 seconds after the limit is exceeded. Clients should treat a 429 response as recoverable and avoid automatic retries.

## Railway production

`jonasjavier.dev` points directly to Railway, without Cloudflare proxying, so this rule **does not protect the live origin**. The application applies the same contract—five `POST /api/contact` requests per minute per IP, a 600-second block, and a 429 response—in `app/api/contact/route.ts` and `lib/rate-limit.ts`. It uses `x-real-ip` from Railway's edge. This Terraform configuration is needed again only if traffic moves behind Cloudflare's proxy.
