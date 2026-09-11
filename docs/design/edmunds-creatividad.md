# Edmunds — otra forma de mirar

2026-09-11 · Primera implementación solicitada por Jonás. Dirección pendiente
de su valoración visual.

## Intención y alcance

Edmunds muestra fotografía, diseño y composición como una práctica personal:
curiosidad, arte y diversión además del código. El dueño pidió una galería 3D
central y dio libertad para organizar las obras, conservando la identidad
mineral y espacial. No se presenta como un catálogo de encargos comerciales.

La página vive en `/es/creatividad`, dentro de la ruta dinámica existente,
indexada por `WorldId`. Prosa y catálogo están en el frontmatter de
`content/es/worlds/edmunds.mdx`, mediante Velite. El esquema `creativity` es
opcional para los demás mundos. No cambia ningún cuerpo, material, tamaño,
posición ni cámara del System Map. Miller y la navegación se conservan.

## Dirección e interacción

Carbón, cobre y arena; marcos cálidos, tipografía editorial y perspectiva fija.
La fotografía aportada «Entre montañas» también aparece atenuada detrás del
archivo. No se genera un paisaje nuevo ni se modifican las obras para simular
otro planeta.

Cinco posiciones en profundidad presentan las obras con `perspective`,
`translateZ` y `rotateY` de CSS. Se mueve el archivo al avanzar; el punto de
vista permanece fijo. No tiene cámara controlable, autoplay, bucle RAF ni otro
contexto WebGL. Se recorre con botones, flechas/Home/End y arrastre horizontal
táctil o de ratón. El scroll vertical conserva su función habitual. Pulsar una
obra abre su imagen completa. El mosaico permite revisar la selección en
conjunto. Las obras se muestran completas, sin recorte.

La prosa inferior habla de crear por gusto y deja abierta la incorporación de
más imágenes y dibujos sin publicar tarjetas vacías.

## Selección y procedencia

Se revisaron visualmente 84 imágenes de `Fotos/` y 24 de `Disenos/`. La primera
selección tiene **48 fotografías y 12 diseños**, en cinco temas: Horizontes,
Vida y detalles, Retratos, Después del sol y Diseño y composición.

Los títulos y descripciones son editoriales, basados en lo observado; no
atribuyen lugares, identidades, fechas ni datos de cámara. Algunas piezas
tenían variantes, incluidas exportaciones con nombres ChatGPT/Codex. Se escogió
una representación por motivo; no se infiere de esos nombres el proceso de
autoría ni se afirma que las imágenes estén sin editar. `source` conserva el
vínculo con el archivo suministrado. No se borran ni se modifican originales.
Las marcas de los ejercicios gráficos no se presentan como clientes.

Es una selección, no una publicación de las dos carpetas enteras. El PDF de
revista y los dos enlaces Figma no entran en este primer recorrido de imágenes.
Pueden integrarse en una ampliación editorial posterior, igual que las fotos
no seleccionadas y los dibujos anunciados.

## Acceso y fallos

- Cada obra es un enlace HTML real a su WebP grande.
- El visor usa `dialog.showModal()`, Escape, flechas, cierre visible,
  confinamiento explícito del tabulador y devolución del foco al enlace de
  origen. Bloquea el scroll de fondo mientras está abierto.
- Un fallo de imagen deja texto y acceso al visor; el visor ofrece reintento.
- Sin JavaScript, `noscript` transforma el archivo completo en cuadrícula:
  todos los enlaces, imágenes, títulos y textos siguen disponibles.
- Reduced-motion y el perfil ligero empiezan en mosaico. Elegir profundidad
  conserva las transiciones apagadas mientras la reducción esté activa.
- La escena persistente usa `setCovered` mientras Edmunds la tapa. Conserva el
  canvas al navegar y lo reanuda al volver al mapa.

## Recursos y presupuesto

`tools/prepare-edmunds.mjs` lee el catálogo compilado por Velite y genera tres
WebP por obra (480, 960 y 1920 px de ancho máximo, sin ampliar el original).
Las grandes se limitan también a 2400 px de alto. Sharp elimina EXIF, incluido
GPS, en las copias. Los 180 recursos ocupan 29,62 MiB en disco; no se descarga
el archivo completo al entrar. Las 60 obras están en HTML, pero fuera de las
cinco posiciones se usa `display: none` y carga lazy. El mosaico también carga
bajo demanda. Solo el visor solicita la versión grande. La prueba de red exige
como máximo siete recursos de obra al entrar en 3D, ninguno de 1920 px.

Los scripts iniciales modernos de producción, sin `nomodule` y contando cada
`src` una vez, suman **169,26 KiB gzip** en Creatividad y Formación,
**164,37 KiB** en la portada y **159,17 KiB** en Privacidad. El incremento sobre
esa ruta sin contenido interactivo es 10,09 KiB, dentro del presupuesto propio
de 40 KiB. Miller y Edmunds comparten el chunk de `[mundo]`. No se añadieron
dependencias. Estas cifras no son una auditoría Lighthouse ni la transferencia
completa después de navegar.

Para añadir una obra: conservar el original, añadir un registro y tema válido
al MDX, ejecutar `npm run content`, `node tools/prepare-edmunds.mjs` y
`npm run check`. Las carpetas originales solo se necesitan para regenerar las
copias. El build consume los WebP públicos ya preparados.

## Verificación

`components/edmunds-page.test.tsx` cubre significado, vecinos, catálogo,
integridad WebP, temas, navegación, archivo vacío, una obra, imagen fallida y
reduced-motion. `e2e/edmunds.spec.ts` cubre filtros, imágenes servidas, visor,
foco, reintento, CSS 3D, carga acotada, arrastre táctil, HTML sin JavaScript,
reducción de movimiento, tamaños de 320 a 2560 px y persistencia de escena.
Esto cierra A14 y A15 del Appendix A.

Resultado: `npm run check` completo, con **212 tests unitarios** y build
estático; **128 pruebas E2E** de Edmunds, Miller, navbar y smoke pasan en
Chromium de escritorio y móvil. Incluye ampliación de texto al 200 %, teclado,
recuperación de imágenes y los perfiles sin JavaScript y con movimiento
reducido. Revisión visual de portada, mosaico y visor a 1440 y 375 px.

Capturas de revisión en `output/playwright/edmunds/` (ignorado por git).
