<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cómo trabajar aquí sin gastar contexto (todo agente)

1. **Código → el grafo primero.** El repo tiene UN solo grafo en
   codebase-memory-mcp: proyecto
   `C-Users-savage-Documents-kimi-Workspaces-portafolio-espacial-jonas-orbit-v3`
   (también desde un worktree: no indexes otro). `search_graph` para encontrar
   (siempre con `limit` 5–20: sin él devuelve hasta 200 resultados),
   `trace_path(direction="inbound")` para saber qué rompe un cambio,
   `get_code_snippet` para leer sólo esa función. `Read` antes de editar;
   `Grep` para texto literal, CSS y copy. **Mantenerlo limpio es tuyo:** lo
   nuevo y lo editado entra solo, lo borrado o renombrado NO. Si borraste o
   moviste archivos, al terminar corre `npm run graph:check`; si falla,
   reconstruye (`delete_project` + `index_repository` desde el MCP). Guía, mapa
   por dominio y mantenimiento: `docs/ai/codebase-memory.md`.
2. **Decisiones → una entrada, no el registro.** `docs/registro-de-decisiones.md`
   pasa de 120 KB: `grep -n '^## ' docs/registro-de-decisiones.md` y lee sólo
   la entrada (o `search_graph(name_pattern="(?i).*tema.*", label="Section")`,
   que también busca en `docs/design/`). Igual con los
   documentos de diseño largos y `tools/README.md`: índice de `^#` y la sección.
3. **Nada de >40 KB se lee entero.** Código: `components/scene/bodies.ts`
   (230 KB), `gargantua-shaders.ts` (140), `observatory-viewer.tsx` (90),
   `system-scene.ts` / `observatory-scene.ts` → `get_code_snippet`. CSS:
   `app/globals.css` (120), `observatory.css`, `projects-page.css`,
   `about-page.css` → `Grep` del selector y `offset`/`limit`. Diseño:
   `tesseract-experimentos.md` (200), `hero-gargantua-direction.md` (125),
   `world-visual-language.md`, `endurance-proyectos.md` → sólo la sección.
4. **Salidas largas a un archivo** (`npm run check`, e2e, `tools/`) y lee el
   final o los errores.
5. **El veredicto es visual:** las capturas NO se racionan; `read_page` /
   `get_page_text` comprueban texto, no sustituyen una captura.

# Jonás Orbit v3 — reglas del repositorio

**Qué documento manda en qué.** Cada línea es una decisión vigente del dueño:
el documento enlazado es la fuente de verdad en ESE ámbito y sustituye a los
anteriores en él. El texto completo de cada entrada —porqué, cifras medidas y
trampas— está en `docs/registro-de-decisiones.md`: **léelo (la entrada, no el
archivo entero) antes de tocar ese ámbito**. Las entradas nuevas se escriben
allí, y aquí sólo su línea. El dueño aprobó el diseño actual para publicación
el 2026-09-27; las notas históricas de valoración pendiente siguen describiendo
revisiones individuales, no bloquean por sí solas el diseño actual.

### Jerarquía base

- **Plan** `docs/plans/jonas-orbit-v3-mission-endurance.md` — fuente de verdad
  (eng review CLEAR); matriz de tests en su Appendix A. No abras decisiones
  arquitectónicas nuevas sin pasar por él.
- **Pivote** `docs/plans/sistema-gargantua.md` (08-06) — manda sobre el plan en
  rutas, contrato de cámara, capa visual, transiciones y presupuestos.
- **Dirección del hero** `docs/design/hero-gargantua-direction.md` (08-29) —
  composición, identidad visible (`JONAS ORBIT`, sin bloque personal), HUD,
  interacción, escala, posiciones. **El sistema está quieto**: los cuerpos no
  orbitan.
- **Lenguaje visual** `docs/design/world-visual-language.md` (09-03) — material,
  luz común y bloom-off test de los cinco cuerpos secundarios.
- **Seis destinos** `docs/design/sistema-seis-destinos.md` (09-04) — sin Cooper
  Station.

