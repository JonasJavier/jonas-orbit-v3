# Raíl, atlas plano y Tesseracto — 2026-09-06

Petición explícita del dueño: invertir la información del raíl, recomponer el
mapa 2D en todos los formatos y sustituir el exterior y el interior del
Tesseracto por una arquitectura inspirada en `teseracto referencia.png`.

Este documento sustituye los bloqueos anteriores del **atlas plano**, del
**orden de las etiquetas del raíl** y de la **geometría del Tesseracto**. La
referencia es dirección visual; la implementación sigue siendo geometría real,
con un equivalente SVG estático. La aprobación artística final sigue siendo
del dueño.

## Navegación

El raíl muestra Historia, Desarrollo, Proyectos, Creatividad, Laboratorio y
Contacto desde el primer frame. Hover, foco o selección revelan el nombre
cósmico debajo. Se reservan ambas líneas para que los enlaces no se desplacen.
Los seis enlaces, sus destinos y la prioridad de foco permanecen iguales. El
TARGET y las etiquetas junto a los cuerpos siguen identificando el mundo.

## Atlas 2D

`lib/flat-composition.ts` define **tres** composiciones en porcentaje del
viewport: `wide`, `portrait` y `short`. Son decisiones de composición del atlas,
independientes de los datos orbitales WebGL. Los mismos slots DOM y enlaces
sostienen los tres perfiles; las coordenadas planas sobreviven al teardown de
WebGL.

`short` es el apaisado corto —el móvil girado— y existe porque una sola tabla
horizontal no puede servir a la vez a un escritorio de 1080 px de alto y a un
teléfono de 375: lo que cambia entre los dos no es la proporción sino **cuánto
pesa el raíl dentro del cuadro**. A 1080 ocupa el 7 % del alto; a 375, el 19 %.
Con una sola tabla, la Ranger —el cuerpo más bajo del atlas— se metía debajo del
raíl a 812×375 y lo rozaba por una décima de píxel a 320×568.

La salida NO fue comprimir la composición para que quepa en el peor caso, porque
eso amontona los cuerpos en el centro de las pantallas que ya funcionaban: es la
misma decisión que ya estaba tomada al separar `portrait` de `wide`, aplicada
una vez más. `short` comparte las X de `wide` —a lo ancho ese formato sobra— y
sólo sube la columna vertical. La Ranger baja además de 73 a 69 en `portrait`.
Margen resultante contra el raíl: 22.6 px a 320×568 y 20.9 px a 812×375.

Gargantúa ocupa el centro visual desplazado: 46/49 en horizontal, 48/43 en
vertical. Miller y Tesseracto abren el campo superior; Edmunds y Endurance
equilibran el inferior, con Ranger más próxima al raíl. Tamaños y proxies
comparten variables CSS. En horizontal corto el raíl ocupa una sola fila.

Se retiran las elipses decorativas del atlas y los halos uniformes de los
cuerpos. El cielo plano baja de intensidad y se enmascara detrás de la sombra
central. Miller recibe agua azul grisácea con corrientes y luz hacia el centro;
Edmunds, provincias secas ocres, relieve y sombra direccional. Sus SVG son
estáticos también con reduced-motion y sin JavaScript.

## Tesseracto

La referencia se traduce en dos tramos estructurales exteriores desfasados,
planos laterales de grafito, cuatro extensiones en L y siete umbrales conectados
hacia un vacío central. Se abandona la caja compacta anterior. La luz cálida
procede del material común y crece hacia dentro, sin esfera o reactor central.

Cuatro meshes, un solo material opaco, cero texturas nuevas y ningún sitio de
ruido añadido al shader. La cáscara permanece fija; los tres grupos interiores
oscilan sin acumular giro. El radio real se normaliza a la envolvente anterior,
con tests geométricos del hueco, la envolvente animada y el movimiento proyectado.
No se cambian la posición, la cámara o los datos orbitales del Tesseracto.

## Verificación

- Suite existente: rutas, estado de foco/hover, accesibilidad, geometría,
  cuatro batches, centro atravesable y límites de movimiento.
- `e2e/atlas.spec.ts`: 320×568, 375×812, 768×1024, 812×375, 1440×860 y
  1920×1080; cuerpos dentro de pantalla, enlaces de 44 px, centro de cada proxy
  alcanzable y ausencia de overflow; información del raíl en reposo y con foco.
- `tools/shot.mjs` admite `--flat --width=375 --height=812` además del banco
  bloom-off existente. Capturas de revisión en `output/playwright/hero-redesign/`.

La validación técnica no equivale a aprobación visual del dueño.
