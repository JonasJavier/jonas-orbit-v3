import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { worldsData } from "@/content/worlds.data";
import { ObservatoryViewer } from "./observatory-viewer";

/**
 * El cromo del Observatorio, y el contrato que el pase tipográfico puso en
 * juego.
 *
 * Los mandos perdieron su caja: ya no son píldoras con borde, son palabras
 * entre corchetes. Ese cambio movió dos cosas al terreno de lo frágil y este
 * archivo las sujeta.
 *
 * ── 1. El corchete tiene que verse y no oírse ───────────────────────────────
 *
 * `[BLOOM]` es la señal visible de «instrumento abierto» que pidió la dirección
 * visual. Pero el NOMBRE del mando tiene que seguir siendo «Bloom» a secas: es
 * lo que anuncia un lector de pantalla y lo que busca
 * `tools/observatory-shot.mjs` con `exact: true` para generar las capturas del
 * pase visual. Si alguien mueve los corchetes a un `::before` —que es lo
 * primero que apetece hacer— el mando pasa a llamarse «[Bloom]» en Chromium,
 * el lector de pantalla lee corchetes y la herramienta de captura deja de
 * encontrar el botón. Nada de eso da error en un build.
 *
 * ── 2. El estado dejó de tener borde donde apoyarse ─────────────────────────
 *
 * `aria-pressed` era antes una decoración sobre un control que ya se veía; con
 * la caja retirada es la ÚNICA fuente de la que cuelgan las tres marcas de
 * estado (corchetes, regla y peso), porque el CSS las selecciona por
 * `[aria-pressed="true"]`. Si el atributo se queda fijo o se invierte, el
 * instrumento se vuelve mudo sin romper nada más.
 *
 * Y su polaridad no es obvia, así que se fija aquí: para BLOOM y MATERIAL
 * «pulsado» significa el canal AISLADO —el efecto retirado—, y para DATOS
 * significa la ficha abierta. Las tres dicen lo mismo en realidad, «este
 * instrumento está actuando», pero dos de ellas apagan algo y la tercera
 * enciende algo, y esa asimetría se lee como un error si no está escrita.
 *
 * El canvas no entra: `createObservatoryScene` llega por `import()` dinámico y
 * jsdom no tiene WebGL. Esto prueba el cromo, que es lo que cambió.
 */

const world = worldsData.tesseract;

/*
  jsdom no trae `matchMedia`, y el modo cine pregunta por el tipo de puntero.
  Se declara un puntero FINO —el caso de escritorio, donde el modo cine existe—
  con el mismo `stubGlobal` que usa `about-page.test.tsx`.

  El caso contrario ya está cubierto por el propio componente: sin `matchMedia`
  no hay atenuado, a propósito.
*/
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));

function mount() {
  return render(
    <ObservatoryViewer
      world={{
        id: "tesseract",
        visual: world.visual,
        accent: world.accent,
        secondary: world.secondary,
        placement: world.placement,
      }}
      name="Tesseracto"
    />,
  );
}

const INSTRUMENTS = ["Bloom", "Material", "Datos"] as const;

