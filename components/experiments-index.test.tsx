import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SpecimenEntry } from "@/lib/observatory-catalog";
import { ExperimentsIndex } from "./experiments-index";

/**
 * EL ÍNDICE DE LA RECEPCIÓN, Y LA FILA QUE YA NO SE PINTA.
 *
 * Este archivo nace el día que el laboratorio se completó, y nace justo por
 * eso. Hasta entonces la regla «una muestra catalogada y sin montar aparece con
 * su fila y sin puerta» la comprobaba `e2e/experimentos.spec.ts` contando dos
 * `aria-disabled` sobre el catálogo REAL. Con Miller y Edmunds montados esa
 * cuenta pasó a cero, y con ella se fue la única prueba de la rama — el
 * componente conserva el camino y nadie volvía a recorrerlo.
 *
 * La lección es la de siempre en este repositorio: **una prueba que depende de
 * que los datos reales tengan un hueco deja de probar nada el día que el hueco
 * se llena**, y no falla al hacerlo. Es el mismo motivo por el que el fixture
 * del raíl en `observatory-chrome.test.tsx` es deliberadamente mixto.
 *
 * Así que el catálogo de aquí es INVENTADO a propósito y no se parece al de
 * producción: tres filas, una sin montar. No hay que actualizarlo cuando el
 * laboratorio crezca o encoja, que es exactamente la propiedad que le falta al
 * otro.
 */

/* `useRouter` no existe fuera del App Router, y aquí no se navega: estas
   pruebas miran lo que se PINTA, no el protocolo de adquisición. */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const CATALOGO: SpecimenEntry[] = [
  {
    id: "tesseract",
    index: 1,
    name: "Tesseracto",
    descriptor: "Geometría de cuatro dimensiones",
    pair: "CRISTAL / CUARTA DIMENSIÓN",
    href: "/es/experimentos/observatorio/tesseracto",
  },
  {
    id: "endurance",
    index: 2,
    name: "Endurance",
    descriptor: "Máquina orbital",
    pair: "ESTRUCTURA / ALUMINIO",
    href: "/es/experimentos/observatorio/endurance",
  },
  {
    /*
      La muestra sin montar. Lleva nombre y par REALES —el objeto existe y está
      modelado— y lo único que le falta es su observación: eso es justo lo que
      esta fila tiene que saber decir sin fingir una puerta.
    */
    id: "miller",
    index: 3,
    name: "Miller",
    descriptor: "Un océano sin costa",
    pair: "AGUA / LUZ",
    href: null,
  },
];

describe("el índice de especímenes", () => {
  it("enseña las tres muestras y sólo enlaza las montadas", () => {
    render(<ExperimentsIndex specimens={CATALOGO} />);
    const indice = screen.getByRole("region", {
      name: "Índice de especímenes",
    });

    expect(indice.querySelectorAll(".specimen-index__item")).toHaveLength(3);
    expect(within(indice).getAllByRole("link")).toHaveLength(2);
  });

  it("la muestra sin montar no es un enlace muerto: lo dice", () => {
    render(<ExperimentsIndex specimens={CATALOGO} />);

    /*
      Tres afirmaciones y las tres importan por separado.

      Que NO sea un enlace es lo que impide prometer una puerta que no existe.
      Que lleve `aria-disabled` es lo que hace que la ausencia se anuncie en vez
      de ser un hueco silencioso. Y que conserve su nombre y su par es la
      regla 8 aplicada a un índice: el catálogo dice cuántas muestras tiene el
      laboratorio, así que enseñar sólo las observables mentiría sobre su
      tamaño.
    */
    expect(screen.queryByRole("link", { name: /Miller/ })).toBeNull();

    const fila = screen.getByText("Miller").closest(".specimen-row")!;
    expect(fila).toHaveAttribute("aria-disabled", "true");
    expect(fila.tagName).toBe("SPAN");
    expect(within(fila as HTMLElement).getByText("AGUA / LUZ")).toBeTruthy();
    expect(within(fila as HTMLElement).getByText("Sin montar")).toBeTruthy();
  });

  it("las montadas llevan a su laboratorio sin un «LISTO» en reposo", () => {
    render(<ExperimentsIndex specimens={CATALOGO} />);

    const enlace = screen.getByRole("link", { name: /Endurance/ });
    expect(enlace).toHaveAttribute(
      "href",
      "/es/experimentos/observatorio/endurance",
    );
    expect(within(enlace).queryByText("Listo")).toBeNull();
  });
});
