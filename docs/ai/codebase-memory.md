# El grafo de código (codebase-memory-mcp)

Guía para agentes (Claude Code, Codex…) que trabajan en este repo. El grafo es
un índice local del código —funciones, tipos, rutas, llamadas, imports y
encabezados `#` de los `.md`— que responde en ~500 tokens lo que un barrido con
`grep` + `Read` cuesta en decenas de miles.

**Regla:** antes de tocar código cuya ubicación o impacto no conoces, pregunta
al grafo. Después lee el archivo con `Read` (siempre antes de editar). Para
decisiones de diseño, el grafo NO sustituye a `docs/design/*.md`: te dice
*dónde* está algo, los documentos dicen *por qué*.

## Un solo grafo

```
project = "C-Users-savage-Documents-kimi-Workspaces-portafolio-espacial-jonas-orbit-v3"
```

- Es el ÚNICO proyecto de este repo. Úsalo también desde un worktree o una rama:
  no llames a `index_repository` con otra ruta ni con `name`, que crea un
  segundo grafo que nadie mantiene.
- El servidor tiene `auto_index` y `auto_watch` activos
  (`codebase-memory-mcp config list`): los archivos nuevos y editados del
  checkout principal entran solos en menos de un minuto. **Los borrados y
  renombrados NO salen** (medido el 2026-09-28: un `.md` eliminado seguía en
  el grafo minutos después). Por eso existe `npm run graph:check`
  (`tools/graph-check.mjs`), que encuentra fantasmas, ruido excluido y grafos
  de más; en Claude Code corre solo al abrir la sesión y sólo habla si hay algo
  que arreglar. Otros agentes: córrelo al terminar si borraste o moviste
  archivos. En otro equipo el nombre del proyecto cambia con la ruta: el
  comprobador lo busca por la raíz del repo. Si una sesión en `.claude/worktrees/…` crea un
  proyecto propio, bórralo (`delete_project`) cuando el worktree desaparezca;
  `list_projects` marca `root_exists: false` en los huérfanos.
- No uses `persistence: true`: el artefacto versionado está retirado
  (`.gitignore` excluye `/.codebase-memory/`).

## Qué pregunta hacer y con qué herramienta

| Necesito… | Llamada |
| --- | --- |
| Encontrar dónde vive algo por concepto | `search_graph(query="audio bus mute limiter", limit=10)` |
| Encontrar por nombre | `search_graph(name_pattern=".*Voyage.*", label="Function", limit=20)` |
| Una decisión o sección de un documento | `search_graph(name_pattern="(?i).*agujero.*", label="Section", file_pattern="docs/*", limit=5)` y luego `grep -n` del título para el número de línea |
| Quién llama a X (impacto antes de cambiarlo) | `trace_path(function_name="startVoyage", direction="inbound")` |
| Qué llama X | `trace_path(function_name="createSystemScene", direction="outbound")` |
| Leer sólo una función | `get_code_snippet(qualified_name=<de search_graph>)` |
| Qué rompe mi diff actual | `detect_changes()` |
| Vista general / módulos reales | `get_architecture(aspects=["clusters","hotspots"])` |
| Consultas raras (agregados, multi-salto) | `query_graph` con Cypher y `LIMIT` |
| Texto literal (strings, CSS, copy) | `search_code` o `Grep` |

**Gasto de tokens — lo que más pesa:**

- `search_graph` devuelve hasta **200** resultados si no pasas `limit`, y una
  consulta por concepto suele tener más de cien coincidencias. Pasa siempre
  `limit` (5–20) y pagina con `offset` sólo si `has_more` y lo necesitas.
- `get_architecture` sin `aspects` incluye el árbol de archivos entero: pide
  sólo los aspectos que vas a usar.
- `query_graph` sin `LIMIT` puede devolver miles de filas; su Cypher no tiene
  `split`, `substring` ni `starts_with` como función (usa `STARTS WITH`,
  `CONTAINS`, `count`, `collect`).
- Con `query` (BM25) se ignoran `label` y `name_pattern`: para filtrar por
  etiqueta (`Section`, `Route`…) usa `name_pattern`, que acepta `(?i)`.
- `trace_path` pide el nombre exacto: si dudas, primero `search_graph`.
- Los tests quedan fuera de `trace_path` salvo `include_tests=true`; úsalo
  para saber qué tests cubren una función antes de cambiarla.

Sin MCP cargado (otro cliente, un script) el mismo índice responde por CLI:
`codebase-memory-mcp cli search_graph --project <project> --query "…" --limit 10`.

## Mapa rápido del código

Sale de los clústeres del grafo (`get_architecture`, 2026-09-27). Sirve para
saber dónde empezar a buscar; la verdad sigue siendo el grafo.

