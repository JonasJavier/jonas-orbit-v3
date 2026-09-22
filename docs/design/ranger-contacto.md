# Ranger — cabina de mando

Implementación de `/es/contacto`. La sección `Travesía por el agujero de
gusano (2026-09-22)` manda sobre `Cabina de mando (2026-09-13)` en el ventanal,
el vuelo, el marco y la composición de la primera pantalla; el resto de la
cabina (HUD, panel, consola, datos, límites) sigue vigente. `Cabina de
comunicaciones (2026-09-12)` queda abajo como referencia histórica sustituida.

## Travesía por el agujero de gusano (2026-09-22)

Petición del dueño: «el modo vuelo tiene que estar vinculado con el botón
global del movimiento […] que el espacio y el tiempo se doblen como el efecto
de Interstellar al cruzar el agujero de gusano; no tiene que haber planetas,
sólo estrellas y espacio; que sea continuo, que no se pare a menos que el
usuario desactive el movimiento […] me gustaría que el hero de Ranger ocupe el
100 % de todo el viewport». Carta blanca en el diseño del hero y en mejoras.

### Composición

- **El ventanal es la primera pantalla entera.** `.ranger-bridge` mide
  `100svh` (sube por debajo de la cabecera con el margen negativo de siempre)
  y el canvas va a sangre, sin casco. El panel de instrumentos (`#instrumentos`:
  frecuencias, radar, mandos) sale del hero y va justo debajo, dentro del mismo
  estado de cabina; «Canales directos ↓» al pie del HUD lleva a él.
- **Sin casco ni montante.** La nave se sugiere con el **visor**
  (`RangerVisor`): tres esquinas de retículo al borde del cristal —la cuarta es
  de la bandeja de movimiento y audio— y los reflejos ámbar de los
  instrumentos, con el paralaje de cabeza de siempre.
- **La garganta** va a la derecha en apaisado (0,27 / 0,03 en unidades de
  alto) para que la copia quede sobre la pared oscura, y centrada y alta en
  vertical (0 / 0,17) con la copia debajo. `throatFor()` en el componente y
  `--vp-x/--vp-y/--throat` en el CSS (consulta de contenedor por proporción)
  llevan los mismos números. Un **retículo** fino sigue a la garganta con la
  curvatura que publica el bucle (`--bend-x/--bend-y`).
- **HUD**: `ENLACE / DESTINO / HORA EN SANTO DOMINGO / VUELO`. La lectura
  VUELO dice «En travesía» o «Detenido» según el interruptor de movimiento: sin
  cifras inventadas. La frecuencia que se apunta pasa a la cabecera de su
  propio módulo («Sintonizando 01 · Correo»), que es donde está el puntero.

### El shader

Un triángulo, ningún asset, WebGL2 propio como antes:

1. **Tres paredes de hilos de luz** (radios 0,2 / 0,36 / 0,6): cada sector de
   la pared lleva un hilo por periodo de profundidad; la perspectiva deja el
   ancho constante en unidades de sector (`r · z = R`). Se apagan donde serían
   un borrón (demasiado cerca) o más finos que un píxel (demasiado hondos).
   Doppler: lo que viene de frente llega frío, lo que pasa se calienta — el
   cian y el ámbar de la cabina.
2. **El espacio se dobla.** El ángulo gira con la profundidad (`uTwist`, 0,55 ±
   0,15) y despacio con el tiempo: los hilos son espirales que se abren desde
   la garganta. La sección del tubo es una elipse cuyo eje gira con la
   profundidad (el túnel se retuerce como una manga) y la boca se desplaza
   (`uBend`) con un peso de meseta que la mueve entera, así que el anillo no
   se deforma.
3. **Gas violeta y cian** sobre las paredes, con ruido de retícula periódica, y
   un brillo tenue de pared para que el túnel se lea como volumen.
4. **La boca**: el cielo del otro lado lensado por una masa puntual —estrellas
   amontonadas en el anillo de Einstein, la banda de una galaxia lejana
   convertida en arcos— con el anillo nítido, un halo ancho y un anillo oscuro
   de fotones donde las paredes le ceden el paso. Sólo pagan este cálculo los
   píxeles cercanos a la garganta.

**Continuo y sin saltos.** Todo patrón es periódico en profundidad con periodo
48 (hilos, gas, costillas) y la distancia se envuelve exactamente ahí: el vuelo
no tiene fin ni costura, y la precisión de `float` no se degrada con las horas.

### El interruptor

