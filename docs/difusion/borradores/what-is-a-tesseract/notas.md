# what-is-a-tesseract — notas del borrador (2026-10-23)

Fuera de la cola original: lo pide Search Console (28 días hasta el 21-oct).
En Imágenes, «teseracto» 126 impresiones en posición 83 y «tesseract 4d
hypercube projection» 202 en posición 63; en web, «como dibujar un teseracto»
ya está en posición 4,4 (lo recoge la entrada técnica).

**Canibalización:** la entrada técnica (`tesseract-4d`) tiene una sección
«Qué es un teseracto» de dos párrafos y gana «como dibujar un teseracto» con
intención de código. Esta es divulgativa y el dibujo es a mano, en papel.
Al publicar: la sección corta de la técnica enlaza aquí («explicado sin
código») y esta enlaza a la técnica para el código (ya lo hace). Si al mes
las dos se pisan en la misma consulta, cambiar el `seoTitle` de la técnica
hacia «Three.js», no tocar esta.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `que-es-un-teseracto` | `what-is-a-tesseract` |
| seoTitle (≤ 60) | 55 | 54 |

Para `content/articles.data.ts` al publicar: `topic: "space"` (o `webgl` si
Jonás prefiere juntarla con la técnica; es divulgación, no código),
`specimen: "tesseract"`, `images: "/images/articulos/teseracto"`.

## Figuras que faltan (son las que pueden posicionar en Imágenes)

1. **Portada:** el teseracto del Observatorio en la pose «cubo dentro de
   cubo», GPU real.
2. **El dibujo a mano en cuatro pasos:** un SVG por paso o uno con los
   cuatro, con el método de los dos cubos desplazados. Trazo sencillo,
   fondo claro: es la imagen que la gente busca con «como dibujar un
   teseracto».
3. **La escalera:** punto → segmento → cuadrado → cubo → teseracto en una
   fila. El teseracto se puede sacar del SVG del atlas plano
   (`components/flat-world-body.tsx`, el mismo que describe la sección «Sin
   WebGL» de la entrada técnica).

Nombres de archivo con la frase buscada: `teseracto-como-dibujarlo-*`,
`teseracto-hipercubo-4d-*`; `alt` descriptivo en ES y EN.

## Cifras y de dónde salen

| Afirmación | Fuente | Verificar |
| --- | --- | --- |
| 16 vértices, 32 aristas, 24 caras, 8 celdas; 4 aristas por vértice | Combinatoria del n-cubo (2ⁿ vértices, n·2ⁿ⁻¹ aristas); ya en la entrada técnica | — |
| Proyección: cubo interior, exterior y seis troncos de pirámide = 8 cubos | Proyección de Schlegel / en perspectiva | — |
| *Planilandia*, Edwin Abbott, 1884 | — | — |
| «Teseracto» lo acuña Charles Howard Hinton en *A New Era of Thought* (1888); del griego «cuatro rayos» | Diccionarios (OED) y la bibliografía habitual | — |
| *Corpus Hypercubus*, Dalí, 1954: cruz = teseracto desplegado | Metropolitan Museum of Art | — |
| El teseracto de la película es un espacio de tres dimensiones construido «por ellos» dentro de su realidad de cinco | Diálogo de la película (TARS) y Thorne, *The Science of Interstellar* | Jonás: revisar la redacción del último apartado |
| Modo Estudio con sonda de arista | `observatory-viewer.tsx` (`probeHint`, `probeEdge`) | — |
