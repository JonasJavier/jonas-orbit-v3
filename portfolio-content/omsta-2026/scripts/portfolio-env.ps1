# portfolio-content/omsta-2026/scripts/portfolio-env.ps1
# Entorno del servidor de portafolio de OMSTA. Se «dot-sourcea» desde la raíz del
# repo OMSTA:  . "<ruta>\portfolio-env.ps1"
#
# - BD local AISLADA omsta_portfolio (nunca cristecno_db ni producción): las
#   capturas solo pueden mostrar los datos sintéticos sembrados aquí.
# - Media en una carpeta propia fuera del repo.
# - Correo a consola, sin Redis, jobs síncronos, sin gate de ubicación ni GeoIP.
param([switch]$Seed)

$env:POSTGRES_DB            = "omsta_portfolio"
$env:DEBUG                  = "True"
$env:USE_REDIS_CACHE        = "False"
$env:DJANGO_Q_ASYNC         = "False"
$env:USE_S3_MEDIA           = "False"
$env:EMAIL_BACKEND          = "django.core.mail.backends.console.EmailBackend"
$env:LOCATION_GATE_ENABLED  = "False"
$env:IP_GEOLOOKUP_ENABLED   = "False"
$env:DJANGO_MEDIA_ROOT      = Join-Path $env:LOCALAPPDATA "omsta-portfolio-media"
# La franja «DEMO» solo se enciende para sembrar (seed_demo lo exige); el
# servidor de capturas corre sin ella.
$env:DEMO_MODE              = $(if ($Seed) { "True" } else { "False" })
New-Item -ItemType Directory -Force $env:DJANGO_MEDIA_ROOT | Out-Null
