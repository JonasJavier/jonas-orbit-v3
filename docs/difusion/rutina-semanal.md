# Rutina semanal de publicación (desde 2026-10-05)

Acordada con Jonás el 2026-10-03. Manda sobre la cadencia de
[`docs/presencia-web.md`](../presencia-web.md) §2 y §4. **Claude prepara y
publica todo; Jonás confirma cada publicación** con un «sí» en la sesión de
la tarea antes de que salga (una publicación no se envía sin esa respuesta).
Las tareas corren en el PC de Jonás (Claude Desktop → tareas programadas)
porque necesitan su Brave con las sesiones abiertas y la extensión de Claude;
si el PC está apagado, la tarea corre al volver a abrir la app.

## 1. Dónde se publica

| Canal | Página | Cuenta |
| --- | --- | --- |
| LinkedIn | <https://www.linkedin.com/in/jonas-javier-encarnacion/> | Jonás (sin verificar: límite diario de publicaciones; programar también cuenta) |
| Blog EN | <https://jonasjavier.dev/en/blog> | Repo → rama `production` |
| Blog ES | <https://jonasjavier.dev/es/blog> | Repo → rama `production` |
| dev.to | <https://dev.to/jonasjavier> | `jonasjavier` (editor «basic markdown»; una publicación cada 5 min como máximo) |
| Foro de Three.js | <https://discourse.threejs.org> → **Resources** (Showcase sólo para un proyecto nuevo que se pueda abrir) | `jonas_javier`, nivel 1, GitHub conectado |
| Google Business Profile | <https://business.google.com> → Novedades | Jonás |
| Hacker News | <https://news.ycombinator.com> | `JonasJavier` — sólo el Show HN puntual (§6) |

## 2. Calendario (hora de Santo Domingo)

| Día | Hora | Tarea programada | Qué sale |
| --- | --- | --- | --- |
| Lunes | 09:00 | `semanal-lunes-preparacion` | Nada público. Borrador de la entrada del blog (ES + EN), borrador del post del foro, repaso de comentarios en todos los canales. Jonás revisa y aprueba. |
| Martes | 13:00 | `semanal-martes-linkedin-blog` | **Post 1 de LinkedIn** + **entrada del blog** en el sitio (ES + EN) + **copia en dev.to**. |
| Jueves | 09:00 | `semanal-jueves-linkedin-gbp` | **Post 2 de LinkedIn** + **novedad en Google Business Profile**. |
| Viernes | 09:00 | `semanal-viernes-foro` | **Post semanal del foro de Three.js**. |
| Día 27 | 09:00 | `mensual-27-revision` | Informe: Search Console, dev.to, LinkedIn, foro; reordenar las colas. |

Dos posts de LinkedIn por semana, ni uno más. Una entrada de blog por semana.
Un post del foro por semana.

## 3. Regla de confirmación (todas las tareas que publican)

1. Preparar la pieza completa: texto final, imágenes (rutas locales) y
   enlaces, comprobando que cada enlace responde 200 en producción.
2. Enseñarla a Jonás en el chat de la sesión tal y como va a salir y
   preguntar «¿Publico?».
3. Publicar sólo tras un «sí» explícito en ESA sesión. Si dice que cambie
   algo, cambiarlo y volver a preguntar. Si no responde, no se publica: la
   pieza queda para la siguiente sesión y se anota en el registro (§8).
4. Tras publicar, abrir la URL pública, comprobar que se ve bien (captura) y
   anotar la URL en el registro (§8).

## 4. LinkedIn (martes y jueves)

- Fuente: [`docs/linkedin-audit/calendario-publicaciones.md`](../linkedin-audit/calendario-publicaciones.md),
  en orden: el primer post cuyo estado no sea «publicado» ni «programado».
  Mirar antes en LinkedIn (perfil → Actividad, y Publicaciones programadas)
  que no esté ya publicado o programado: el #1 quedó programado para el
  mar 6 oct a las 9:00 y el #2 guardado como borrador el 2 oct.