### Arquitectura narrativa (09-06) — manda sobre todo en significado, etiquetas y rutas

`docs/design/arquitectura-narrativa.md`:

| `WorldId` | Significado | Ruta ES | Ruta EN |
| --- | --- | --- | --- |
| `gargantua` | Sobre mí | `/es/sobre-mi` | `/en/about` |
| `miller` | Formación | `/es/formacion` | `/en/education` |
| `endurance` | Proyectos | `/es/proyectos` | `/en/projects` |
| `edmunds` | Creatividad | `/es/creatividad` | `/en/creativity` |
| `tesseract` | Experimentos | `/es/experimentos` | `/en/experiments` |
| `ranger` | Contacto | `/es/contacto` | `/en/contact` |

El nombre visible de `tesseract` es `Experimentos`, nunca `Laboratorio`.
`/es/desarrollo` y `/es/laboratorio` son 404 sin alias. **`order` es orden
NARRATIVO, no posición** (raíl, DOM, tabulador, sitemap; la escena se indexa por
`WorldId` vía `placement` y `lib/scene-depth.ts`). **El significado vive en el
MDX**, nunca en `worlds.data.ts`.

### Transversales (mandan sobre todo lo anterior en su ámbito)

- **Identidad pública y CV** (10-01) registro de igual nombre — LinkedIn
  `https://www.linkedin.com/in/jonas-javier-encarnacion/`, GitHub
  `https://github.com/JonasJavier`; Multimedia ITLA: ocho meses sin titulación;
  bachillerato: 2018–2022, completado en 2022. Sitio y CV ES/EN coherentes.
- **Publicación en Railway** (09-28) `docs/production-readiness.md` —
  `jonasjavier.dev` es el dominio canónico; Railway construye la rama
  `production` desde GitHub (`npm run check` + healthcheck): **publicar es
  `git push origin <commit>:production` tras los gates**, un push a `main`
  nunca publica. CSP y cabeceras viven en `next.config.ts`; el límite de tasa
  del contacto, en la app. El preview de Cloudflare conserva su prueba de
  compatibilidad `npm run test:worker`.
- **Git: todo en `main`** (09-29) registro «Flujo de git…» — sin ramas de
  feature; la única otra rama es `production` (publicación, no se toca a
  mano). Worktrees sólo `--detach` y temporales; commits por ruta.
- **Idiomas** (09-29) registro «Idiomas — el sitio en inglés» — inglés por
  defecto (`/` → `/en`, cookie para quien eligió español); cada página con
  ruta propia en los dos idiomas, todas desde `lib/page-paths.ts`; layout raíz
  en `app/[locale]`; texto de interfaz en `defineCopy({ es, en })` junto a su
  componente; contenido en `content/{es,en}`. Nada de texto visible nuevo en
  un solo idioma.
- **Blog** (10-01) registro «Blog — sección propia…» — `/es/blog`,
  `/en/blog`, fuera de los seis mundos (enlace con las herramientas de la
  cabecera y en el pie); fondo propio (`blog-sky.tsx`) con la escena dormida;
  entradas largas en Velite `articleProse` con índice y minutos calculados.
- **Servicios** (09-30) registro «Servicios y notas de taller» — servicios
  como hijo de Contacto, cada uno con su caso de prueba, y «Ver servicios»
  en el hero de Contacto; difusión en `docs/difusion/`. Segundo pase
  (10-01): fondo propio con horizonte, capturas reales, proceso y preguntas.
- **SEO — nombre, nicho 3D y freelance** (09-29) registro de igual nombre —
  nombre completo en títulos y H1, «Jonás Javier» el corto; Interstellar en
  descripciones, nunca en títulos; `seoTitle` en los seis especímenes;
  `ProfilePage` en Sobre mí.
