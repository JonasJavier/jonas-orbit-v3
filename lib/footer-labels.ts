import type { Locale } from "@/content/site.data";
import { defineCopy } from "./i18n";
import type { World } from "./worlds";

/**
 * La línea del pie: cada ruta dice dónde está el visitante, con la gramática
 * de instrumento del sitio. Vive junta para que los dos idiomas digan lo mismo
 * en todas las páginas.
 */
const COPY = defineCopy({
  es: {
    destination: "DESTINO",
    missionFile: "ARCHIVO DE MISIÓN",
    transmission: "TRANSMISIÓN CONFIRMADA",
    privacy: "PROTOCOLO RANGER / PRIVACIDAD",
    services: "RANGER / SERVICIOS",
    blog: "BITÁCORA DE A BORDO",
  },
  en: {
    destination: "DESTINATION",
    missionFile: "MISSION FILE",
    transmission: "TRANSMISSION CONFIRMED",
    privacy: "RANGER PROTOCOL / PRIVACY",
    services: "RANGER / SERVICES",
    blog: "SHIP’S LOG",
  },
});

const pad = (n: number) => String(n).padStart(2, "0");

export function destinationLabel(world: World, locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].destination} ${pad(world.order)} / ${world.cosmicName.toUpperCase()}`;
}

export function missionFileLabel(order: number, locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].missionFile} ${pad(order)}`;
}

export function transmissionLabel(locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].transmission}`;
}

export function privacyLabel(locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].privacy}`;
}

export function servicesLabel(locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].services}`;
}

export function blogLabel(locale: Locale): string {
  return `JONÁS ORBIT · ${COPY[locale].blog}`;
}