- Texto tal cual el calendario (ya aprobado), con sus 1–3 imágenes en JPG
  generadas desde `public/` (capturas reales de los casos o del blog).
- Cuando se acaben los 12, redactar los siguientes con el mismo método (una
  decisión concreta por post, datos sólo de `content/` y del blog, enlace al
  caso y al portafolio) desde los proyectos de Jonás Orbit: OMSTA, Delicaté,
  Network, Wikiverse, Izak's Photos (estudio ficticio de demostración, nunca
  «cliente»), los especímenes del Observatorio y las entradas del blog; y
  añadirlos al calendario antes de publicarlos.
- Si LinkedIn corta por el límite diario, no forzar: anotarlo y reintentar
  en la siguiente tarea.

## 5. Blog + dev.to (borrador el lunes, publicación el martes)

**Lunes — borrador.** Primer tema «pendiente» de la cola de
`docs/presencia-web.md` §5. Escribir `docs/difusion/borradores/<id>/es.mdx`,
`en.mdx` y `notas.md` con las reglas de §5.1, marcar la fila como
«borrador (fecha)» y enseñárselo a Jonás. Sus cambios se aplican ese mismo
lunes.

**Martes — publicación** (sólo si Jonás aprobó el borrador):
1. Mover los MDX a `content/{es,en}/articles/`, añadir el id a
   `content/articles.data.ts`, figuras a `public/images/articulos/<carpeta>/`
   en `-800.webp` y `-1600.webp` (capturas con GPU real: `tools/README.md`).
   Si falta una figura imprescindible y no se puede capturar, la entrada se
   aplaza una semana y se avisa.
2. `npm run check` redirigido a un archivo (nunca por tubería) y el e2e del
   blog (`e2e/blog.spec.ts`). Commit por ruta en `main`, push, y publicar con
   `git push origin <commit>:production`. Esperar el despliegue de Railway en
   verde y abrir las dos URL.
3. dev.to: `node --experimental-strip-types tools/prepare-devto.mjs` → pegar
   `docs/difusion/devto/<id>.md` entero en <https://dev.to/new>. Confirmar
   con Jonás antes de guardar (§3).
4. Fila de la cola → «publicado (fecha, URL del blog, URL de dev.to)».

### 5.1 Reglas de redacción

- Front matter exactamente como las entradas existentes: `id`, `slug`
  (distinto por idioma), `title`, `summary` (≤ 220), `coverAlt`, `seoTitle`
  (≤ 60), `seoDescription` (110–160). Comprobar longitudes con un comando.
- 1400–2200 palabras, 6–10 secciones `## `, primera persona, voz de Jonás:
  directo, frases cortas, sin adjetivos de relleno ni promesas de marketing,
  una nota honesta de lo que no está resuelto, cierre «## Pruébalo» /
  «## Try it» con la página que toque y servicios (`/es/contacto/servicios`,
  `/en/contact/services`). El inglés se escribe para quien busca en inglés,
  no se traduce literal. «Interstellar» en descripciones, nunca en títulos.
- Enlaces internos relativos y del idioma de la entrada, sólo a páginas que
  existen (`lib/page-paths.ts`, `lib/path-segments.ts`, slugs de `content/`).
- Cifras sólo las que estén literalmente en las fuentes, citadas en
  `notas.md`; sin clientes que no estén ya nombrados en `content/`; sin
  precios («depende del alcance»).
- Lectura de fuentes con poco contexto: `docs/registro-de-decisiones.md` por
  entrada (`grep -n '^## '`), documentos largos por sección, código grande
  por función (grafo de codebase-memory, `AGENTS.md`).

## 6. Foro de Three.js (viernes)

- **Uno por semana, en Resources.** Showcase sólo si hay un proyecto nuevo
  que se pueda abrir. Nunca servicios, nunca «contrátame»: el valor es la
  técnica y el demo.