El vuelo cuelga del interruptor único de movimiento, y nada más. **Apagarlo
congela el último fotograma**: el canvas y su contexto se quedan, el bucle deja
de pedir cuadros y la velocidad se conserva, así que reanudar no salta. Quien
llega con el movimiento apagado recibe el túnel a velocidad de crucero, quieto.
El primer arranque con movimiento sube los motores en 2,8 s. Sin WebGL2 —o sin
JavaScript— queda la **vista fija**: el mismo túnel en SVG, 150 hilos curvados
desde la garganta, el anillo y el resplandor. El contexto se libera al salir de
la página (`WEBGL_lose_context`).

Con `prefers-reduced-motion` del sistema, `globals.css` aplasta toda animación
CSS; la cabina devuelve la suya (radar, retículo, encendido, paralaje) valor a
valor y sólo con el interruptor en «on», como Edmunds.

### Presupuesto medido

30 fps, DPR ≤ 1,5, 2048 px de ancho, suspensión fuera de pantalla y en segundo
plano. En la GPU integrada del equipo de desarrollo (AMD Radeon, ANGLE D3D11,
Chromium sin cabeza) a 2048 × 1152: **16,2 cuadros/s el túnel contra 14,7 el
ventanal anterior** en la misma medida — no cuesta más que lo aprobado.

### Verificación

`components/ranger-contact.test.tsx`: vista fija del túnel sin WebGL2,
congelar sin soltar el canvas ni el contexto y liberarlo al desmontar, lectura
VUELO, frecuencia en su módulo y el panel fuera del hero. `e2e/ranger.spec.ts`:
el hero cubre el viewport a 375, 1440 y 1920 y el panel empieza debajo; draws
que paran al apagar y en segundo plano; con reduced-motion el radar gira a 5 s.
Veredicto visual pendiente del dueño.

## Cabina de mando (2026-09-13)

Petición del dueño, mismo día: «quiero remodelarlo, que sea más impactante,
estilo nave espacial interactivo con animaciones, mejores colores, algo
totalmente diferente: tengo la idea de estar como dentro de una nave
espacial». La versión anterior miraba la Ranger desde fuera, sobre una
fotografía generada; ésta sienta al visitante DENTRO de la nave de enlace.

### Composición

La primera pantalla es la cabina entera, en tres capas y un solo estado:

1. **Ventanal** (`RangerViewport`). Un contexto WebGL2 propio, un triángulo y
   ningún asset: campo estelar profundo en dos capas con paralaje de cabeza,
   cuatro capas de estrellas que se abren desde el punto de fuga —la nave
   avanza—, una nebulosa violeta y cian con núcleo rosado detrás del montante,
   una banda de polvo, un jirón cian bajo el limbo, y un mundo azul grisáceo
   con bandas, nubes en movimiento, terminador cálido, Fresnel y halo
   atmosférico encendido por un sol fuera de cuadro arriba a la derecha. Cada
   plano responde al puntero a un ritmo distinto (estrellas lejanas 0,006,
   cercanas hasta 0,04, mundo 0,004): eso es lo que convierte una imagen en una
   ventana. Debajo del canvas vive la **vista fija**, misma composición en CSS y
   SVG —170 estrellas sembradas con un LCG determinista, nebulosa en
   degradados, mundo como círculo de `244cqh` con la misma geometría que el
   shader— y es lo que recibe quien navega sin JavaScript, sin WebGL2 o con
   reduced-motion.
2. **Casco** (`RangerCanopy`). Un SVG con `preserveAspectRatio="none"` por
   orientación —apaisado y vertical—: cristal con esquinas redondeadas, bisel
   oscuro, filo con degradado cian→ámbar, y un montante inclinado que cruza la
   nebulosa. Los trazos usan `non-scaling-stroke`. Encima, reflejos de cristal:
   un brillo diagonal y dos manchas ámbar de los instrumentos, en `screen`. La
   cabecera del sitio queda como techo de la cabina; el casco empieza justo
   debajo.
3. **HUD y panel**. Sobre el cristal, el bloque de copia con esquinas de
   retículo (`h1` Contacto, eyebrow, introducción, CTA «Escribir un mensaje» y
   enlace directo al correo), las lecturas `ENLACE / DESTINO / HORA EN SANTO
   DOMINGO / FRECUENCIA` y una cinta de rumbo cuyo número es la fase orbital
   de la Ranger en el System Map (`placement.phase` = 097). El panel opaco
   cierra la cabina con tres módulos: **Frecuencias** (los tres canales reales
   como filas con LED), **Radar** (barrido y dos ecos) y **Mandos**
   (interruptor de vuelo y CTA a la consola).

