<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

**Contexto de código:** el repo está indexado en codebase-memory-mcp. Antes de
explorar código, consulta el grafo (`search_graph`, `trace_path`,
`get_code_snippet`) en vez de leer archivos enteros: guía y mapa por dominio en
`docs/ai/codebase-memory.md`.

# Jonás Orbit v3 — reglas del repositorio

**Qué documento manda en qué.** Cada línea es una decisión vigente del dueño:
el documento enlazado es la fuente de verdad en ESE ámbito y sustituye a los
anteriores en él. El texto completo de cada entrada —porqué, cifras medidas y
trampas— está en `docs/registro-de-decisiones.md`: **léelo (la entrada, no el
archivo entero) antes de tocar ese ámbito**. Las entradas nuevas se escriben
allí, y aquí sólo su línea. Casi todo lo visual tiene **valoración del dueño
pendiente**: no se da por aprobado.

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

| `WorldId` | Significado | Ruta ES |
| --- | --- | --- |
| `gargantua` | Sobre mí | `/es/sobre-mi` |
| `miller` | Formación | `/es/formacion` |
| `endurance` | Proyectos | `/es/proyectos` |
| `edmunds` | Creatividad | `/es/creatividad` |
| `tesseract` | Experimentos | `/es/experimentos` |
| `ranger` | Contacto | `/es/contacto` |

El nombre visible de `tesseract` es `Experimentos`, nunca `Laboratorio`.
`/es/desarrollo` y `/es/laboratorio` son 404 sin alias. **`order` es orden
NARRATIVO, no posición** (raíl, DOM, tabulador, sitemap; la escena se indexa por
`WorldId` vía `placement` y `lib/scene-depth.ts`). **El significado vive en el
MDX**, nunca en `worlds.data.ts`.

### Transversales (mandan sobre todo lo anterior en su ámbito)

- **Sonido del sitio** (09-22) `docs/design/sonido-del-sitio.md` — qué suena,
  peso y quién lo apaga. Un solo bus (`lib/audio-bus.ts`); lo apaga el control
  de AUDIO y nadie más. Portada y Miller usan las grabaciones de Jonás
  (`lib/audio-samples.ts`); el resto, recetas de `lib/sfx.ts`. Licencia de los
  dos archivos pendiente.
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
- **System Map — respuesta al puntero** (09-21)
  `docs/design/endurance-navigation-interface.md` §14 — `MAP_HOVER_MODE`
  (`sencillo`); el modo `instrumento` se conserva, no se borra. §12 y §13:
  marco del overlay (`fixed`) y condiciones del puntero.
- **Cabecera** (09-13) `docs/design/identity-gargantua.md` §«Observatorio y
  acento por mundo» — navbar minimalista, acento por mundo, siempre DOS CV
  (ES/EN), cielo en `voyage-sky.tsx`.

### Por página

- **Sobre mí** `docs/design/sobre-mi-constelacion.md` — constelación (09-14),
  exploración (09-15), revisión editorial (09-15) y simplificación (09-15).
  Publicación de E03/Bonao City pendiente.
- **Formación / Miller** `docs/design/miller-formacion.md` §«Océano en WebGL2 y
  formación en curso» (09-12) — `education.inProgress`.
- **Proyectos** `docs/design/endurance-proyectos.md` (09-21) — mesa de
  ingeniería, plan aprobado **sin construir**; abiertos Delicaté F1B,
  arquitecturas del §6 y foto de la sala.
- **Creatividad / Edmunds** `docs/design/edmunds-creatividad.md` — cubierta de
  observación (09-11), sexto pase de nitidez y arrastre (09-12), mosaico en
  filas justificadas (09-22, `lib/mosaic-rows.ts`). La curación es del dueño.
- **Experimentos / Observatorio** `docs/design/tesseract-experimentos.md` —
  recepción y encendido (09-17), V1.5 instrumentos, V2 dos modos
  OBSERVAR/ESTUDIO (09-18), V3 Gargantúa (09-19), V4 Ranger (09-19), V5 Miller
  y Edmunds, catálogo 06/06 (09-20), V6 mando EJE (09-20). Los `registro` de
  cada espécimen son la voz de Jonás: no se escriben.
- **Contacto / Ranger** `docs/design/ranger-contacto.md` §«Travesía por el
  agujero de gusano» (09-22: hero al 100 % del viewport, vuelo continuo
  periódico, apagar congela el cuadro) manda en ventanal y primera pantalla;
  §«Cabina de mando» (09-13, aprobada) en el resto.

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
  `readContactBindings()` cae a `process.env`. El runtime real de Cloudflare se
  sigue verificando en CI y en el deploy.

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
9. **Middleware:** no existe en F1 (redirect estático `/` → `/es` en
   `next.config.ts`). En F2A llega como `proxy.ts` (así se llama en Next 16).

## Referencias de v2

`docs/reference/v2/` conserva código de la versión anterior SOLO como
referencia (excluido de tsconfig y Knip): `universe.ts` (copy ya migrado a
`content/es/worlds/` corrigiendo Marketing Digital a carrera terminada),
`use-reduced-motion.ts`, `use-device-capability.ts`, `performance.ts` (base
para el gate de capacidad de F2B — adaptar al puerto nuevo cuando se
implemente, no importar directo). El `app/api/contact` de v2 estaba vacío: el
Worker de contacto de F1A se construye desde cero según la spec del plan.

## Al terminar una feature

Ninguna feature se considera completa sin sus tests del Appendix A
implementados y estables. Antes de cerrar una fase: revisión de bundle y
eliminación de experimentos sueltos.
