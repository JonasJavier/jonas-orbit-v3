#!/usr/bin/env bash
# Reconstruye, reinicia el servidor de producción del 3100 y captura.
set -e
cd "C:/Users/hachi/OneDrive/Documentos/GitHub/jonas-orbit-v3"
SCRATCH="C:/Users/hachi/AppData/Local/Temp/claude/C--Users-hachi-OneDrive-Documentos-GitHub-jonas-orbit-v3/ac55f263-aed7-4843-9d19-2a49dafb4c8b/scratchpad"
NAME="${1:-after}"

npm run build > "$SCRATCH/build-$NAME.log" 2>&1 || { tail -30 "$SCRATCH/build-$NAME.log"; exit 1; }

PID=$(netstat -ano | grep ":3100" | grep LISTENING | head -1 | awk '{print $5}')
if [ -n "$PID" ]; then taskkill //PID "$PID" //F > /dev/null 2>&1 || true; fi
sleep 1
nohup npx next start -p 3100 > "$SCRATCH/server.log" 2>&1 &
for i in $(seq 1 40); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/es 2>/dev/null | grep -q 200; then break; fi
done
node .shot.mjs "$NAME"
node .crop.mjs "$NAME" "$NAME-zoom" 360 320 520 260 2
echo "done $NAME"