Paleta: instrumentos en ámbar (`#ffb65c` / `#f2c879`) dentro, HUD en cian
(`#7fe5ff`) sobre el cristal, nebulosa violeta (`#c58cff`, el acento del
cuerpo) y cian fuera, verde (`#8cf2c2`) sólo para «hecho». Todo sobre
`#04060d`.

### Interacción

- **Vuelo.** `RangerCockpit` es un solo estado para todo lo que se mueve:
  canvas, barrido del radar, ecos, paralaje y encendido. Reduced-motion y el
  perfil ligero lo dejan quieto por defecto; «Activar vuelo» es el opt-in y
  «Pausar vuelo» lo detiene. Pausar retira el canvas y suelta el contexto con
  `WEBGL_lose_context`. Sin WebGL2 —o si el contexto se pierde— el interruptor
  desaparece: un botón de pausa sobre una imagen quieta sería una mentira. 30
  fps, DPR ≤ 1,5 y 2048 px de ancho máximo, `IntersectionObserver` y
  `visibilitychange`, como el océano de Miller.
- **Paralaje de cabeza.** Puntero fino y ratón: `--rx`/`--ry` en [−1, 1] sobre
  la cabina. Casco −9/−6 px, HUD −4/−3, reflejos +14/+8, vista fija +6/+4 y el
  shader recibe el mismo vector suavizado con inercia (0,08 por cuadro).
  Nunca supera lo que el pivote permite al hero y no controla ninguna cámara.
- **Encendido.** Al montar con movimiento permitido, `data-boot="on"` dispara
  animaciones ADITIVAS una sola vez: los LED se encienden escalonados, un
  barrido de luz recorre el panel, las esquinas del retículo se cierran y las
  lecturas aparecen. Nada se oculta antes: el HTML servido ya está completo y
  el encendido sólo se suma encima, así que no hay flash en conexiones rápidas.
- **Frecuencias.** Apuntar o enfocar un canal enciende su LED y escribe
  `01 · Correo` en el HUD; soltarlo lo limpia. Correo y teléfono se copian con
  confirmación accesible y manejo del fallo del portapapeles. Los enlaces
  mailto, wa.me y tel funcionan sin JavaScript.
- **Hora local.** La lectura del HUD es la hora real en Santo Domingo
  (`Intl.DateTimeFormat`, `America/Santo_Domingo`), actualizada cada 15 s con
  `useSyncExternalStore`; el servidor sirve `--:--` y no hay mismatch.
- **Consola de transmisión** (`RangerConsole`). Envuelve `ContactForm` sin
  tocarla: escucha `input`/`change` que suben del formulario y traduce el
  estado de los campos a una **potencia de señal** de cuatro segmentos (nombre
  ≥ 2, correo con `@` y punto, misión elegida, mensaje ≥ 20). Cuatro botones
  de misión —los `MISSION_OPTIONS` del esquema— escriben en el `<select>` real,
  así que el dato que viaja al servidor sigue siendo uno. Validación,
  consentimiento, Turnstile, protección server-side, errores, reintento y
  navegación a gracias no cambian.

### Vuelo (segundo pase, 2026-09-13)

El dueño aprobó la cabina («me está gustando mucho el diseño») y pidió que el
vuelo se sintiera como volar de verdad. El primer ventanal abría cuatro capas
de estrellas desde el punto de fuga con el reloj (0,03 ciclos/s): deriva, no
marcha. El pase cambia cuatro cosas, todas en el mismo shader y sin un draw ni
un asset más:

- **Distancia, no reloj.** El bucle integra `dist += dt · speed` y el campo de
  vuelo se indexa por `uDist`. `speed` sube de 0 a 1 en 2,8 s con una
  smoothstep tras cada (re)activación: los motores arrancan, no aparecen. Las
  cinco capas de estrellas van a 0,085 ciclos por unidad (una capa nueva cada
  2,4 s) y dos capas de **polvo cercano** a 0,3 —escasas (densidad 0,08),
  grandes y rápidas, lo que el ojo lee como velocidad.
- **Estelas.** `starStreaks` estira cada estrella a lo largo de la dirección
  radial desde el punto de fuga: la distancia se comprime por `stretch`, que
  crece con la velocidad y con el cuadrado de la fase (hasta ×17 en las
  estrellas próximas, ×32 en el polvo). El brillo se reparte con
  `inversesqrt(stretch)`, como en una exposición larga. Calibrado en píxeles por
  segundo, según manda Miller: una estrella a 400 px del punto de fuga avanza
  ~60 px/s y las del borde más de 100.
