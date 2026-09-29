import { defineCopy } from "./i18n";

/**
 * Lo que dicen igual las seis páginas de mundo: la gramática de instrumento
 * («DESTINO 02 / MILLER») y la navegación a los vecinos. Vive junto para que
 * ninguna página lo traduzca a su manera.
 */
export const WORLD_COPY = defineCopy({
  es: {
    destination: "Destino",
    neighbours: "Destinos contiguos",
  },
  en: {
    destination: "Destination",
    neighbours: "Nearby destinations",
  },
});