- **Repositorio público, SEO y arranque** (09-28) — licencia de sólo lectura
  (`LICENSE`); fuentes (`Fotos/`, `Disenos/`, `portfolio-content/`,
  `assets/`) fuera del repo y del historial, archivadas en el privado
  `jonas-orbit-v3-archivo`; PNG maestras en `assets/media/projects/`;
  `seoTitle`/`seoDescription` por mundo; shaders con `compileAsync`.
- **Dependencias — seguridad** (09-27)
  `docs/reviews/repository-readiness-2026-09-27.md` — versiones parcheadas,
  auditorías y evidencia de la actualización dedicada.
- **Calidad del repositorio y publicación** (09-27)
  `docs/repository-quality.md` y `docs/production-readiness.md` — higiene,
  evidencia reproducible, contrato de entorno y gates de producción.
- **Sonido del sitio** (09-22) `docs/design/sonido-del-sitio.md` — qué suena,
  peso y quién lo apaga. Un solo bus (`lib/audio-bus.ts`); lo apaga el control
  de AUDIO y nadie más. Portada y Miller usan las grabaciones de Jonás
  (`lib/audio-samples.ts`); el resto, recetas de `lib/sfx.ts`. Licencia de los
  dos archivos: el dueño confirmó derechos de publicación (09-27).
  §2 «Compatibilidad» (09-27): rampas portables y autoplay `armed` hasta el gesto.
- **Travesía — sonido, pestillo y alabeo** (09-22)
  `docs/design/travesia-espaciotemporal.md` §«Segundo pase» — sonido sintetizado
  (`lib/voyage-audio.ts`), latido de exposición y 3,4° de alabeo.
- **Travesía espacio-temporal** (09-14) mismo documento — 2,6 s en cuatro fases;
  navega por temporizador, nunca desde un fotograma; versión reducida sin escena.
- **Un solo interruptor de movimiento** (09-13)
  `docs/design/movimiento-unificado.md` — `components/motion-toggle.tsx` apaga
  todo; por defecto encendido; ninguna página guarda pausa propia. §«El icono»
  (09-22): ON/OFF se leen quietos (halo + `ON` / discontinuo, tachado + `OFF`),
  mismo lenguaje en AUDIO, que arranca ON (`armed` hasta el primer gesto).
  §«Tres lecturas» (09-23): el encendido por defecto supera reduced-motion;
  sólo el pedido (`useExplicitEffects`) monta la escena en GPU por software,
  2G o 2 GB. La suite e2e corre en SwiftShader: una sonda con la GPU real no
  reproduce sus fallos.
- **System Map — respuesta al puntero** (09-21)
  `docs/design/endurance-navigation-interface.md` §14 — `MAP_HOVER_MODE`
  (`sencillo`); el modo `instrumento` se conserva, no se borra. §12 y §13:
  marco del overlay (`fixed`) y condiciones del puntero.
- **Placa del operador** (09-30) registro «Home — placa del operador…» y
  `hero-gargantua-direction.md` §7 ter — bajo `JONAS ORBIT`, nombre corto y
  rol (ES/EN) en tipografía de HUD; en el teléfono (10-01) sólo el rol, en una
  línea a la izquierda, con el selector de idioma debajo. `aria-hidden`: el `<h1>` oculto ya lo dice.
- **HUD de Gargantúa** (09-23)
  `docs/design/hero-gargantua-direction.md` §7 bis — sin retículo fijo en el
  centro; marco, TARGET y retículo móvil del puntero se conservan.
- **Cabecera** (09-13) `docs/design/identity-gargantua.md` §«Observatorio y
  acento por mundo» — navbar minimalista, acento por mundo, siempre DOS CV
  (ES/EN), cielo en `voyage-sky.tsx`.

### Por página

- **Rendimiento móvil** (09-29) registro «Rendimiento móvil — PageSpeed…» —
  `sizes` a lo que se pinta, recortes `-movil` de las cabeceras con precarga
  por `media`; en rutas cubiertas la escena, su sonda WebGL y el agua de
  Miller esperan a `lib/after-load-idle.ts`. Se mide con Lighthouse local
  en A/B (medianas), nunca contra cifras de PageSpeed.