describe("Observatorio · cromo instrumental", () => {
  it("los mandos se llaman exactamente como los busca la herramienta de captura", () => {
    mount();
    // En testing-library un `name` de tipo string ya es coincidencia EXACTA de
    // cadena completa: la misma garantía que `exact: true` le pide a Playwright
    // en `tools/observatory-shot.mjs`, que es el único consumidor externo.

    for (const label of [...INSTRUMENTS, "Reajustar"]) {
      expect(
        screen.getByRole("button", { name: label }),
        `el mando «${label}» cambió de nombre accesible`,
      ).toBeInTheDocument();
    }
  });

  it("los corchetes son tinta: se ven, y no entran en el nombre", () => {
    mount();
    const bloom = screen.getByRole("button", { name: "Bloom" });

    // Se ven: están en el DOM, con su par completo.
    const brackets = bloom.querySelectorAll(".observatory__bracket");
    expect(brackets).toHaveLength(2);
    expect(brackets[0]).toHaveTextContent("[");
    expect(brackets[1]).toHaveTextContent("]");

    // Y no se oyen: fuera del árbol de accesibilidad, uno por uno.
    for (const bracket of brackets) {
      expect(bracket).toHaveAttribute("aria-hidden", "true");
    }

    // La comprobación que de verdad importa, dicha del otro lado: el texto
    // visible del botón LLEVA corchetes y su nombre accesible NO.
    expect(bloom.textContent).toBe("[Bloom]");
  });

  it("el foco tiene de dónde agarrarse cuando el mando no tiene caja", () => {
    mount();
    /*
      El filete del foco se dibuja sobre `.observatory__ink` y no sobre el
      botón, porque el bloque del botón mide 44 px de alto y un anillo a su
      alrededor volvería a dibujar exactamente la píldora que este pase retira.
      Sin el span, un mando de esta banda se queda sin indicador de foco
      ninguno — y eso no lo nota nadie hasta que alguien navega con teclado.
    */
    for (const label of [...INSTRUMENTS, "Reajustar"]) {
      const button = screen.getByRole("button", { name: label });
      expect(
        button.querySelector(".observatory__ink"),
        `«${label}» no tiene tinta de la que colgar el foco`,
      ).not.toBeNull();
    }
  });

  it("aria-pressed refleja el estado de cada instrumento, con su polaridad", () => {
    mount();
    const get = (label: string) =>
      screen.getByRole("button", { name: label });

    // En reposo: bloom y emisión encendidos —o sea ningún canal aislado— y la
    // ficha cerrada. Los tres dicen `false` por motivos distintos.
    for (const label of INSTRUMENTS) {
      expect(get(label)).toHaveAttribute("aria-pressed", "false");
    }

    // BLOOM pulsado = halo RETIRADO = instrumento actuando.
    fireEvent.click(get("Bloom"));
    expect(get("Bloom")).toHaveAttribute("aria-pressed", "true");
    expect(get("Material")).toHaveAttribute("aria-pressed", "false");

    // DATOS pulsado = ficha ABIERTA. Polaridad contraria, misma lectura.
    fireEvent.click(get("Datos"));
    expect(get("Datos")).toHaveAttribute("aria-pressed", "true");
  });

  it("no queda ninguna píldora: los mandos no dibujan caja", () => {
    /*
      El diagnóstico del dueño fue literal —«botones tipo píldora […] bastante
      familiares como patrón web»— y el dato que lo respaldaba es que
      `border-radius: 999px` sobre un control VIVO no existía en ningún otro
      sitio del repositorio: ésta era la única.

      Se comprueba sobre la hoja de estilo porque jsdom no calcula estilo de
      verdad, y una aserción sobre `getComputedStyle` aquí daría verde siempre.
    */
    const css = readFileSync(join(process.cwd(), "components/observatory.css"), "utf8");
    const rules = css.split("}");
    for (const rule of rules) {
      if (!/\.observatory__(button|toggle)\b/.test(rule)) continue;
      expect(rule, "un mando del Observatorio volvió a tener radio").not.toMatch(
        /border-radius:\s*(999px|9999px|50%)/,
      );
    }
  });

  it("el modo cine atenúa en dos niveles y no en uno", () => {
    vi.useFakeTimers();
    try {
      const { container } = mount();
      const root = container.querySelector(".observatory")!;

      /*
        La corrección del primer pase visual: antes se atenuaba el cromo entero
        al 8 % y con él desaparecía el nombre del espécimen, así que la página
        se leía como «una geometría flotando en negro». Ahora la identidad baja
        a un nivel y la instrumentación a otro.

        El test fija la ESTRUCTURA —que existan los dos destinatarios distintos
        del atenuado— porque los porcentajes son dirección de arte y se
        calibran sobre captura, no aquí.
      */
      expect(root).toHaveAttribute("data-idle", "false");
      expect(root.querySelector(".observatory__specimen")).not.toBeNull();
      expect(root.querySelector(".observatory__foot")).not.toBeNull();

      // El temporizador dispara un `setState`, así que el avance va dentro de
      // `act` o React descarta el render y el atributo no llega al DOM.
      act(() => vi.advanceTimersByTime(4000));
      expect(root).toHaveAttribute("data-idle", "true");
    } finally {
      vi.useRealTimers();
    }
  });
});
