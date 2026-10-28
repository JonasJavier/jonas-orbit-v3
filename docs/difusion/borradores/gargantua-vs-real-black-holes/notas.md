# gargantua-vs-real-black-holes — notas del borrador (2026-10-23)

Fuera de la cola original: lo pide Search Console (28 días hasta el 21-oct).
Consultas que contesta, con impresiones web: «is gargantua bigger than
sagittarius a», «does gargantua exist» (5), «gargantua black hole size» (2),
«gargantua size», «how far away is gargantua from earth», «where is
gargantua», «gargantua existe» y sus variantes en español.

**Canibalización:** la entrada de física ya contesta en tres líneas «¿qué
tamaño tiene?», «¿dónde está?» y «¿existe?». Esta las desarrolla con la
comparación. Al publicar, que cada respuesta corta de física enlace a esta
(«la comparación completa, aquí») y no al revés con el mismo texto.

## Datos de la entrada

| Campo | ES | EN |
| --- | --- | --- |
| slug | `gargantua-vs-sagitario-a-y-m87` | `gargantua-vs-sagittarius-a-and-m87` |
| seoTitle (≤ 60) | 56 | 55 |

Para `content/articles.data.ts` al publicar: `topic: "space"`, `specimen:
"gargantua"`, `images: "/images/articulos/agujero-negro"` (la carpeta de la
entrada técnica, como hace la de física) y `cover` a elegir.

## Figuras que faltan

- **Portada:** una captura de Gargantúa que no sea la de física ni la del
  shader (por ejemplo la vista de frente de `tools/wallpaper-shots.mjs`).
- **Opcional, la que más ayudaría en Google Imágenes:** un esquema a escala
  de los tres horizontes. A escala lineal no se puede (M87* es 1500 veces
  Sagitario A*), así que en dos paneles: Sagitario A* y Gargantúa sobre las
  órbitas de Mercurio y la Tierra; Gargantúa y M87* sobre la de Neptuno. SVG
  hecho a mano con las cifras de abajo, sin pintar nada que no esté en la
  tabla.

## Cifras y de dónde salen

| Cifra / afirmación | Fuente | Verificar |
| --- | --- | --- |
| Gargantúa ~1e8 masas solares, giro casi máximo, horizonte ≈ órbita de la Tierra | Thorne, *The Science of Interstellar* (2014); ya dicho en la entrada de física | — |
| La masa se eligió para que las mareas no rompan el planeta de Miller | Thorne, *The Science of Interstellar*, cap. 17 (extracto en space.com: «al menos 100 millones de veces la masa del Sol») | Verificado 2026-10-27 |
| La película usó a/M = 0,6 frente al casi 1 de la historia: sombra aplanada por la izquierda, imágenes múltiples del disco junto a ese borde y disco descentrado, «demasiado confuso para el gran público» (Nolan y Franklin) | James, von Tunzelmann, Franklin, Thorne, *Classical and Quantum Gravity* 32 (2015) 065001, §4 y fig. 15 (arXiv:1502.03808) | Verificado 2026-10-27 en el texto del artículo |
| Sagitario A* ≈ 4,3e6 masas solares, ≈ 8,28 kpc ≈ 27 000 años luz | GRAVITY Collaboration, *A&A* 657 (2022) L12 (4,297e6, R0 = 8277 pc) | — |
| M87* ≈ 6,5e9 masas solares, ≈ 16,8 Mpc ≈ 55 millones de años luz | EHT Collaboration, *ApJL* 875 (2019) L6 | — |
| Imagen de M87*: 10-abr-2019; de Sagitario A*: 12-may-2022 | Notas de prensa del EHT | — |
| «Como ver una rosquilla en la superficie de la Luna» | Nota de prensa del EHT sobre Sagitario A* (2022) | — |
| Radio de Schwarzschild = 2,953 km por masa solar | 2GM/c² | — |
| Horizontes: Sgr A* 12,7e6 km (0,085 UA); M87* 1,92e10 km (128 UA); Gargantúa con giro máximo GM/c² ≈ 1,48e8 km (0,99 UA) | Calculado con la línea anterior; Neptuno a 30 UA | — |
| 23× la masa de Sgr A*; 65× menos que M87*; 12× el radio de Sgr A*; 2000× más cerca | Cocientes de las cifras anteriores | — |
| Andrómeda ≈ 2,5 millones de años luz | Valor de referencia habitual | — |

Nada de la entrada habla de mandos del simulador que no existan: los que se
nombran (Lente, Doppler, Secundarias) son los de `observatory-viewer.tsx`.
