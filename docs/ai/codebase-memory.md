# El grafo de código (codebase-memory-mcp)

Guía para agentes (Claude Code, Codex…) que trabajan en este repo. El grafo es
un índice local del código —funciones, tipos, rutas, llamadas, imports y
encabezados de los `.md`— que responde en ~500 tokens lo que un barrido con
`grep` + `Read` cuesta en decenas de miles.

**Regla:** antes de tocar código cuya ubicación o impacto no conoces, pregunta
al grafo. Después lee el archivo con `Read` (siempre antes de editar). Para
decisiones de diseño, el grafo NO sustituye a `docs/design/*.md`: te dice
*dónde* está algo, los documentos dicen *por qué*.

## Proyecto

```
project = "C-Users-savage-Documents-kimi-Workspaces-portafolio-espacial-jonas-orbit-v3"
```

Si `list_projects` no lo muestra o `index_status` dice que no está, indexa:
`index_repository(repo_path=<raíz del repo>, mode="full")`. El servidor tiene
`auto_index` y `auto_watch` activos, así que normalmente ya está al día.

## Qué pregunta hacer y con qué herramienta

| Necesito… | Llamada |
| --- | --- |
| Encontrar dónde vive algo por concepto | `search_graph(query="audio bus mute limiter")` |
| Encontrar por nombre | `search_graph(name_pattern=".*Voyage.*", label="Function")` |
| Quién llama a X (impacto antes de cambiarlo) | `trace_path(function_name="startVoyage", direction="inbound")` |
| Qué llama X | `trace_path(function_name="createSystemScene", direction="outbound")` |
| Leer sólo una función | `get_code_snippet(qualified_name=<de search_graph>)` |
| Qué rompe mi diff actual | `detect_changes()` |
| Vista general / módulos reales | `get_architecture(aspects=["overview"])` |
| Consultas raras (agregados, multi-salto) | `query_graph` con Cypher y `LIMIT` |
| Texto literal (strings, CSS, copy) | `search_code` o `Grep` |

Trucos:

- `trace_path` pide el nombre exacto: si dudas, primero `search_graph`.
- `get_code_snippet` con el `qualified_name` completo evita leer un archivo de
  1 500 líneas para ver 20 (los shaders y `system-scene.ts` son enormes).
- Los tests quedan fuera de `trace_path` salvo `include_tests=true`; úsalo
  para saber qué tests cubren una función antes de cambiarla.
- `search_graph` pagina: mira `has_more`.

## Mapa rápido del código

Sale de los clústeres del grafo (`get_architecture`). Sirve para saber dónde
empezar a buscar; la verdad sigue siendo el grafo.

| Dominio | Dónde | Puntos de entrada |
| --- | --- | --- |
| Rutas y páginas | `app/[locale]/…` | `SystemPage`, `WorldRoute`, `ObservatoryRoute`, `ContactPage` |
| Catálogo de mundos (núcleo, fan-in 23) | `lib/worlds.ts`, `content/worlds.data.ts`, `content/es/worlds/*.mdx` | `getWorld`, `getWorldPath`, `getWorlds` |
| Escena 3D del System Map | `components/scene/` | `createSystemScene`, `createBody`, `renderFrame`, `applyPose` |
| Gargantúa (shader) | `components/scene/gargantua-*.ts` | `gargantua-shaders.ts`, `gargantua-render.ts` |
| Travesía entre mundos | `lib/voyage*.ts`, `components/scene/voyage-pass.ts`, `components/voyage-layer.tsx` | `startVoyage`, `sampleVoyage`, `setVoyage` |
| Observatorio (Experimentos) | `components/observatory-viewer.tsx`, `components/scene/observatory-*.ts`, `lib/observ*.ts` | `ObservatoryViewer`, `createObservatoryScene`, `applyView` |
| Sonido | `lib/audio-bus.ts`, `lib/sfx.ts`, `lib/audio-samples.ts`, `lib/soundtrack.ts`, `lib/voyage-audio.ts` | `playSfx` (fan-in 21), `openAudio`, `configureAudio` |
| Movimiento global | `lib/effects-mode.ts`, `components/motion-toggle.tsx` | `useMotionEnabled`, `useForcedEffects` |
| Cabecera y cielo | `components/site-header.tsx`, `components/voyage-sky.tsx` | `SiteHeader`, `VoyageSky` |
| Páginas propias | `components/{miller,edmunds,ranger,about}-*.tsx` | `MillerPage`, `EdmundsGallery`, `RangerCockpit`, `AboutExperience` |
| Contacto (servidor) | `app/api/contact/route.ts`, `lib/contact-*.ts` | `handleContactRequest` |
| Herramientas de medición | `tools/*.mjs` (ver `tools/README.md`) | — |

## Qué NO está en el grafo

`.cbmignore` saca el código de referencia de v2 (`docs/reference/v2/`), los
scripts temporales de la raíz, `output/`, las fotos y los scripts de otros
proyectos que viven en `portfolio-content/`. Lo que ignora `.gitignore`
(`node_modules`, `.next`, `.velite`, `.shots`…) tampoco entra.

## Mantenimiento

- El índice vive en la máquina (`~/.cache/codebase-memory-mcp/`) y NO se
  versiona: cada equipo indexa el suyo (tarda segundos).
- Si cambias `.cbmignore`, un reindexado incremental conserva los nodos de lo
  que acabas de excluir: borra y vuelve a indexar
  (`delete_project` + `index_repository`) desde el MCP, no desde la CLI —con el
  servidor abierto la CLI no puede borrar la base (`Permission denied`).
- Síntoma de índice viejo: `search_graph` no encuentra una función que sabes que
  existe. Solución: `index_repository`.
