# Code knowledge graph (codebase-memory-mcp)

This guide is for agents working in this repository. The local graph indexes functions, types, routes, calls, imports, and Markdown headings. It can locate relevant code with far less context than a broad text search.

**Rule:** before changing code whose location or impact you do not know, ask the graph. Then read the actual file before editing it. The graph finds design decisions; the documents under `docs/design/` explain why they were made.

## One graph per repository

```text
project = "C-Users-savage-Documents-kimi-Workspaces-portafolio-espacial-jonas-orbit-v3"
```

This is the project's graph on the owner's machine. Reuse it from branches and worktrees; indexing a worktree as a separate named project creates a second graph that no one maintains. On another machine, the project identifier may differ because it is derived from the repository path.

The server has `auto_index` and `auto_watch` enabled. New and edited files from the main checkout usually appear within a minute. Deleted and renamed files **do not reliably disappear**. After deleting or moving files, run `npm run graph:check`; if it finds stale entries, rebuild using `delete_project` and `index_repository` through the MCP. Do not enable `persistence: true`; `/.codebase-memory/` is ignored by Git.

## Choose the right query

| Need | Call |
| --- | --- |
| Find a concept | `search_graph(query="audio bus mute limiter", limit=10)` |
| Find a symbol by name | `search_graph(name_pattern=".*Voyage.*", label="Function", limit=20)` |
| Find a decision or Markdown section | `search_graph(name_pattern="(?i).*agujero.*", label="Section", file_pattern="docs/*", limit=5)`, then locate its line |
| See callers before changing a function | `trace_path(function_name="startVoyage", direction="inbound")` |
| See what a function calls | `trace_path(function_name="createSystemScene", direction="outbound")` |
| Read one function | `get_code_snippet(qualified_name=<value from search_graph>)` |
| Inspect the current diff's impact | `detect_changes()` |
| Get an architecture overview | `get_architecture(aspects=["clusters","hotspots"])` |
| Make a complex multi-hop query | `query_graph` with Cypher and `LIMIT` |
| Find literal strings, CSS, or copy | `search_code` or `rg` |

Keep queries narrow:

- Always set `limit` on `search_graph` (typically 5–20). Without it, a query may return 200 results. Page with `offset` only when `has_more` and more results are needed.
- Request only useful `get_architecture` aspects; otherwise it can include the entire file tree.
- Add `LIMIT` to Cypher queries. This implementation supports `STARTS WITH`, `CONTAINS`, `count`, and `collect`, but not `split`, `substring`, or a `starts_with` function.
- A BM25 `query` ignores `label` and `name_pattern`. Use `name_pattern` to filter labels such as `Section` or `Route`.
- `trace_path` needs an exact name. Find the symbol first, and use `include_tests=true` if test callers matter.

If MCP is unavailable, the same index can be queried with the CLI:

```bash
codebase-memory-mcp cli search_graph --project <project> --query "..." --limit 10
```

## Quick code map

This map came from `get_architecture` on 2026-09-27. It helps choose a starting point; the graph remains the current index.

| Area | Where | Entry points |
| --- | --- | --- |
| Routes and pages | `app/[locale]/` | `SystemPage`, `WorldRoute`, `ObservatoryRoute`, `ContactPage` |
| World catalog | `lib/worlds.ts`, `content/worlds.data.ts`, `content/es/worlds/*.mdx` | `getWorld`, `getWorldPath`, `getWorlds` |
| System Map 3D scene | `components/scene/` | `createSystemScene`, `createBody`, `renderFrame`, `applyPose` |
| Gargantua shader | `components/scene/gargantua-*.ts` | `gargantua-shaders.ts`, `gargantua-render.ts` |
| World-to-world journey | `lib/voyage*.ts`, `components/scene/voyage-pass.ts`, `components/voyage-layer.tsx` | `startVoyage`, `sampleVoyage`, `setVoyage` |
| Project table and diagram | `components/engineering-table.tsx`, `lib/engineering-table.ts`, `components/system-diagram.*` | `EngineeringTable`, `SystemDiagram`, `nodePath`, `tableProject` |
| Full project case | `components/project-case*.tsx`, `lib/case-outline.ts`, `lib/projects.ts` | `ProjectCase`, `CaseViewer`, `getF1AProjects` |
| Project content | `content/projects.data.ts`, `content/es/projects/*.mdx`, `portfolio-content/<project>-2026/` | `validate-projects.ts` |
| Observatory | `components/observatory-viewer.tsx`, `components/scene/observatory-*.ts`, `lib/observ*.ts` | `ObservatoryViewer`, `createObservatoryScene`, `applyView` |
| Sound | `lib/audio-bus.ts`, `lib/sfx.ts`, `lib/audio-samples.ts`, `lib/soundtrack.ts`, `lib/voyage-audio.ts` | `playSfx`, `openAudio`, `configureAudio` |
| Global motion | `lib/effects-mode.ts`, `components/motion-toggle.tsx` | `useMotionEnabled`, `useForcedEffects` |
| Header, footer, sky | `components/site-header.tsx`, `components/site-footer.tsx`, `components/voyage-sky.tsx`, `components/footer-sky.tsx` | `SiteHeader`, `VoyageSky`, `FooterSky` |
| Destination pages | `components/{miller,edmunds,ranger,about}-*.tsx` | `MillerPage`, `EdmundsGallery`, `RangerCockpit`, `AboutExperience` |
| Contact and health APIs | `app/api/contact/route.ts`, `app/api/health/route.ts`, `lib/contact-*.ts` | `handleContactRequest` |
| Measurement tools | `tools/*.mjs` | See [tools/README.md](../../tools/README.md) |

## Exclusions

`.cbmignore` excludes the v2 reference code, temporary root scripts, `output/`, photos, music, other projects' scripts and captures under `portfolio-content/`, and local artifacts such as `.lighthouseci/`, `.claude/`, `.next/`, and `test-results/`. `node_modules` is never indexed.

## Maintenance

- The index is local at `~/.cache/codebase-memory-mcp/`; each machine builds its own.
- Reindexing an existing project may leave stale paths or content. If `.cbmignore` changes or graph results are stale, rebuild with `delete_project` followed by `index_repository(repo_path=<repository root>, mode="full")` through MCP. The CLI cannot delete the database while the server holds it open.
- Run `npm run graph:check` after moves or deletions. It compares graph paths with disk and ignore rules, and reports duplicate worktree projects. A clean run exits 0.
- If a known function is missing, run `index_repository` to refresh the graph.
