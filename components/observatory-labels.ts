/**
 * Las palabras del panel `DATOS`. Los números los pone `specimen-contract.ts`.
 *
 * La separación es deliberada: aquel módulo mide y no habla; éste habla y no
 * mide. Mezclarlos habría puesto texto visible dentro del código que recorre la
 * escena, que es la frontera que la regla 4 del repositorio protege.
 *
 * ── Por qué existe este archivo, y no un `key` crudo en la interfaz ─────────
 *
 * La primera versión del panel pintaba `Object.entries(architecture)` tal cual,
 * y en la primera captura ya se vio el problema: salían `EDGES` y
 * `RENDEREDFACETS` en inglés, y —peor— DOS filas llamadas «vértices» con
 * valores distintos, 1 688 y 16. La primera son los vértices de la malla que
 * dibuja three.js; la segunda, los del 4-cubo. Dos cosas distintas con el mismo
 * nombre en la misma tabla es exactamente el dato engañoso que todo este
 * sistema existe para impedir, sólo que colado por la puerta de la
 * presentación en vez de por la del contrato.
 *
 * De ahí las dos familias de abajo: lo que cuesta DIBUJAR el espécimen y lo que
 * ES la figura. Ningún número cambia; cambia que se sepa de qué habla cada uno.
 */

/** Métricas de render. No describen la figura: describen lo que cuesta pintarla. */
export const RENDER_LABELS = {
  draws: "Llamadas de dibujo",
  materials: "Materiales",
  vertices: "Vértices de malla",
} as const;

/**
 * Conteos de la figura, por clave del contrato.
 *
 * `renderedFacets` no es «caras»: son las seis que rellenamos de vidrio, de las
 * veinticuatro caras cuadradas del hipercubo. La etiqueta lo dice porque el
 * nombre de la clave por sí solo no basta cuando se lee en mayúsculas dentro de
 * un HUD.
 */
export const ARCHITECTURE_LABELS: Readonly<Record<string, string>> = {
  // Tesseracto
  vertices: "Vértices",
  edges: "Aristas",
  renderedFacets: "Facetas renderizadas",
  // Endurance
  modules: "Módulos",
  groups: "Grupos",
  arms: "Brazos",
  primaryModules: "Módulos principales",
  engineBells: "Campanas de motor",
  radiators: "Radiadores",
  dockedRangers: "Rangers atracadas",
  dockedLanders: "Módulos de descenso",
  manoeuvringPods: "Cápsulas de maniobra",
  manoeuvringNozzles: "Toberas de maniobra",
  rcsNozzles: "Toberas RCS",
  firingNozzles: "Toberas encendidas",
  warmLights: "Luces cálidas",
  technicalLights: "Luces técnicas",
};

/**
 * Lo que describe a un espécimen que se integra en vez de dibujarse.
 *
 * Son las cuatro lecturas que el §8 le reserva a Gargantúa, más los fotogramas
 * ya promediados. Ninguna se teclea: los radios salen del módulo de shaders,
 * los pasos del `define` con el que se compila el material y la mezcla del
 * uniform que el bucle acaba de escribir.
 *
 * `rs` se deja sin unidad a propósito. Es el radio de Schwarzschild EN
 * UNIDADES DEL INTEGRADOR, o sea la escala contra la que se miden los demás
 * números de esta ficha: ponerle «rs» detrás diría que el radio de
 * Schwarzschild se mide en radios de Schwarzschild.
 */
export const RAYMARCH_LABELS = {
  rs: "Radio de Schwarzschild",
  disk: "Disco",
  steps: "Pasos por píxel",
  blend: "Mezcla temporal",
  accumulated: "Fotogramas promediados",
} as const;

/**
 * Los ejes del 4-cubo, por índice de bit.
 *
 * No son una convención nuestra: dos vértices del hipercubo son adyacentes si y
 * sólo si sus índices difieren en un bit, y ese bit ES el eje. Las ocho aristas
 * que devuelven `W` son las que atraviesan la cuarta dimensión, y poder
 * señalarlas con el dedo es la única razón por la que la sonda existe.
 */
export const AXIS_LABELS = ["X", "Y", "Z", "W"] as const;

/**
 * Las lecturas de observación. Describen la CÁMARA, no la figura.
 *
 * Son la tercera familia del panel, y se separan de las otras dos por lo mismo
 * que aquéllas se separaron entre sí: lo que cuesta dibujar el espécimen, lo
 * que ES la figura y cómo se está mirando son tres cosas distintas. Mezclarlas
 * volvería a producir dos filas con el mismo nombre y distinto significado.
 *
 * `key` es la que de verdad significa algo aquí y ningún visor gráfico enseña:
 * el ángulo entre la luz y la mirada medido en el espécimen. Es la columna
 * `KEY` de la tabla del §6, y al orbitar es lo que está cambiando.
 */
/**
 * Los dos mandos de `LUZ`, dichos entero para quien navega escuchando.
 *
 * En la consola se ven como `CLAVE` y `GIRO` —tipografía de instrumento, cuatro
 * y cinco letras— pero el nombre accesible de un control deslizante tiene que
 * decir qué mueve. `Ángulo de clave` es además la MISMA palabra que la lectura
 * homónima del panel `DATOS`, y eso no es una coincidencia que convenga
 * romper: son el mismo número, uno para leerlo y otro para ponerlo.
 */
export const LIGHT_LABELS = {
  key: "Ángulo de clave de la luz",
  roll: "Giro de la luz en la pantalla",
} as const;

export const OBSERVATION_LABELS = {
  view: "Vista",
  azimuth: "Azimut",
  elevation: "Elevación",
  distance: "Distancia",
  key: "Ángulo de clave",
  fov: "Campo de visión",
} as const;

/**
 * Las cinco secciones del `REGISTRO`, en orden.
 *
 * Es la segunda profundidad del laboratorio y la frontera con `DATOS` es
 * deliberada: aquélla mide el objeto como CONSTRUCCIÓN TÉCNICA —llamadas de
 * dibujo, materiales, conteos que salen del modelo— y ésta lo cuenta como
 * EXPERIMENTO DE DISEÑO. Ningún número de las de arriba puede aparecer aquí, y
 * ninguna frase de aquí puede colarse en el panel de medidas: un dato medido y
 * una decisión de diseño no se leen igual ni valen lo mismo, y juntarlos
 * convertiría la medición en opinión.
 *
 * El orden no es alfabético ni casual, es el del trabajo real: qué se buscaba,
 * con qué se chocó, cómo se construyó, qué quedó y qué se tiró por el camino.
 */
export const REGISTRO_SECTIONS = [
  ["intencion", "Intención"],
  ["prueba", "Prueba"],
  ["construccion", "Construcción"],
  ["resultado", "Resultado"],
  ["iteraciones", "Iteraciones"],
] as const;

/**
 * La etiqueta de una clave, o la clave si nadie la ha nombrado.
 *
 * El respaldo no es una red de seguridad cómoda: es un fallo visible a
 * propósito. Si el modelo publica un conteo nuevo y nadie lo traduce, aparece
 * en crudo en el HUD — y el test de cobertura cae antes de que llegue ahí.
 */
export function architectureLabel(key: string): string {
  return ARCHITECTURE_LABELS[key] ?? key;
}