- **La nave se mueve.** Antes de dibujar nada, `uv` gira con un alabeo de
  ±0,7° y se desplaza ±16 px sobre dos armónicos lentos cada uno (períodos de
  12 a 48 s): balanceo, no vibración. Como es rotación de cámara, mueve por
  igual lo cercano y lo lejano. El mismo `yaw`, calculado en JS con las mismas
  fórmulas, se publica como `--yaw` en la cabina y la cinta de rumbo se
  desplaza con él (−34 px por unidad), además del paralaje del puntero.
- **Sobrevuelo.** El mundo gira bajo la nave con la distancia (superficie
  0,018 rad por unidad, nubes 0,03: dos velocidades, luego paralaje interno) y
  su centro deriva ±0,05 con período de diez minutos, acotado para que nunca
  salga del cristal. Medido a 1440 px: entre dos capturas separadas 0,8 s
  cambia el 15,8 % del disco visible.

Presupuesto: la búsqueda de estrellas pasa de 3×3 a las **cuatro celdas más
cercanas** —exacta porque ninguna estrella mide más de media celda—, y las
vetas de la nebulosa y la banda de polvo bajan de fbm a un solo ruido. Con
nueve capas de estrellas y cinco fbm, el coste por píxel queda por debajo del
del primer pase pese a tener el doble de capas. Sin vuelo (pausa,
reduced-motion, perfil ligero, sin WebGL2) no cambia nada: la vista fija sigue
siendo la misma composición.

### Límites

- La escena persistente duerme detrás de la Ranger (`COVERED_WORLDS` en
  `gargantua-system.tsx` gana `ranger`): nunca hay dos contextos dibujando.
- No se modifican el System Map, la Ranger del mapa, materiales ni cámaras.
  Cero dependencias nuevas, cero assets: `public/images/ranger/` desaparece.
- Sin JavaScript se conservan prosa, canales, CV y vecinos, la vista fija hace
  de ventanal y `ContactForm` explica la alternativa al formulario.

### Datos

Fuente única: `content/site.data.ts`. Correo: jonasjavier.dev@gmail.com.
Teléfono: +18498625049, también en Person/JSON-LD. El teléfono visible se
formatea desde el mismo dato; WhatsApp conserva su número sin el signo +.

### Verificación

`components/ranger-contact.test.tsx` cubre contenido, destinos, CV, datos
estructurados, la vista fija sin WebGL2, el contrato consentimiento → vuelo →
pausa → `loseContext` con un doble de WebGL2 (reduced y ligero), la lectura de
frecuencia en el HUD, la hora local, portapapeles y su fallo, y la consola
(medidor campo a campo y misiones ↔ `<select>`). `e2e/ranger.spec.ts`
comprueba cuatro tamaños sin desbordamiento y con blancos de 44 px, hover →
HUD, misión → select → medidor, conteo de `drawArrays` del canvas propio con
pausa, reanudación, segundo plano y fuera de pantalla, reduced-motion con
opt-in por teclado, y navegación sin JavaScript. A25/A26/A31 conservan envío,
reintento y CV. La aceptación visual queda para el dueño.

---

## Cabina de comunicaciones (2026-09-12) — referencia histórica sustituida

Petición del dueño · 2026-09-12. Primera implementación de `/es/contacto`,
rechazada el 2026-09-13 («no me gusta la versión actual»).

### Dirección

La última parada del portafolio es una cabina abierta al universo: un ventanal,
una nave de enlace sobre un horizonte planetario y tres frecuencias de contacto.
El gesto principal sigue siendo escribir. La imagen pone la escala y la
atmósfera; la instrumentación se reduce a una baliza y un receptor.

El hero ocupa la primera pantalla en escritorio. Contacto es su único h1, con
la prosa de `content/es/worlds/ranger.mdx`. Una franja de cristal reúne correo,
WhatsApp y teléfono. Debajo, el formulario aparece junto a una invitación breve;
CV ES/EN, GitHub y LinkedIn cierran la página sin repetir tarjetas de servicios.
En móvil el encuadre se acerca a la nave y los canales se apilan.

### Interacción y límites

- Probar señal ejecuta una simulación LOCAL de 1,6 segundos: tres ondas y una
  respuesta del receptor. No envía información, no reproduce audio ni promete
  una conexión real. No hay autoplay ni bucle de animación en reposo.
- Puntero fino: el ventanal responde en ±6/±4 píxeles. No controla ninguna cámara.
- Reduced-motion y el perfil ligero apagan el paralaje y la secuencia.
- No se añade WebGL, dependencia, canvas ni motor de animación.

### Recurso visual

Generado con la herramienta integrada ImageGen, convertido a WebP con Sharp:
`public/images/ranger/observation-deck.webp` — 1672 × 941, 116.888 bytes.
Retirado en la cabina de mando; vive en el historial de git junto con su
prompt.
