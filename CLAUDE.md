## Sólo para Claude Code

Las reglas del repo y el flujo para gastar poco contexto (grafo primero,
registro por entradas, archivos grandes por función) están en `AGENTS.md`,
importado abajo: valen igual para Claude y para Codex. Aquí va sólo lo propio
de Claude Code.

- Búsquedas amplias o de varios pasos → subagente `Explore`; vuelve la
  conclusión, no los archivos.
- Si el grafo no encuentra algo que existe, reindexa (`index_repository` con la
  raíz del repo, nunca con `name`); está permitido sin preguntar.
- Al abrir la sesión, un hook corre `tools/graph-check.mjs --hook`. Si imprime
  avisos `[grafo]`, reconstruye el grafo antes de empezar (la orden va en el
  propio aviso); si no dice nada, está limpio.
- Previews: `.claude/launch.json` (`dev`, `preview`, `e2e-dev`, `attach-3000`).
  Para medir la escena usa `next start`/`tools/`, no `npm run dev` (ver
  «Trampas de medición»).
- **Las capturas visuales NO se racionan**: a resolución completa, todas las
  que el cambio necesite.
- Un hook (`.claude/hooks/lint-changed.mjs`) pasa ESLint al archivo que editas;
  si falla, corrígelo antes de seguir: CI usa `--max-warnings=0`.

@AGENTS.md
