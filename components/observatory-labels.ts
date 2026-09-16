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
 * La etiqueta de una clave, o la clave si nadie la ha nombrado.
 *
 * El respaldo no es una red de seguridad cómoda: es un fallo visible a
 * propósito. Si el modelo publica un conteo nuevo y nadie lo traduce, aparece
 * en crudo en el HUD — y el test de cobertura cae antes de que llegue ahí.
 */
export function architectureLabel(key: string): string {
  return ARCHITECTURE_LABELS[key] ?? key;
}