- **Móvil compacto** (09-29) registro «Móvil compacto — adaptar, no
  comprimir» — raíl de la home sólo texto, Gargantúa más pequeño, constelación
  de Sobre mí en el teléfono, footer mínimo, certificados en 2-3 columnas,
  Contacto sin manifiesto ni firma, ESTUDIO en una franja. Sólo CSS de
  teléfono; se oculta, no se reescribe copy.
- **Resolución adaptable en el teléfono** (09-29) registro «Resolución
  adaptable…» — en táctil y `orbit` la escena prueba 1 → 1,5 px por punto
  mientras sostenga su propio mejor ritmo (no 60 fps fijos: 90-120 Hz) y
  deshace (y cierra) el escalón que no lo sostiene
  (`resolution-governor.ts`); `deep` y software, intactos.
- **Móvil en todo el sitio** (09-29) registro «Auditoría responsive del sitio
  en móvil» — bandeja que se retira al leer en táctil (`system-tray.tsx`),
  galería sin modo cine en táctil, suelo de lectura ~10 px, observatorio y
  caso ajustados. Valoración visual pendiente.
- **Home en móvil** (09-28) registro «Home en móvil — escenario compartido…» —
  cabecera en una fila, escenario `--home-stage-*` y UNA composición vertical
  (`portrait` de `lib/flat-composition.ts`) para atlas y escena; raíl en panel
  3 × 2; cuerpos tocables. Segundo pase (09-29): naves con más presencia,
  «Toca para explorar» de una sola vez, raíl más bajo. Escritorio intacto.
- **Footer** (09-23) `docs/design/footer-observatorio.md` — complemento de la
  navbar: §«Segundo pase» manda en paleta exacta compartida y fugaces más
  visibles; mapa orbital y seis destinos;
  movimiento global y suspensión fuera de pantalla. Valoración visual pendiente.

- **Sobre mí** `docs/design/sobre-mi-constelacion.md` — constelación (09-14),
  exploración (09-15), revisión editorial (09-15), simplificación (09-15) y
  pase de pulido (09-22: Raíces a dos columnas, cintas automáticas en CSS que
  corren con reduced-motion). Publicación de E03/Bonao City pendiente.
- **Formación / Miller** `docs/design/miller-formacion.md` §«Océano en WebGL2 y
  formación en curso» (09-12) — `education.inProgress`.
- **Proyectos** `docs/design/endurance-proyectos.md` — **§17 «Tercer pase»
  (09-25) manda** en capas, mesa, muelle y caso completo: **Producto**
  (alcance en la mesa) · Diseño (`designDecisions`: problema → decisión) ·
  Ingeniería (`nodePath`, sólo carriles ocupados, quinto carril
  `integraciones`); sala = render horneado. §18–§22 (09-26/28): OMSTA (con
  app móvil), Network, Delicaté, Izak's Photos (estudio de demostración) y
  Wikiverse rehechos con el mismo método desde `portfolio-content/<proyecto>-2026/`
  (`module`/`scope`/`luma` por captura, `stack`, `tech` por nodo; la mesa sólo
  monta lo que levanta). Escena dormida en TODA ruta de Endurance; el botón del
  producto vivo sale de `links` `kind: demo`. Ya no hay fichas breves reales.
  Abiertos: redacción de `scope`/`designDecisions` (borrador). **Teléfono**
  (09-29) registro «Proyectos en el teléfono»: la mesa no se aplana (sala,
  holograma con perspectiva por pantalla y `z-index`, cristal en trapecio);
  el caso compacto (carrusel de decisiones, lectura plegada con `CaseFold`).
  Segundo pase: el proyecto primero —muelle plegado en `‹ 01 / 05 ›`, sólo
  la decisión en Diseño, salidas pequeñas al final—.
- **Creatividad / Edmunds** `docs/design/edmunds-creatividad.md` — cubierta de
  observación (09-11), sexto pase de nitidez y arrastre (09-12), mosaico en
  filas justificadas (09-22, `lib/mosaic-rows.ts`). La curación es del dueño.
