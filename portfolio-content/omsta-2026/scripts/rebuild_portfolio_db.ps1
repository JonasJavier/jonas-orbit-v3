# portfolio-content/omsta-2026/scripts/rebuild_portfolio_db.ps1
# Reconstruye desde cero la BD local AISLADA omsta_portfolio y la siembra con
# datos sintéticos. Nunca toca cristecno_db ni producción (los scripts Python
# abortan si la BD no es omsta_portfolio o el host no es local).
#
# Uso, desde la raíz del repo OMSTA:
#   & "<ruta>\rebuild_portfolio_db.ps1"
#
# Las contraseñas de las cuentas demo se generan al azar la primera vez y se
# guardan FUERA de ambos repos, en %LOCALAPPDATA%\omsta-portfolio\demo-credentials.txt.
# "Continue": Django escribe sus logs INFO en stderr y PowerShell 5.1 los trataría
# como error fatal; el éxito se decide por $LASTEXITCODE.
$ErrorActionPreference = "Continue"
$here = $PSScriptRoot
$py = ".\.codex_venv\Scripts\python.exe"

# 1) Parar el servidor de portafolio (puerto 8130) si está arriba.
Get-NetTCPConnection -State Listen -LocalPort 8130 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# 2) Recrear la BD.
& $py (Join-Path $here "recreate_portfolio_db.py")
if ($LASTEXITCODE) { throw "recreate falló" }

# 3) Migrar y sembrar con DEMO_MODE=True (seed_demo lo exige).
. (Join-Path $here "portfolio-env.ps1") -Seed
$credDir = Join-Path $env:LOCALAPPDATA "omsta-portfolio"
New-Item -ItemType Directory -Force $credDir | Out-Null
$credFile = Join-Path $credDir "demo-credentials.txt"
function New-Pw { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ }) + "#Pf" }
if (-not (Test-Path $credFile)) {
    "DEMO_USERS_PASSWORD=$(New-Pw)`nDEMO_TESTER_PASSWORDS=$(New-Pw),$(New-Pw),$(New-Pw)" |
        Set-Content -Encoding utf8 $credFile
}
Get-Content $credFile | ForEach-Object { $k, $v = $_ -split '=', 2; Set-Item "env:$k" $v }

& $py manage.py migrate --noinput | Out-Null
if ($LASTEXITCODE) { throw "migrate falló" }
& $py (Join-Path $here "seed_portfolio.py")
if ($LASTEXITCODE) { throw "seed_portfolio falló" }
& $py (Join-Path $here "seed_portfolio_fase2.py")
if ($LASTEXITCODE) { throw "seed_portfolio_fase2 falló" }
& $py (Join-Path $here "seed_portfolio_fase3.py")
if ($LASTEXITCODE) { throw "seed_portfolio_fase3 falló" }
