# miller-time-dilation — notas del borrador (2026-11-04)

Tema #4 de la cola (`docs/presencia-web.md` §5), subido en la revisión
mensual del 10-27. Lo piden «gargantua from miller's planet» (web) y, en
Imágenes, «…miller planet» (57 impr.) y «…time dilation» (15 y 10 impr.)
(`docs/difusion/informes/2026-10.md` §8).

**Canibalización:** la entrada de física ya contesta en una pregunta del FAQ
«¿Por qué en el planeta de Miller una hora son siete años?». Al publicar, esa
respuesta corta debe terminar con «la explicación completa, aquí» enlazando a
esta entrada (ES y EN). La de Sagitario A* explica las mareas: aquí sólo se
enlaza.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `por-que-una-hora-son-siete-anos-en-miller` | `miller-planet-time-dilation-interstellar` |
| title | 71 | 62 |
| summary (≤ 220) | 220 | 205 |
| seoTitle (≤ 60) | 50 | 52 |
| seoDescription (110–160) | 144 | 140 |
| palabras del cuerpo | 1578 | 1447 |
| secciones `##` | 9 | 9 |

Interestelar va en el título: es una entrada de física (registro «SEO —
Interestelar en los títulos…», 10-16, sustituye a la regla vieja de §5.1).

Para `content/articles.data.ts` al publicar: `topic: "space"`, `specimen:
"miller"`, `images: "/images/articulos/miller"`, `cover:
"miller-observatorio"`.

## Figuras

- **`miller-observatorio`** (portada y única figura): copiar
  `public/images/experimentos/observatorio/miller-{800,1600}.webp` a
  `public/images/articulos/miller/miller-observatorio-{800,1600}.webp` y
  generar el `-og.jpg` como las demás. Ya es captura real con GPU.
- **Opcional, la que más ayudaría en Imágenes:** un esquema simple (SVG a
  mano) de las dos órbitas: sin giro, órbita mínima a 3 radios del horizonte
  y factor 1,4; con giro casi máximo, la órbita pegada al horizonte. Sin
  pintar nada que no esté en la tabla de abajo.

## Cifras y de dónde salen

| Cifra / afirmación | Fuente | Verificar |
| --- | --- | --- |
| 1 hora en Miller = 7 años en la Tierra | La película; Thorne, *The Science of Interstellar* (2014), cap. 17 | — |
| ~23 años de Romilly en la nave; algo más de tres horas en la superficie | La película (23 años, 4 meses y 8 días); 23,35 / 7 ≈ 3,3 h | Comprobado sólo en fuentes secundarias (wikis): **Jonás, confirma con la película** |
| 7 años ≈ 61 000 horas → factor ~61 000; 1 s en Miller ≈ 17 h en la Tierra | 7 × 365,25 × 24 = 61 362; 61 362 s / 3600 ≈ 17,0 h | Calculado |
| La gravedad de la Tierra frena los relojes < 1 parte en mil millones en su superficie | GM/(Rc²) = 3,986e14 / (6,371e6 × 8,988e16) ≈ 7,0e-10 | Calculado |
| GPS: +45 µs/día por gravedad, −7 µs/día por velocidad, neto ≈ +38 µs/día; satélites a ~20 000 km | Ashby, «Relativity in the Global Positioning System», *Living Reviews in Relativity* 6 (2003) 1 | Valores de referencia estándar |
| La luz recorre ~11 km en 38 µs | 38e-6 × 3e8 m/s = 11,4 km | Calculado |
| Pound y Rebka, 1959, torre de 22,5 m en Harvard | Pound & Rebka, *Phys. Rev. Lett.* 4 (1960) 337 (experimento de 1959) | — |
| Relojes ópticos detectan diferencias de altura < 1 m | Chou et al., *Science* 329 (2010) 1630 (33 cm); Bothwell et al., *Nature* 602 (2022) 420 (milímetros) | — |
| Sin giro: órbita estable mínima a 3 radios del horizonte (6 GM/c²) | Schwarzschild, ISCO | Estándar |
| Factor 1,4 en esa órbita | Órbita circular de Schwarzschild: dτ/dt = √(1 − 3GM/(rc²)); en r = 6GM/c² → √0,5 = 0,707 → 1/0,707 = 1,41 | Calculado |
| El simulador usa Schwarzschild (sin giro) | `content/es/articles/interstellar-black-hole-physics.mdx` §«Lo que el simulador hace distinto» | En el repo |
| Con giro máximo la órbita estable mínima llega al horizonte | Bardeen, Press & Teukolsky, *ApJ* 178 (1972) 347 | Estándar |
| Giro de Gargantúa a menos de una parte en cien billones (1e-14) del máximo | Thorne, *The Science of Interstellar*, cap. 17 | **Sólo fuentes secundarias** (resúmenes del libro); comprobar en el libro antes de publicar o quitar la cifra y dejar «prácticamente al límite» |
| Gargantúa ~1e8 masas solares; mareas suaves cerca del horizonte | Ya citado en `gargantua-vs-real-black-holes/notas.md` (verificado 10-27) | — |
| Olas de más de un kilómetro (~1,2 km / 4000 ft) explicadas por mareas | La película; Thorne, *The Science of Interstellar*, cap. 17 | Altura en fuentes secundarias; la explicación por mareas es la de Thorne |
| Límite de giro por acreción ≈ 0,998 | Thorne, «Disk-accretion onto a black hole», *ApJ* 191 (1974) 507 | — |
| Superficie de una estrella de neutrones: dilatación de sólo ~1,2–1,5× | √(1 − rs/R) con R ≈ 2,5–4 rs | Calculado (orden de magnitud) |
| Luz del universo desplazada al azul vista desde una órbita así | Consecuencia general de la dilatación (lo que llega de fuera se ve acelerado ×61 000) | Afirmación cualitativa; no se da cifra |

## Lo que no se afirma

- Nada sobre cómo baja la Ranger ni qué maniobra usa: la entrada sólo dice que
  la película no lo explica.
- El mapa de la portada: «quieto y sin escala» sale de la dirección del hero
  (el sistema está quieto; posiciones de composición, §14 quinquies).
- El espécimen de Miller: sólo «luz sobre material» (`lib/observatory-slugs.ts`)
  y el mando LUZ, que existe (`components/observatory-chrome.test.tsx`).

## Dudas para Jonás

1. ¿Confirmas los 23 años (y «algo más de tres horas») con la película?
2. La cifra de «una parte en cien billones» no la pude leer en el libro. ¿La
   dejamos con «según su libro» o la cambio por «prácticamente al límite»?
