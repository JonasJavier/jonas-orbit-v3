## Contexto de código: usa el grafo primero

Este repo está indexado en **codebase-memory-mcp** (proyecto
`C-Users-savage-Documents-kimi-Workspaces-portafolio-espacial-jonas-orbit-v3`).
Antes de explorar código cuya ubicación o impacto no conoces:

1. `search_graph(query=…)` o `search_graph(name_pattern=…)` para encontrarlo.
2. `trace_path(direction="inbound")` para saber qué rompe un cambio.
3. `get_code_snippet(qualified_name)` para leer sólo esa función, no el archivo.
4. `Read` antes de editar, siempre. `Grep` para texto literal, CSS y copy.

Si el grafo no encuentra algo que existe, reindexa (`index_repository`). Guía,
mapa por dominio y mantenimiento: `docs/ai/codebase-memory.md`.

## Trabajar con poco contexto

- `docs/registro-de-decisiones.md` pesa ~95 KB: nunca lo leas entero. Busca la
  entrada con `Grep` (por título o fecha) y lee sólo esas líneas.
- Los archivos grandes (`components/scene/system-scene.ts`, `*-shaders.ts`,
  `components/observatory-viewer.tsx`) se leen por función
  (`get_code_snippet`) o con `offset`/`limit`, no enteros.
- Búsquedas amplias o de varios pasos → subagente `Explore`; vuelve la
  conclusión, no los archivos.
- **Las capturas visuales NO se racionan.** En este proyecto el veredicto es
  visual: haz todas las que el cambio necesite, a resolución completa.
  `read_page` / `get_page_text` sirven para comprobar texto y estructura, no
  para sustituir a una captura.
- Salidas largas (`npm run check`, e2e, herramientas de `tools/`) → a un archivo
  y leer sólo el final o los errores.

@AGENTS.md
