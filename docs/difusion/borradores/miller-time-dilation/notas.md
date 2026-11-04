# miller-time-dilation — notas del borrador (2026-11-04)

Rutina semanal en la nube. Primera fila «pendiente» de `docs/presencia-web.md`
§5 (#4, subida por la revisión del 10-27). La piden, según
`docs/difusion/informes/2026-10.md` §8: «gargantua from miller's planet» en
web y, en Imágenes, «…miller planet» (57 impr.) y «…time dilation» (15 y 10
impr.).

**Canibalización:** la entrada de física (`interstellar-black-hole-physics`)
contesta en su FAQ «¿Por qué en el planeta de Miller una hora son siete
años?» en tres líneas, y `gargantua-vs-real-black-holes` §«¿Por qué la
película eligió cien millones de soles?» cuenta la marea. Esta entrada
desarrolla las dos sin repetir su texto y las enlaza. Al publicar, que la
respuesta corta de la FAQ de física enlace aquí («la respuesta entera,
aquí»), como se hizo con la comparación.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `por-que-una-hora-son-siete-anos-en-miller` | `miller-planet-time-dilation-interstellar` |
| title | 55 car. | 46 car. |
| summary (≤ 220) | 194 | 193 |
| seoTitle (≤ 60) | 60 | 52 |
| seoDescription (110–160) | 143 | 151 |
| palabras del cuerpo (1400–2200) | ~1620 | ~1510 |
| secciones `## ` (6–10) | 9 | 9 |

Comprobado con `node -e` sobre el front matter y el cuerpo.

Títulos con «Interestelar»/«Interstellar»: el seoTitle ES lo lleva (regla
10-16: la física lo lleva en el título); el EN no, porque «Miller's Planet»
y «time dilation» ya ocupan los 60 caracteres útiles e «Interstellar» va en
la descripción. Si Jonás lo prefiere en el título EN: «Miller's Planet in
Interstellar: Why 1 Hour Is 7 Years» (54).

## Propuesta para `content/articles.data.ts`

```ts
// La dilatación del tiempo en Miller: la piden las consultas de Miller en
// Search Console (informe 2026-10 §8). Desarrolla la FAQ de física.
"miller-time-dilation": {
  published: "AAAA-MM-DD", // el día que se publique
  topic: "space",
  images: "/images/articulos/miller",
  cover: "planeta-miller-interestelar", // captura nueva, ver abajo
  specimen: "miller",
},
```

(Y añadir `"miller-time-dilation"` a `ARTICLE_IDS`; `e2e/blog.spec.ts` cuenta
las entradas.)

## Fuentes leídas

- `docs/presencia-web.md` entero (cola §5).
- `docs/difusion/informes/2026-10.md` §1 (consultas) y §8 (reorden).
- `content/es/articles/interstellar-black-hole-physics.mdx` y su EN (FAQ de
  Miller, «El disco está más lejos»: órbita estable mínima a 3 veces el
  horizonte en Schwarzschild, simulador sin giro).
- `content/es/articles/gargantua-vs-real-black-holes.mdx` (entrada más
  parecida; marea y masa) y su `notas.md` (fuentes verificadas: Thorne,
  James et al. 2015).
- `content/{es,en}/articles/gargantua-webgl.mdx` (estilo).
- `docs/design/miller-formacion.md` entero (fuente de la fila; trata la
  página de Formación y su océano en WebGL2 —sólo uso el enlace a
  Formación—).
- `docs/design/hero-gargantua-direction.md` §3 «El sistema está quieto, no
  muerto» (los cuerpos no orbitan).
- `content/{es,en}/worlds/miller.mdx` bloque `observatory` (notas del
  espécimen: shader propio, oleaje, camino de luz, Fresnel, nubes fbm).
- `lib/observation-views.ts` (vistas de Miller: Canónica/Canonical,
  Espejo/Mirror, Corrientes/Currents) y `lib/observatory.ts` comentario del
  preset `miller` (ángulos y tabla medida, para el foro).
- `docs/difusion/rutina-semanal.md` §5.1 y §6–6.1.
- Rutas: `lib/page-paths.ts`, `lib/path-segments.ts`,
  `lib/observatory-slugs.ts`, slugs de `content/{es,en}/articles` y
  `content/{es,en}/worlds/miller.mdx` (`formacion` / `education`).

Enlaces internos usados (todos existen): `/es|en/experimentos|experiments/observatorio|observatory/gargantua`,
`…/miller`, `/es/blog/la-fisica-del-agujero-negro-de-interstellar`,
`/en/blog/interstellar-black-hole-gargantua-explained`,
`/es/blog/gargantua-vs-sagitario-a-y-m87`,
`/en/blog/gargantua-vs-sagittarius-a-and-m87`, `/es/formacion`,
`/en/education`, `/es/contacto/servicios`, `/en/contact/services`.

## Cifras y de dónde salen

| Cifra / afirmación | Fuente | Nota |
| --- | --- | --- |
| 1 hora en Miller = 7 años en la Tierra | Entrada de física (FAQ) y `gargantua-vs-real-black-holes` | Dato de la película |
| Gargantúa ~100 millones de masas solares, giro casi máximo | Entrada de física; Thorne, *The Science of Interstellar* (citado en las notas de `gargantua-vs-real-black-holes`) | — |
| La masa se eligió para que la marea no rompa Miller; marea más suave cuanto mayor el agujero negro | `gargantua-vs-real-black-holes` §«¿Por qué la película eligió…» (verificado allí el 10-27, cap. 17) | — |
| Órbita estable mínima a 3 veces el radio del horizonte sin giro | Entrada de física §«Lo que el simulador hace distinto» | — |
| Imagen de la película con giro 0,6 del máximo; sombra aplanada y disco descentrado; Nolan y el supervisor de efectos | `gargantua-vs-real-black-holes` y sus notas (James et al. 2015, §4, fig. 15) | — |
| **~61 000 veces** | **Calculado**: 7 años × 365,25 × 24 = 61 362 horas | Aritmética sobre «7 años» |
| **1 s ≈ 17 h; 1 min ≈ 6 semanas** | **Calculado**: 61 362 h / 3600 = 17,0 h; 61 362 h / 60 = 1023 h ≈ 42,6 días | Aritmética |
| **~1,4 veces en la órbita estable más cercana sin giro** | **Calculado**: órbita circular en Schwarzschild, dt/dτ = 1/√(1 − 3M/r); en r = 6M (= 3 rs) da 1/√0,5 = 1,414 | **Verificar.** No está en el repo; es la única cifra física nueva. Si Jonás prefiere no publicarla, la sección se sostiene diciendo «muy lejos de siete años» |
| Simulador de Schwarzschild, sin giro; el gas del disco sí gira | Entradas de física y de WebGL | — |
| Cuerpos del mapa que no orbitan | `hero-gargantua-direction.md` §3 | — |
| Espécimen: shader propio, oleaje, camino de luz y destellos por fotograma; el mar se mueve con la cámara quieta; tres vistas | `content/{es,en}/worlds/miller.mdx` `observatory.notes`; `lib/observation-views.ts` | — |
| Foro: lóbulo `exp(-(alongOff²·9 + acrossOff²·110))`, `mix(0.86, 1.34, waterFresnel)`, clave 25° → 0 px ≥ 250, 55° → 120 px, 55° por defecto, 25° pasa a Espejo | Comentarios en `lib/observatory.ts` (preset `miller`) y `lib/observation-views.ts` | Medido allí con 5 capturas, azimut 20 |
| GPS corrige relatividad | Conocimiento general, sin cifra | Sin número a propósito |

Sin precios, sin clientes.

## Figuras que faltan

No existe ninguna imagen de Miller en `public/images/articulos/`, así que el
borrador no lleva `<Figure>`. Para publicar, en
`public/images/articulos/miller/` (`-800.webp` y `-1600.webp`, con GPU real:
`tools/README.md`):

1. **Portada** `planeta-miller-interestelar`: espécimen de Miller en la vista
   Canónica, `/es/experimentos/observatorio/miller`, modo Estudio, sin
   interfaz encima si la herramienta lo permite.
2. **Opcional** `planeta-miller-espejo`: la vista Espejo, para la sección del
   espécimen (lámina de luz).
3. **Opcional, la que más ayudaría en Imágenes** («miller planet time
   dilation»): un esquema hecho a mano (SVG) con el horizonte, la órbita
   estable mínima sin giro (3 rs) y una órbita pegada al horizonte con giro,
   y el reloj de cada una (1,4 frente a 61 000). Sin escala inventada: sólo
   lo que dice la tabla de arriba.

## Dudas para Jonás

1. **La cifra de 1,4** (ver tabla). Es correcta para la órbita circular
   estable más interna de Schwarzschild, pero no está en ninguna fuente del
   repo. ¿Se queda?
2. **El giro exacto de Gargantúa en el libro de Thorne** (una fracción
   minúscula por debajo del máximo) y **los 23 años** que espera Romilly: no
   están en el repo y no los usé. Si los quieres, hay que comprobarlos en
   *The Science of Interstellar* y citarlos aquí.
3. **Las olas gigantes**: la entrada sólo dice que «merecen una entrada
   propia». Thorne las explica en el libro; no lo verifiqué. ¿Candidata para
   la cola?
4. **La frase sobre el espécimen «congelado» visto desde lejos** (17 h por
   segundo) desprecia el Doppler orbital, que cambiaría el ritmo según la
   dirección. Es correcta como orden de magnitud; si quieres precisión, añadir
   «más o menos».
5. **El foro**: esta semana sería el post de Miller como Showcase. Choca con
   la cola del foro (`rutina-semanal.md` §6.1), donde «Miller's ocean» (#1, el
   agua de Formación, otra pieza) va cuarto y delante van teseracto,
   resolución adaptable y bloom. Decide si va este viernes o se guarda.

## Foro de Three.js

Borrador en `foro-threejs.md` (Showcase: el espécimen se abre y se mira en
tres vistas; ~320 palabras). Falta la captura de Miller para adjuntar.

## Titulares alternativos

- ES: «Una hora, siete años: la física del planeta de Miller» · EN: «One hour, seven years: the physics of Miller's planet»
- ES: «Planeta de Miller: la dilatación del tiempo de Interestelar, con las cuentas» · EN: «Miller's planet: Interstellar's time dilation, with the math»
- ES: «Lo que hace falta para que una hora sean siete años» · EN: «What it takes for one hour to be seven years»
