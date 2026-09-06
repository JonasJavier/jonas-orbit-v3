/** El cubo de cuatro dimensiones. Lo comparten WebGL y el atlas plano, que
 *  no ejecuta JavaScript: la misma topología y la misma pose inicial en los
 *  dos, para que el destino no cuente dos cosas distintas segun el perfil. */
const edges: [number, number][] = [];
for (let vertex = 0; vertex < 16; vertex++) {
  for (let axis = 0; axis < 4; axis++) {
    const other = vertex ^ (1 << axis);
    if (vertex < other) edges.push([vertex, other]);
  }
}

/*
  Los dieciséis vértices tienen grado CUATRO —par—, así que el grafo admite un
  circuito euleriano: un solo lápiz recorre las treinta y dos aristas y vuelve
  al punto de partida sin levantarse ni teletransportarse. Es la condición que
  hace posible el trazo continuo del hero; con un vértice impar habría saltos,
  y un trazo que salta no se lee como alguien dibujando.
*/
const remaining = edges.map(() => true);
const stack = [0];
const circuit: number[] = [];
while (stack.length) {
  const vertex = stack[stack.length - 1];
  const index = edges.findIndex(([a, b], i) => remaining[i] && (a === vertex || b === vertex));
  if (index < 0) circuit.push(stack.pop()!);
  else {
    remaining[index] = false;
    stack.push(edges[index][0] === vertex ? edges[index][1] : edges[index][0]);
  }
}
circuit.reverse();
export const TESSERACT_PATH = circuit.slice(1).map((to, i) => [circuit[i], to] as const);

/** Seis de las veinticuatro caras cuadradas. El vacío sigue siendo la
 *  superficie dominante: el vidrio se lee por el canto, no por el relleno. */
export const TESSERACT_FACETS = [
  [0, 1, 3, 2], [12, 13, 15, 14], [0, 4, 12, 8],
  [3, 7, 15, 11], [0, 2, 10, 8], [5, 7, 15, 13],
] as const;

/**
 * Rotación en 4D y perspectiva, en tiempo ABSOLUTO y sobre memoria reutilizada.
 *
 * Absoluto y no incremental por el mismo motivo que `spinAt`: un paso por
 * fotograma haría que la figura se deformara al doble de velocidad en una
 * pantalla de 120 Hz. Centrado y normalizado en cada muestra porque la
 * envolvente dimensiona el blanco de clic y los corchetes de adquisición, y
 * una figura que respira los movería con ella — también a las seis horas.
 *
 * `cells`, si se pasa, recibe la PROFUNDIDAD EN W de cada vértice normalizada
 * a 0..1: 1 la celda que en este instante está más cerca en la cuarta
 * dimensión, 0 la más lejana. Es el dato que separa las dos celdas del
 * hipercubo, y sin él las treinta y dos aristas pesan lo mismo y la figura se
 * lee como una jaula. Se normaliza en cada muestra —y no contra un rango fijo—
 * porque el recorrido en w cambia con la rotación: con una escala fija, la
 * jerarquía se desvanecía justo en las fases donde el cubo se ve más de frente.
 */
export function sampleTesseract(seconds: number, target: Float32Array, cells?: Float32Array): void {
  const angles = [seconds * 0.19 + 0.35, seconds * 0.137 + 0.48, seconds * 0.083 + 0.16];
  const cos = angles.map(Math.cos), sin = angles.map(Math.sin);
  let cx = 0, cy = 0, cz = 0;
  for (let vertex = 0; vertex < 16; vertex++) {
    const p: number[] = [0, 1, 2, 3].map((axis) => (vertex & (1 << axis)) ? 0.5 : -0.5);
    for (let axis = 0; axis < 3; axis++) {
      const a = p[axis], w = p[3];
      p[axis] = a * cos[axis] - w * sin[axis];
      p[3] = a * sin[axis] + w * cos[axis];
    }
    const perspective = 1.65 / (1.65 - p[3]);
    if (cells) cells[vertex] = perspective;
    // El cubo se presenta en diagonal en 3D, antes de la pose fija del sistema.
    const x = p[0] * perspective, y = p[1] * perspective, z = p[2] * perspective;
    const rx = x * Math.cos(0.6) - z * Math.sin(0.6);
    const rz = x * Math.sin(0.6) + z * Math.cos(0.6);
    const ry = y * Math.cos(0.45) - rz * Math.sin(0.45);
    target[vertex * 3] = rx * Math.cos(0.28) - ry * Math.sin(0.28);
    target[vertex * 3 + 1] = rx * Math.sin(0.28) + ry * Math.cos(0.28);
    target[vertex * 3 + 2] = y * Math.sin(0.45) + rz * Math.cos(0.45);
    cx += target[vertex * 3]; cy += target[vertex * 3 + 1]; cz += target[vertex * 3 + 2];
  }
  cx /= 16; cy /= 16; cz /= 16;
  let radius = 0;
  for (let vertex = 0; vertex < 16; vertex++) {
    const i = vertex * 3;
    target[i] -= cx; target[i + 1] -= cy; target[i + 2] -= cz;
    radius = Math.max(radius, Math.hypot(target[i], target[i + 1], target[i + 2]));
  }
  for (let i = 0; i < target.length; i++) target[i] *= 1.5 / radius;
  if (!cells) return;
  let low = Infinity, high = -Infinity;
  for (let vertex = 0; vertex < 16; vertex++) {
    low = Math.min(low, cells[vertex]); high = Math.max(high, cells[vertex]);
  }
  const span = Math.max(high - low, 0.000001);
  for (let vertex = 0; vertex < 16; vertex++) cells[vertex] = (cells[vertex] - low) / span;
}
