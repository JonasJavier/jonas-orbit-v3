# black-hole-threejs-tutorial — notas del borrador (2026-10-23)

Fuera de la cola original: lo pide Search Console (28 días hasta el 21-oct).
Consultas en las que ya salimos en posiciones 5–10 con poca competencia:
«black hole three js» (pos 10, 1 clic), «webgl black hole» (pos 6),
«gargantua 3d» (pos 5,2, 2 clics), «gargantua simulation» (7,7),
«create a simulation of a 3d black hole».

**Canibalización:** la entrada `gargantua-webgl` («How I Built a Black Hole
in WebGL with Three.js») es la historia del shader del sitio, con
fragmentos. Esta es un tutorial: código completo y mínimo para copiar. Las dos
se enlazan entre sí. Al publicar, que la entrada larga diga arriba «si
quieres la versión mínima para copiar, está aquí».

## El código está probado

`agujero-negro.html`, en esta carpeta, es el archivo exacto que corre la
entrada (ES idéntico byte a byte; EN igual salvo comentarios, `<title>` y
`lang`, comprobado con `diff`). Se probó el 2026-10-23 en el navegador del
panel, servido con `python -m http.server`, three@0.185.1 desde jsdelivr:
sin errores en consola. `prueba-del-codigo.jpg` es la captura del resultado
(800 × 600).

Los dos fallos que cuenta la sección 5 pasaron de verdad al probarlo:
con la velocidad de Newton y la opacidad a cero en el borde interior, los dos
lados del disco se veían iguales. Se aisló pintando el factor Doppler en
rojo y midiendo; con la velocidad de Schwarzschild, γ y el perfil hacia
dentro, el lado que se acerca brilla más.

Cuando el `three` del repo suba de versión, cambiar la del importmap en las
dos entradas y volver a probar el archivo.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `agujero-negro-en-three-js-tutorial` | `black-hole-three-js-shader-tutorial` |
| seoTitle (≤ 60) | 56 | 52 |

Para `content/articles.data.ts` al publicar: `topic: "webgl"`, `specimen:
"gargantua"`, `images: "/images/articulos/agujero-negro-tutorial"`.

## Figuras que faltan

- **Portada:** una captura del propio tutorial a 1600 × 900 con GPU real
  (no la de 800 × 600 de la prueba), para que la imagen sea lo que el lector
  va a obtener.
- **Opcional:** dos capturas pequeñas, una con el disco simétrico (velocidad
  de Newton) y otra con el Doppler bien, para la sección 5.

## Difusión

Es la que mejor encaja con el foro de Three.js (Resources) y con dev.to: es
un tutorial con código, no autopromoción. Borrador del foro por escribir
cuando Jonás apruebe el texto.

## Fuentes

| Afirmación | Fuente |
| --- | --- |
| `a = −1,5·rs·h²·r/|r|⁵` y Verlet | La entrada `gargantua-webgl` y el shader del sitio (`components/scene/gargantua-shaders.ts`) |
| Órbita estable más cercana en 3 rs | Schwarzschild: ISCO = 6GM/c² = 3 rs |
| Velocidad orbital local `√(rs / (2(r − rs)))` | Schwarzschild, observador estático; 0,5c en 3 rs |
| Intensidad × D³ | Haz relativista de un emisor de línea; el sitio usa la misma idea («Doppler: por qué un lado brilla más» en `gargantua-webgl`) |
| El sitio usa presupuesto adaptativo y parada temprana; Schwarzschild, no Kerr; dos copias del disco | Entrada `gargantua-webgl` |
