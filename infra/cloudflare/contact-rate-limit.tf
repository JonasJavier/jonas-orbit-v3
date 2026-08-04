resource "cloudflare_ruleset" "zone_rate_limits" {
  zone_id     = var.cloudflare_zone_id
  name        = "Jonas Orbit rate limits"
  description = "Protecciones de endpoints públicos del portafolio"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [{
    ref         = "contact_form_ip"
    description = "Máximo 5 envíos de contacto por minuto e IP; bloqueo 10 minutos"
    expression  = "(http.request.method eq \"POST\" and http.request.uri.path eq \"/api/contact\")"
    action      = "block"
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 60
      requests_per_period = 5
      mitigation_timeout  = 600
    }
  }]
}
