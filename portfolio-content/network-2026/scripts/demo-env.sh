# Shared environment for the portfolio demo stack. Source it, do not run it.
#   source scripts/demo-env.sh
#
# Everything lives OUTSIDE the Network repository: a dedicated SQLite file and a
# dedicated media folder, so the repo's own db.sqlite3 / media/ are never touched.

export REPO="C:/Users/savage/Documents/GitHub/Network-3.0"
export NETWORK_BACKEND="$REPO/backend"
export DEMO_DIR="C:/Users/savage/AppData/Local/Temp/claude/C--Users-savage-Documents-GitHub-Network-3-0/f034f95f-3246-4c39-a4a5-218299b2e1dc/scratchpad/demo"
export DATABASE_URL="sqlite:///$DEMO_DIR/demo.sqlite3"
export MEDIA_ROOT="$DEMO_DIR/media"
export DJANGO_DEBUG=1
export DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"
export WEB_PORT="5199"   # 5173 is taken by another project on this machine
export API_PORT="8001"   # 8000 is taken by another service on this machine
export CORS_ALLOWED_ORIGINS="http://localhost:$WEB_PORT,http://127.0.0.1:$WEB_PORT"
export PY="$REPO/.venv/Scripts/python.exe"
