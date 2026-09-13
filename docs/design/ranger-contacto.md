# Ranger — cabina de mando

Implementación de `/es/contacto`. La sección `Cabina de mando (2026-09-13)`
manda sobre `Cabina de comunicaciones (2026-09-12)`, que queda abajo como
referencia histórica sustituida.

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