- **Tema del viernes:** si la entrada de esa semana es de 3D, el post sale
  de ella. Si no, el siguiente «pendiente» de la cola del foro (§6.1).
- Formato (inglés): título concreto de ≤ 80 caracteres y sin reclamo;
  150–350 palabras en primera persona; qué es y dónde corre (URL absoluta);
  2–3 detalles técnicos con cifras de las fuentes; un fragmento de código
  corto si aplica; qué no está resuelto; una pregunta abierta; al final el
  write-up del blog si existe. 1–2 imágenes de `public/images/`. Etiquetas
  existentes del foro (consultar `/tags/filter/search.json`), máximo 5.
- El lunes se escribe el borrador en `docs/difusion/borradores/foro-<fecha>.md`
  y se enseña con el resto; el viernes se publica tras el «sí».
- Antes de publicar, responder (con el «sí» de Jonás a cada respuesta) a los
  comentarios pendientes en los temas anteriores.

### 6.1 Cola del foro

| # | Tema | Página / fuente | Estado |
| --- | --- | --- | --- |
| 0 | Gargantua — ray-traced black hole (Showcase) | `/en/experiments/observatory/gargantua` | publicado (2026-10-03, t/94960) |
| 1 | Miller's ocean: WebGL2 water that never blocks the page | entrada `miller-ocean-webgl2` de la cola del blog | pendiente |
| 2 | A 4D tesseract from four bits (XOR edges) | `/en/blog/4d-tesseract-in-three-js` | pendiente |
| 3 | The wormhole voyage: one shader, 2.6 s and synthesized sound | `docs/design/travesia-espaciotemporal.md`, `lib/voyage-audio.ts` | pendiente |
| 4 | Keeping bloom out of a black hole's shadow (SavePass + mask) | `content/en/articles/gargantua-webgl.mdx` §«The shadow the bloom was lighting up» | pendiente |
| 5 | Adaptive resolution on phones: step up only what the device sustains | `lib/resolution-governor.ts`, registro «Resolución adaptable…» | pendiente |
| 6 | Endurance: twelve modules, three silhouettes | `docs/design/endurance-jerarquia.md` §«Cuarto pase» | pendiente |
| 7 | A 3D portfolio Google can read (no-JS fallback, flat 2D) | `/en/blog/3d-portfolio-webgl-seo-and-performance` | pendiente |
| 8 | Edmunds: geology, not texture | `docs/design/world-visual-language.md` §9 sexies | pendiente |
| 9 | Designing an instrument, not a viewer: the Observatory | `docs/design/tesseract-experimentos.md` V1–V6 | pendiente |

## 7. Google Business Profile (jueves)

Novedad con la entrada de la semana: 2–3 frases en español, imagen 4:3
(de `public/images/articulos/<carpeta>/`, recortada) y botón «Más
información» a la entrada en español. Sin precios ni promesas.

## 8. Hacker News

Show HN **una sola vez por proyecto**: el de Gargantúa el martes 2026-10-06
entre las 8 y las 10 (tarea única `show-hn-gargantua`; texto en
[`README.md`](README.md) §5). Nada semanal en HN: repetir el mismo sitio se
modera como spam y puede vetar el dominio. Otro Show HN sólo cuando haya
algo nuevo que se pueda probar (un espécimen, una herramienta), como mucho
uno cada uno o dos meses, y siempre preguntando antes.

## 9. Registro de la rutina

Cada tarea añade al final de [`borradores/README.md`](borradores/README.md)
una línea: fecha, tarea, qué se publicó (URL) o qué quedó pendiente y por
qué. Commit por ruta en `main` (sólo documentación cuando no hay entrada).

## 10. Revisión mensual (día 27)

Search Console (consultas, páginas, indexación), estadísticas de dev.to,
impresiones de LinkedIn, visitas y respuestas del foro. Informe breve para
Jonás y, si hace falta, reordenar las colas del blog (§5 de
`presencia-web.md`) y del foro (§6.1).
