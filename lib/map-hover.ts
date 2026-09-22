/**
 * QUÉ PASA AL APUNTAR UN DESTINO DEL SYSTEM MAP.
 *
 * Hay dos respuestas montadas y este archivo elige cuál corre. Ninguna se
 * borra: el dueño pidió «probar quitar el target lock y esos efectos de hover»
 * y a la vez «guárdalo, no lo elimines», así que el camino viejo sigue entero
 * detrás de una condición y vuelve cambiando UNA palabra aquí.
 *
 * ── `instrumento` ───────────────────────────────────────────────────────────
 *
 * Lo que había hasta el 2026-09-21: la interfaz se comporta como el panel de
 * adquisición de blanco de una nave. Apuntar un cuerpo enciende a la vez
 *
 *   · las escuadras de adquisición sobre su silueta, medidas con el radio que
 *     publica el proyector 3D (`.system-map__target-brackets`);
 *   · su nombre cósmico Y su etiqueta de contenido, desplegados;
 *   · la lectura del HUD, que pasa de `SELECT TARGET` al nombre y, al hacer
 *     clic, a `TARGET LOCKED`;
 *   · la entrada del raíl, resaltada con su acento;
 *   · el tinte de foco del cuerpo en WebGL (`setFocus` → `uFocus`), que además
 *     CONGELA el paralaje mientras dura la adquisición;
 *   · el retículo del puntero, que abre sus arcos.
 *
 * Seis cosas a la vez, y las seis son el mismo gesto: pasar el ratón por
 * encima de un planeta.
 *
 * ── `sencillo` ──────────────────────────────────────────────────────────────
 *
 * Lo que se está probando: apuntar un destino no es adquirir un blanco, es
 * mirar una cosa. Quedan dos, y las dos salen de la misma geometría que ya
 * publicaba el proyector:
 *
 *   · un aro de un píxel alrededor del cuerpo, que entra encogiendo de 1.06 a
 *     1.00 y se queda en el acento del mundo a media opacidad;
 *   · su nombre cósmico, que sube dos píxeles y aparece.
 *
 * El HUD no cambia, el raíl no se enciende, el cuerpo 3D no se tiñe, el
 * paralaje no se congela y el retículo no se abre. El aro es lo único que
 * dice «esto se puede pulsar», y con eso basta.
 *
 * ── Cómo se prueban las dos ────────────────────────────────────────────────
 *
 * `SystemMap` acepta `hoverMode` como propiedad y por defecto toma esta
 * constante. Los tests recorren los dos caminos pasándola a mano, que es lo
 * que impide que el camino apagado se pudra mientras está apagado.
 */
export type MapHoverMode = "instrumento" | "sencillo";

export const MAP_HOVER_MODE: MapHoverMode = "sencillo";