- **Experimentos / Observatorio** `docs/design/tesseract-experimentos.md` —
  recepción y encendido (09-17), V1.5 instrumentos, V2 dos modos
  OBSERVAR/ESTUDIO (09-18), V3 Gargantúa (09-19), V4 Ranger (09-19), V5 Miller
  y Edmunds, catálogo 06/06 (09-20), V6 mando EJE (09-20), simplificación y
  silencio (09-23: pie en una frase, sin «LISTO», sin sonidos). Los `registro`
  de cada espécimen son la voz de Jonás: no se escriben.
- **Contacto / Ranger** `docs/design/ranger-contacto.md` §«Hero mínimo y
  panel de enlace» (09-23: un botón, formulario antes que los canales, un solo
  panel correo/WhatsApp/LinkedIn + radar/CV/GitHub) manda en primera pantalla
  y orden; §«Travesía por el agujero de gusano» (09-22) en ventanal, shader e
  interruptor; §«Cabina de mando» (09-13, aprobada) en el resto.

### Cuerpos y escena del System Map

- **Gargantúa** `docs/design/hero-gargantua-direction.md` — §14 undecies (el
  bloom no enciende la sombra), §14 duodecies (pase final), §14 terdecies
  (cohesión del disco), §14 quaterdecies (gramática común, macro-densidad,
  borde y enrollado 0.60, rodilla 4.2), §14 quindecies (cielo: menos trazo,
  nebulosas lejanas, Endurance −8 %).
- **Escala de los cuerpos** mismo documento — §14 quáter, sexies, septies,
  decies y quindecies (la última fila de cada cuerpo manda). §14 quinquies:
  posiciones de Miller y Tesseracto. §14 octies: el cielo fuera del remolino.
  §11 bis/ter y §14 nonies: retículo y rastro del puntero.
- **Endurance** `docs/design/endurance-jerarquia.md` §«Cuarto pase — doce
  módulos y tres siluetas» (09-21) manda sobre los pases anteriores.
- **Miller** `docs/design/world-visual-language.md` §9 quinquies (océano
  encendido y en movimiento) — revierte §9 ter.
- **Edmunds** mismo documento §9 sexies (geología, no textura).
- **Fase 1 — Endurance, Edmunds, Ranger** §9 bis; §9 quater: el foco no borra
  el material.
- **Tesseracto** `docs/design/atlas-tesseract-reference.md` §«Hipercubo de
  cristal» + §«V4 — pase de pulido» (base canónica: sólo se pule). El mismo
  documento manda en raíl y atlas plano.

## Comandos

- `npm run check` — lint + typecheck + knip + test + build (lo que corre CI).
- `npm run test:e2e` — Playwright; requiere `npm run build` previo.
- `npm run content` — compila el contenido (Velite). Los scripts `pre*` ya lo
  corren antes de dev/build/typecheck/test.

**Nunca canalices `npm run check` por una tubería** (`| tail`, `| head`): el
código de salida pasa a ser el del último comando de la tubería y un build roto
se lee como verde. Redirige a un archivo y consulta `$?`.

### Trampas de medición (cada una costó una entrega; detalle en el registro)

- Toda herramienta de captura escribe `jonas-orbit:reducir-efectos = "false"`
  en `localStorage`, o mide el perfil plano y no la escena.
- En Chromium headless rAF se para si nada fuerza un pintado: captura en cadena
  (pantallazos de 8 px) y lee el contador de `DATOS`.
- `next start` no recoge una reconstrucción en caliente; `npm run dev` añade
  25 px > 250 (`NEXTJS-PORTAL`) a cualquier captura.
- Audio: mide en el hilo de audio (`ScriptProcessor`), no con rAF; hay DOS
  `AudioContext` (bus y banda sonora); el primer sonido de una sesión no sirve
  de muestra.
- Un valor sólo está verificado cuando MOVERLO mueve la medida.
- `prefers-reduced-motion` está activo en el equipo del dueño y `globals.css`
  deja las transiciones en 0,01 ms (firma: `1e-05s`).