| Dominio | Dónde | Puntos de entrada |
| --- | --- | --- |
| Rutas y páginas | `app/[locale]/…` | `SystemPage`, `WorldRoute`, `ObservatoryRoute`, `ContactPage` |
| Catálogo de mundos (núcleo, el mayor fan-in) | `lib/worlds.ts`, `content/worlds.data.ts`, `content/es/worlds/*.mdx` | `getWorld`, `getWorldPath`, `getWorlds` |
| Escena 3D del System Map | `components/scene/` | `createSystemScene`, `createBody`, `renderFrame`, `applyPose` |
| Gargantúa (shader) | `components/scene/gargantua-*.ts` | `gargantua-shaders.ts`, `gargantua-render.ts` |
| Travesía entre mundos | `lib/voyage*.ts`, `components/scene/voyage-pass.ts`, `components/voyage-layer.tsx` | `startVoyage`, `sampleVoyage`, `setVoyage` |
| Proyectos: mesa y esquema | `components/engineering-table.tsx`, `lib/engineering-table.ts`, `components/system-diagram.*` | `EngineeringTable`, `SystemDiagram`, `nodePath`, `tableProject` |
| Proyectos: caso completo | `components/project-case*.tsx`, `lib/case-outline.ts`, `lib/projects.ts` | `ProjectCase`, `CaseViewer`, `getF1AProjects` |
| Proyectos: contenido | `content/projects.data.ts`, `content/es/projects/*.mdx`, `portfolio-content/<proyecto>-2026/` | `validate-projects.ts` |
| Observatorio (Experimentos) | `components/observatory-viewer.tsx`, `components/scene/observatory-*.ts`, `lib/observ*.ts` | `ObservatoryViewer`, `createObservatoryScene`, `applyView` |
| Sonido | `lib/audio-bus.ts`, `lib/sfx.ts`, `lib/audio-samples.ts`, `lib/soundtrack.ts`, `lib/voyage-audio.ts` | `playSfx`, `openAudio`, `configureAudio` |
| Movimiento global | `lib/effects-mode.ts`, `components/motion-toggle.tsx` | `useMotionEnabled`, `useForcedEffects` |
| Cabecera, pie y cielo | `components/site-header.tsx`, `components/site-footer.tsx`, `components/voyage-sky.tsx`, `components/footer-sky.tsx` | `SiteHeader`, `VoyageSky`, `FooterSky` |
| Páginas propias | `components/{miller,edmunds,ranger,about}-*.tsx` | `MillerPage`, `EdmundsGallery`, `RangerCockpit`, `AboutExperience` |
| Contacto y salud (servidor) | `app/api/contact/route.ts`, `app/api/health/route.ts`, `lib/contact-*.ts` | `handleContactRequest` |
| Herramientas de medición | `tools/*.mjs` (ver `tools/README.md`) | — |

## Qué NO está en el grafo

`.cbmignore` saca el código de referencia de v2 (`docs/reference/v2/`), los
scripts temporales de la raíz, `output/`, las fotos, la música, los scripts y
capturas de otros proyectos que viven en `portfolio-content/`, y repite los
artefactos locales (`.lighthouseci/`, `.claude/`, `.next/`, `test-results/`…)
aunque `.gitignore` ya los excluya. `node_modules` nunca entra.

## Mantenimiento

- El índice vive en la máquina (`~/.cache/codebase-memory-mcp/`) y NO se
  versiona: cada equipo indexa el suyo (tarda segundos).
- **Un reindexado sobre el proyecto existente no saca lo que ya estaba dentro,
  y puede no refrescar un archivo cambiado** (el 2026-09-27 dejó `AGENTS.md` y
  el registro con su versión anterior). Si cambias `.cbmignore`, el grafo
  tiene rutas que no deberían estar o una edición no aparece, reconstruye:
  `delete_project` + `index_repository(repo_path=<raíz>, mode="full")` desde
  el MCP (con el servidor abierto la CLI no puede borrar la base:
  `Permission denied`). El 2026-09-27 eso bajó el grafo de 8 174 a unos 4 600
  nodos: tenía los informes de `.lighthouseci/` y los scripts Python de otros
  proyectos.
- Comprobación de limpieza: `npm run graph:check` (exit 0 = «Grafo limpio.»).
  Compara cada ruta del grafo con el disco y con `.gitignore` + `.cbmignore`
  (vía `git check-ignore --no-index`), y lista proyectos indexados dentro de
  la raíz. Sólo lee: el arreglo es siempre la reconstrucción de arriba.
- Síntoma de índice viejo: `search_graph` no encuentra una función que sabes que
  existe. Solución: `index_repository` (permitido sin preguntar en
  `.claude/settings.json`).
