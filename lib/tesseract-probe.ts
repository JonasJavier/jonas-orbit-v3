import { TESSERACT_PATH } from "./tesseract";

/**
 * LA SONDA DEL TESSERACTO: qué arista se está señalando, y qué se sabe de ella.
 *
 * Todo lo que este módulo devuelve sale de la topología del 4-cubo o de la
 * misma función pura que dibuja la figura. No hay ni un valor tecleado, y ésa
 * es la condición que hacía falta cumplir antes de construir la sonda: una
 * lectura que parece medida y no lo está es peor que no tener sonda.
 *
 * ── Por qué no hay `THREE.Raycaster` ────────────────────────────────────────
 *
 * Porque no hace falta y porque sería menos exacto. La malla de las aristas es
 * un tubo de seis lados reconstruido en cada muestra: un rayo contra ella
 * devuelve un triángulo, y del triángulo hay que volver a deducir la arista.
 * Aquí se hace al revés — se proyectan los DIECISÉIS vértices y se busca el
 * segmento más cercano al puntero en dos dimensiones—, que son treinta y dos
 * distancias punto-segmento y ni una estructura de aceleración.
 *
 * De regalo sale el parámetro `t` a lo largo de la arista, que es lo que
 * permite interpolar la profundidad en W en el punto señalado y no sólo en sus
 * extremos.
 */

/** Los cuatro ejes del 4-cubo, por índice de bit. `3` es W. */
export const TESSERACT_AXES = 4;

/**
 * Por qué eje corre una arista: 0 = X, 1 = Y, 2 = Z, 3 = W.
 *
 * En un 4-cubo, dos vértices son adyacentes si y sólo si sus índices difieren
 * en UN bit, y ese bit es el eje por el que va la arista —`sampleTesseract`
 * construye cada vértice como `(vertex & (1 << axis)) ? 0.5 : -0.5`—. Así que
 * esto no es una convención de nuestro modelo: es la definición del hipercubo,
 * y por eso es invariante mientras la figura rota.
 *
 * Las ocho aristas que devuelven `3` son las que atraviesan la cuarta
 * dimensión. Es el único sitio del proyecto donde eso se puede señalar con el
 * dedo.
 */
export function edgeAxis(from: number, to: number): number {
  const differing = from ^ to;
  // Una arista del 4-cubo difiere en exactamente un bit. Si difiere en más de
  // uno, quien llama ha inventado una arista y el número no significa nada.
  if (differing === 0 || (differing & (differing - 1)) !== 0) return -1;
  return Math.log2(differing);
}

export interface ProbeHit {
  /** Índice de la arista en el circuito euleriano, 0-31. */
  edge: number;
  /** Los dos vértices del 4-cubo que une. */
  from: number;
  to: number;
  /** Eje por el que corre: 0 = X, 1 = Y, 2 = Z, 3 = W. */
  axis: number;
  /** Dónde cae el punto señalado a lo largo de la arista, de 0 (from) a 1 (to). */
  t: number;
  /** A cuántos píxeles del puntero quedó la arista. */
  distance: number;
}

/**
 * La arista más cercana al puntero.
 *
 * @param points   los dieciséis vértices ya proyectados, en PÍXELES del lienzo
 *                 y no en coordenadas normalizadas: en normalizadas una
 *                 pantalla apaisada mide distinto a lo ancho que a lo alto y la
 *                 arista «más cercana» dependería de la forma de la ventana.
 * @param x, y     el puntero, en los mismos píxeles.
 * @param reach    radio de captura. Fuera de él no hay sonda: señalar el vacío
 *                 tiene que poder no devolver nada.
 */
export function nearestEdge(
  points: Float32Array,
  x: number,
  y: number,
  reach: number,
): ProbeHit | null {
  let best: ProbeHit | null = null;

  for (let edge = 0; edge < TESSERACT_PATH.length; edge += 1) {
    const [from, to] = TESSERACT_PATH[edge];
    const ax = points[from * 2];
    const ay = points[from * 2 + 1];
    const bx = points[to * 2];
    const by = points[to * 2 + 1];

    const dx = bx - ax;
    const dy = by - ay;
    const span = dx * dx + dy * dy;
    /*
      Una arista puede proyectarse a un punto: mirando justo a lo largo de ella,
      los dos extremos caen en el mismo píxel. Ahí el parámetro no existe y se
      mide contra el extremo, que es lo que el visitante está señalando.
    */
    const t =
      span > 0
        ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / span))
        : 0;
    const distance = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (distance > reach) continue;
    if (best && distance >= best.distance) continue;

    best = { edge, from, to, axis: edgeAxis(from, to), t, distance };
  }

  return best;
}

/**
 * La profundidad en W del punto señalado, interpolada entre sus dos extremos.
 *
 * `cells` es el mismo array que llena `sampleTesseract` y el mismo que lee el
 * shader para repartir grosor y luz entre las dos celdas del hipercubo: 0 es lo
 * más lejano en W de esta pose y 1 lo más cercano. Normalizado por construcción
 * —`sampleTesseract` lo escala al rango de la pose—, así que es una posición
 * RELATIVA dentro de la figura y no una coordenada absoluta. La interfaz tiene
 * que decirlo así.
 */
export function probeDepth(cells: Float32Array, hit: ProbeHit): number {
  return cells[hit.from] * (1 - hit.t) + cells[hit.to] * hit.t;
}
