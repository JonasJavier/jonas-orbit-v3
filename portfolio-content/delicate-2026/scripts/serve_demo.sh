#!/usr/bin/env bash
# Levanta Delicaté en local con la base demo, tal como la sirven los scripts de captura.
#
#   Django (API, admin, fotos)  -> http://127.0.0.1:8000
#   Build de producción React   -> http://127.0.0.1:4173  (vite preview; /api y /media van a Django)
#
# Requisitos: haber ejecutado seed_demo.py. Úsese desde Git Bash:
#   bash serve_demo.sh        # deja ambos servidores corriendo; Ctrl+C los detiene
#
# No escribe en el repositorio: el build va a $DEMO_STATE_DIR/dist.
set -euo pipefail
export MSYS_NO_PATHCONV=1

REPO="${DELICATE_REPO:-C:/Users/savage/Documents/GitHub/Delicate-4.0}"
STATE="${DEMO_STATE_DIR:-$(cygpath -m "${TEMP:-/tmp}")/delicate-portfolio-demo}"
PY="$REPO/.venv/Scripts/python.exe"

# Descarta variables DJANGO_*, CSRF_*, CORS_*, RAILWAY_* y DATABASE_URL heredadas
# (esta PC tiene algunas globales de otro proyecto).
for var in $(compgen -e | grep -E '^(DJANGO_|CSRF_|CORS_|RAILWAY_|DATABASE_URL$)'); do unset "$var"; done

export DJANGO_DB_PATH="$STATE/demo.sqlite3"
export DJANGO_MEDIA_ROOT="$STATE/media"
export DJANGO_DEBUG=True

(cd "$REPO/frontend" && npx vite build --outDir "$STATE/dist" --emptyOutDir >/dev/null)
echo "Build de producción en $STATE/dist"

"$PY" "$REPO/backend/manage.py" runserver 127.0.0.1:8000 --noreload &
DJANGO_PID=$!
(cd "$REPO/frontend" && npx vite preview --outDir "$STATE/dist" --port 4173 --strictPort) &
PREVIEW_PID=$!

trap 'kill $DJANGO_PID $PREVIEW_PID 2>/dev/null' EXIT INT TERM
wait