- Mide el gesto con `event.timeStamp`, nunca con el reloj del manejador.

## Entorno de desarrollo

- Node fijado en `.nvmrc` (24); CI usa 24. Node 26 también funciona.
- `.env.local` (ignorado por git) lleva los ajustes de máquina. Si `workerd`
  no arranca en tu equipo — Windows con VBS/HVCI aborta con *access violation* —
  usa `CF_DEV_CONTEXT=off`: `next.config.ts` se salta Miniflare y
  `readContactBindings()` cae a `process.env`. El preview real de Cloudflare se
  sigue verificando en CI; producción apunta a Railway con `next start` y
  variables de entorno del servicio.

## Reglas no negociables (vienen del plan)

1. **Un solo pipeline MDX: Velite.** Prohibido añadir otro procesador MDX sin
   retirar este (plan B documentado: gray-matter + Zod + next-mdx-remote — uno
   u otro, nunca ambos).
2. **Versiones fijadas.** `package.json` sin `^`/`~`. Actualizar dependencias
   solo en tarea dedicada, tras pasar la suite completa. Los `overrides` de
   postcss/sharp existen por avisos de npm audit sobre deps transitivas de
   Next — revisar si siguen haciendo falta al subir Next.
3. **Cero huérfanos.** Knip corre en CI: nada de deps sin uso, exports sin
   consumidor ni componentes experimentales sueltos. `tailwindcss` está en
   `ignoreDependencies` porque se usa vía `@import "tailwindcss"` en CSS, que
   Knip no sigue.
4. **Identidad canónica `WorldId`.** La unión estructura↔prosa usa el id, nunca
   el slug de URL. Texto visible al usuario JAMÁS en `content/worlds.data.ts`.
5. **Sin sniffing del auditor.** Prohibido código cuya única función sea
   alterar una auditoría (Lighthouse se audita vía `?no3d=1` explícito, que es
   el mismo mecanismo del botón "Reducir efectos").
6. **La cámara no tiene controlador.** *(Sustituye a la regla anterior «scroll =
   fuente de verdad de la cámara», retirada por el pivote.)* La pose es una
   función pura de la ruta activa: `cameraPose = f(routeWorldId)`. Prohibidos
   `OrbitControls`, drag, rueda y cualquier acoplamiento al scroll. Único input
   continuo permitido: paralaje aditivo ≤ 2° desde puntero/giroscopio, apagado
   con reduced-motion. Las transiciones son guionadas, interrumpibles y con
   timeout duro: **la animación nunca es dueña del router**.
7. **La escena nunca es el contenido.** El HTML servido de cada ruta contiene el
   texto real sin JavaScript — en `/es`: nombre, rol, dos CTAs, CV y seis
   enlaces `<a href>` a los mundos. Nombre, rol, CTAs y CV forman el fallback
   semántico, pero **no** un bloque personal visible dentro del Hero; el raíl sí
   presenta los destinos. El canvas es `aria-hidden`, va detrás y nunca es
   candidato a LCP. Un reclutador con red lenta, un lector de pantalla y
   Googlebot conservan el mismo significado y las mismas rutas.
8. **Contenido honesto.** Sin lorem ipsum, sin métricas inventadas, sin
   placeholders disfrazados. Las fichas breves son un formato completo.
9. **Middleware:** no existe. `/` → `/en` (o `/es` con la cookie del
   selector) es un redirect estático en `next.config.ts`; con el inglés ya
   publicado, el `proxy.ts` de F2A no hace falta (registro «Idiomas»).

## Referencias de v2

`docs/reference/v2/` es código de la versión anterior SOLO como referencia
(fuera de tsconfig, Knip y el grafo): se adapta, nunca se importa.
`performance.ts` es la base del gate de capacidad de F2B.

## Al terminar una feature

Ninguna feature se considera completa sin sus tests del Appendix A
implementados y estables. Antes de cerrar una fase: revisión de bundle y
eliminación de experimentos sueltos.
