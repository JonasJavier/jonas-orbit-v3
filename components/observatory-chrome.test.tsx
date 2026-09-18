import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateCapabilities } from "@/components/scene/capability";
import { worldsData } from "@/content/worlds.data";
import { FlatWorldBody } from "./flat-world-body";
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

/*
  El veredicto de capacidad, declarado.

  Sin esto los tests del cromo caen todos, y caen POR EL MOTIVO CORRECTO: jsdom
  no tiene WebGL2, así que el gate del §9 decide `flat` y el visor entrega el
  respaldo plano —espécimen SVG sobre la ficha servida— en vez del instrumento.
  Es la misma clase de dependencia de entorno que `matchMedia`: el componente
  pregunta por el equipo y en un entorno de prueba hay que contestarle.

  Se mockea la evaluación y no el sondeo de WebGL porque lo que estos tests
  quieren fijar es el CROMO. Que el gate funcione lo prueba el último test de
  este archivo, que es el único que deja hablar al veredicto de verdad.
*/
vi.mock("@/components/scene/capability", async (original) => {
  const real =
    await original<typeof import("@/components/scene/capability")>();
  return { ...real, evaluateCapabilities: vi.fn() };
});

const conEquipo = () =>
  vi.mocked(evaluateCapabilities).mockReturnValue({
    level: "orbit",
    reason: "ok",
    canOverride: true,
  });

const sinEquipo = () =>
  vi.mocked(evaluateCapabilities).mockReturnValue({
    level: "flat",
    reason: "sin-webgl2",
    canOverride: false,
  });

/*
  LA ESCENA, declarada.

  El cromo del Observatorio no existe hasta que hay imagen: mientras el aparato
  está en espera manda la cara servida y toda la instrumentación va `inert`, para
  que nunca haya dos salidas ni dos nombres de espécimen a la vez. En jsdom no
  hay WebGL, así que sin este mock el instrumento no se encendería nunca y estos
  tests probarían la pantalla de espera.

  El mock hace exactamente dos cosas de verdad: devolver un contrato medible y
  llamar a `onFirstFrame`. Es el contrato del driver, no su implementación —lo
  que se prueba aquí es el cromo, igual que antes.
*/
const contrato = {
  draws: 4,
  materials: 3,
  vertices: 1688,
  architecture: { vertices: 16, edges: 32 },
};

/*
  Las vistas y la sonda llegan del handle, no de la ruta: es el instrumento
  quien sabe qué puede hacer con el cuerpo que ha construido. El doble tiene que
  publicarlas para que el cromo monte el grupo `OBSERVAR` y el mando `SONDA`.
*/
const escena = {
  contract: contrato,
  views: [
    { id: "canonica", label: "Canónica", study: "La pose del preset." },
    { id: "rasante", label: "Rasante", keyAngle: 92, study: "Las facetas." },
  ],
  canProbe: true,
  fov: 40,
  reset: vi.fn(),
  setView: vi.fn(),
  setProbe: vi.fn(),
  setBloom: vi.fn(),
  setEmission: vi.fn(),
  setMotion: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("@/components/scene/observatory-scene", () => ({
  createObservatoryScene: (options: { onFirstFrame?: () => void }) => {
    options.onFirstFrame?.();
    return escena;
  },
}));

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

/*
  El catálogo que la ruta compone en servidor, aquí a mano.

  Se declaran las seis entradas y sólo dos con enlace, que es el estado real del
  laboratorio: así el test del raíl comprueba las dos mitades —las montadas y
  las que todavía no— sin depender del contenido, y el día que entre la tercera
  hay que venir a tocarlo a propósito.
*/
const RAIL = [
  { id: "tesseract", index: 1, name: "Tesseracto", href: "/es/experimentos/observatorio/tesseracto" },
  { id: "endurance", index: 2, name: "Endurance", href: "/es/experimentos/observatorio/endurance" },
  { id: "ranger", index: 3, name: "Ranger", href: null },
  { id: "miller", index: 4, name: "Miller", href: null },
  { id: "edmunds", index: 5, name: "Edmunds", href: null },
  { id: "gargantua", index: 6, name: "Gargantúa", href: null },
] as const;

const RECORD = {
  intencion: "Intención de prueba.",
  prueba: "Prueba de prueba.",
  construccion: "Construcción de prueba.",
  resultado: "Resultado de prueba.",
  iteraciones: "Iteraciones de prueba.",
};

async function mount(props: { record?: typeof RECORD | null } = {}) {
  const utils = render(
    <ObservatoryViewer
      descriptor="Geometría de cuatro dimensiones"
      indexHref="/es/experimentos"
      name="Tesseracto"
      rail={[...RAIL]}
      record={props.record === undefined ? RECORD : props.record}
      world={{
        id: "tesseract",
        visual: world.visual,
        accent: world.accent,
        secondary: world.secondary,
        placement: world.placement,
      }}
    >
      {/* La cara servida, que en la ruta compone el componente de servidor.
          Aquí basta con que exista: lo que estos tests fijan es que el cromo
          la releva al encenderse, no su tipografía. */}
      <div className="observatory-face">
        <h1>Tesseracto</h1>
        <FlatWorldBody
          world={{
            id: "tesseract",
            visual: world.visual,
            accent: world.accent,
            secondary: world.secondary,
          }}
        />
        <Link href="/es/experimentos">Volver a Experimentos</Link>
      </div>
    </ObservatoryViewer>,
  );
  // Vacía la microcola del `import()` dinámico: sin esto la escena no ha
  // montado todavía, el instrumento sigue en espera y el cromo va `inert`.
  await act(async () => {});
  return utils;
}

const INSTRUMENTS = ["Bloom", "Material", "Datos"] as const;

describe("Observatorio · cromo instrumental", () => {
  beforeEach(conEquipo);
  it("los mandos se llaman exactamente como los busca la herramienta de captura", async () => {
    await mount();
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

  it("los corchetes son tinta: se ven, y no entran en el nombre", async () => {
    await mount();
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

  it("el foco tiene de dónde agarrarse cuando el mando no tiene caja", async () => {
    await mount();
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

  it("aria-pressed refleja el estado de cada instrumento, con su polaridad", async () => {
    await mount();
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

  it("no queda ninguna píldora: los mandos no dibujan caja", async () => {
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

  it("el modo cine atenúa en dos niveles y no en uno", async () => {
    vi.useFakeTimers();
    try {
      const { container } = await mount();
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

  it("la instrumentación de borde no afirma nada y no cierra el marco", async () => {
    /*
      El tercer ingrediente de la atmósfera, con sus dos vetos convertidos en
      aserciones.

      El primero es el que más fácil se rompe cuando alguien quiere «darle más
      vida» a los bordes: **ni una lectura**. El encargo veta las coordenadas
      falsas, y aquí no hay ninguna — un `ACQ 04` o un `+12.7°` serían un dato
      inventado, que es la regla 8 del repositorio aplicada a un píxel. Se
      comprueba sobre el texto porque es lo único que un test puede ver: si
      algún día aparece una cifra ahí dentro, este test la caza.

      El segundo es «nada de caja alrededor del viewport». Un rectángulo no se
      puede detectar en jsdom, que no calcula geometría, pero sí su causa más
      probable: que alguien resuelva las cuatro escuadras con un solo selector
      simétrico. Mientras las de abajo lleven su propia clase y su propia
      proporción invertida, la simetría no puede volver por accidente.

      Y va fuera del árbol de accesibilidad entero: son marcas de calibración,
      no información. Un lector de pantalla que las anunciara estaría leyendo
      decoración.
    */
    const { container } = await mount();
    const bloque = container.querySelector(".observatory__calipers")!;
    expect(bloque).not.toBeNull();
    expect(bloque).toHaveAttribute("aria-hidden", "true");
    expect(bloque.textContent).toBe("");

    expect(bloque.querySelectorAll(".observatory__caliper")).toHaveLength(4);
    for (const signo of ["fiducial", "ticks"]) {
      expect(
        bloque.querySelector(`.observatory__${signo}`),
        `falta el signo «${signo}» del borde`,
      ).not.toBeNull();
    }

    /*
      El calibre del borde IZQUIERDO ya no está, y eso es una decisión, no una
      pérdida: ese borde lo ocupa el catálogo de especímenes. Se comprueba el
      relevo entero —que el calibre se fue Y que el raíl ocupa su sitio— porque
      si un día alguien repone el calibre sin quitar el raíl, los dos se pisan
      en el mismo borde y nadie se entera hasta la captura.
    */
    expect(bloque.querySelector(".observatory__scale")).toBeNull();
    expect(container.querySelector(".observatory__rail")).not.toBeNull();

    // Las dos de abajo invierten la asimetría, así que no comparten regla con
    // las de arriba: es lo que impide que las cuatro dibujen el mismo sello.
    const css = readFileSync(
      join(process.cwd(), "components/observatory.css"),
      "utf8",
    );
    expect(css).toMatch(/\.observatory__caliper--bl,\s*\n\s*\.observatory__caliper--br \{[^}]*height: 2\.1rem/);
  });

  it("el catálogo nombra las seis muestras y sólo enlaza las montadas", async () => {
    /*
      El raíl es la pieza con más forma de trampa de accesibilidad de todo el
      visor, porque su diseño consiste en NO enseñar el nombre.

      En reposo se ven seis cifras. Si el nombre se ocultara con `display: none`
      o `visibility: hidden` —que es lo que uno escribe sin pensar— saldría del
      árbol de accesibilidad y el laboratorio tendría seis enlaces llamados
      «01», «02»… Un lector de pantalla leería una lista de números y ninguna
      muestra. De ahí que se oculte con opacidad, y de ahí este test: comprueba
      el nombre ACCESIBLE, que es justo lo que el ojo no ve.

      Y las cuatro que no se montan no son enlaces. Un enlace que no lleva a
      ninguna parte es peor que su ausencia, así que se comprueban las dos
      mitades: que estén —el laboratorio tiene seis muestras y esconder cuatro
      mentiría sobre su tamaño— y que no se puedan pulsar.
    */
    const { container } = await mount();
    const catalogo = screen.getByRole("navigation", { name: "Especímenes" });
    expect(catalogo.querySelectorAll("li")).toHaveLength(6);

    for (const slot of RAIL) {
      if (slot.href) {
        const enlace = screen.getByRole("link", { name: slot.name });
        expect(enlace).toHaveAttribute("href", slot.href);
      } else {
        expect(
          screen.queryByRole("link", { name: slot.name }),
          `«${slot.name}» no está montada y no puede ser un enlace`,
        ).toBeNull();
        expect(
          container.querySelector(`.observatory__slot--off`),
        ).not.toBeNull();
      }
    }
  });

  it("la muestra activa se marca por estado, no por color", async () => {
    /*
      `aria-current="page"` es la única fuente del estado activo: de él cuelgan
      las tres marcas visibles —la pica, el peso y el rótulo desplegado—, igual
      que `aria-pressed` sostiene las de los instrumentos. Si el atributo se
      pierde, el raíl deja de decir dónde estás sin romper nada más.

      Y es UNA sola: dos muestras activas a la vez es un estado imposible que un
      `find` descuidado produce con facilidad.
    */
    const { container } = await mount();
    const activos = container.querySelectorAll('[aria-current="page"]');
    expect(activos).toHaveLength(1);
    expect(activos[0]).toHaveTextContent("Tesseracto");
  });

  it("la identidad se ve en cifras y se oye en palabras", async () => {
    /*
      `01 / 06` es tipografía de instrumento y no dice nada en voz alta: un
      lector que anuncia «cero uno barra cero seis» no ha informado de nada. La
      cifra va `aria-hidden` y al lado vive la frase completa.
    */
    const { container } = await mount();
    const indice = container.querySelector(".observatory__index")!;
    expect(indice).toHaveTextContent("Espécimen 1 de 6");
    expect(indice.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "01/06",
    );
    expect(container.querySelector(".observatory__descriptor")).toHaveTextContent(
      "Geometría de cuatro dimensiones",
    );
  });

  it("la salida dice a dónde va, y su nombre accesible es su texto visible", async () => {
    /*
      Criterio «etiqueta en el nombre»: quien dicta por voz lee la palabra que
      ve, así que el nombre accesible y el texto visible tienen que ser la misma
      frase.

      Y la frase cambió en este pase. Antes ponía «Índice» con el destino en un
      `sr-only`: quien navega mirando tenía que deducir de qué índice se hablaba
      justo en la única ruta del sitio sin barra de navegación. La salida del
      instrumento no puede ser una palabra ambigua.
    */
    await mount();
    const salida = screen.getByRole("link", { name: "Salir del Observatorio" });
    expect(salida).toHaveAttribute("href", "/es/experimentos");
    expect(salida.textContent).toContain("Salir del Observatorio");
  });

  it("en espera manda la cara servida, y al encender manda el instrumento", async () => {
    /*
      LA INVARIANTE DEL ENCENDIDO: exactamente UNA de las dos superficies está
      viva en cada momento.

      No es una preferencia estética. Las dos dicen las mismas cosas —el nombre
      del espécimen y la salida— así que dejarlas vivas a la vez pone dos
      enlaces de salida en el tabulador y duplica cada nombre accesible. Antes
      de este pase pasaba exactamente eso: el HTML servido seguía enfocable
      debajo del rectángulo negro del visor, invisible y alcanzable.

      Aquí se comprueba el estado ENCENDIDO —el mock de la escena pinta su
      primer fotograma— y por eso la cara servida tiene que estar `inert`.
    */
    const { container } = await mount();
    const observatorio = container.querySelector(".observatory")!;
    expect(observatorio).toHaveAttribute("data-state", "nominal");

    const servida = container.querySelector(".observatory__served")!;
    expect(servida).toHaveAttribute("inert");
    expect(servida).toHaveAttribute("aria-hidden", "true");

    // Y el cromo, al revés: vivo y sin `inert`.
    expect(container.querySelector(".observatory__chrome")).not.toHaveAttribute(
      "inert",
    );
    expect(
      container.querySelector(".observatory__state")!.textContent,
    ).toContain("Nominal");
  });

  it("DATOS y REGISTRO son dos lecturas y no dos capas", async () => {
    /*
      Se excluyen, y por dos motivos que apuntan igual.

      Por espacio: los dos abren en el mismo hueco y los dos son altos —catorce
      filas la ficha de la Endurance, cinco párrafos el registro—, así que
      apilarlos hace crecer la banda hacia el espécimen, que es lo que el §5
      prohíbe.

      Y por significado: son dos formas distintas de leer el MISMO objeto —como
      construcción técnica y como experimento de diseño—, no dos capas que se
      sumen. Que el mando se apague solo al encender el otro es la interfaz
      diciéndolo.
    */
    await mount();
    const datos = () => screen.getByRole("button", { name: "Datos" });
    const registro = () => screen.getByRole("button", { name: "Registro" });

    expect(datos()).toHaveAttribute("aria-pressed", "false");
    expect(registro()).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(registro());
    expect(registro()).toHaveAttribute("aria-pressed", "true");
    expect(datos()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Intención de prueba.")).toBeInTheDocument();

    fireEvent.click(datos());
    expect(datos()).toHaveAttribute("aria-pressed", "true");
    expect(registro()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Intención de prueba.")).toBeNull();

    // Y pulsar el que ya está abierto lo cierra: la ficha no es un modo del que
    // haya que salir por otro sitio.
    fireEvent.click(datos());
    expect(datos()).toHaveAttribute("aria-pressed", "false");
  });

  it("el registro enseña una sección a la vez y se recorre con flechas", async () => {
    /*
      La corrección de densidad del pase de UX: con los cinco bloques puestos, el
      panel pasaba a ser el segundo protagonista del cuadro y el ojo empezaba a
      leer en vez de seguir mirando el objeto.

      Son pestañas DE VERDAD y no cinco botones que conmutan, y la diferencia es
      justo lo que se comprueba aquí: una sola seleccionada, una sola alcanzable
      con el tabulador —tabindex roving, o habría cinco paradas antes de llegar
      al texto— y las flechas moviendo la selección dentro del grupo. Nada de eso
      se rompe con un error visible; se rompe quedándose en un patrón que parece
      correcto y no lo es.
    */
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Registro" }));

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    for (const tab of tabs.slice(1)) {
      expect(tab).toHaveAttribute("aria-selected", "false");
      expect(tab).toHaveAttribute("tabindex", "-1");
    }

    // Una sección a la vez: la primera se lee y la última no está.
    expect(screen.getByText("Intención de prueba.")).toBeInTheDocument();
    expect(screen.queryByText("Iteraciones de prueba.")).toBeNull();

    // La flecha mueve la selección Y el foco: sin lo segundo, la navegación
    // deja al teclado atrás.
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Prueba de prueba.")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getAllByRole("tab")[1]);

    // `End` salta al final y `ArrowRight` allí no desborda.
    fireEvent.keyDown(screen.getAllByRole("tab")[1], { key: "End" });
    expect(screen.getByText("Iteraciones de prueba.")).toBeInTheDocument();
    fireEvent.keyDown(screen.getAllByRole("tab")[4], { key: "ArrowRight" });
    expect(screen.getByText("Iteraciones de prueba.")).toBeInTheDocument();

    // Y el panel dice de qué pestaña cuelga.
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "registro-tab-iteraciones");
  });

  it("el paso compacto no da la vuelta al llegar al extremo", async () => {
    /*
      En táctil el raíl vertical no sirve —revela el nombre al apuntar y no hay
      dónde apuntar— así que lo sustituye `‹ 01 / 06 ›`. Las dos presentaciones
      viven a la vez en el DOM y se excluyen por `display: none`, que sí saca del
      árbol de accesibilidad: nunca hay dos navegaciones de especímenes expuestas.

      El paso recorre sólo las muestras MONTADAS, y no envuelve: con dos montadas
      envolver haría que las dos flechas llevaran al mismo sitio y el control
      mentiría sobre dónde estás. Desde la primera, «anterior» no existe.
    */
    const { container } = await mount();
    const paso = container.querySelector(".observatory__step")!;
    const flechas = paso.querySelectorAll(".observatory__step-arrow");
    expect(flechas).toHaveLength(2);

    // Estamos en la primera: atrás no hay nada y no es un enlace.
    expect(flechas[0].tagName).toBe("SPAN");
    expect(flechas[0]).toHaveAttribute("aria-hidden", "true");

    // Adelante sí, y nombra su destino en vez de decir «siguiente».
    expect(flechas[1].tagName).toBe("A");
    expect(
      screen.getByRole("link", { name: "Muestra siguiente: Endurance" }),
    ).toHaveAttribute("href", "/es/experimentos/observatorio/endurance");
  });

  it("la ficha tiene salida propia para cuando tapa el banco", async () => {
    /*
      En móvil la ficha se convierte en hoja inferior y cubre los instrumentos,
      incluido el que la abrió. Sin esta cabecera no habría forma visible de
      salir del modo lectura.

      Se comprueba en el DOM y no en píxeles porque jsdom no calcula estilo: lo
      que sujeta el test es que el botón EXISTA y cierre de verdad. Que en
      escritorio esté oculto lo hace la hoja de estilo, y ahí `display: none` lo
      retira también del árbol de accesibilidad, que es lo correcto — allí se
      cierra con el instrumento.
    */
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Registro" }));
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar registro" }));
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByRole("button", { name: "Registro" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sin registro escrito no hay mando REGISTRO", async () => {
    /*
      Los cuatro especímenes que faltan no tienen registro, y no se les inventa
      uno. Un mando que abriera una ficha vacía sería peor que ningún mando —y
      sería, además, la regla 8 incumplida por la puerta de la interfaz.

      Por eso `REGISTRO` no entra en `preset.instruments`: aquella lista dice qué
      puede hacer la ESCENA con el cuerpo —apagar su halo, aislar su emisión— y
      esto no es una capacidad de la escena, es contenido.
    */
    await mount({ record: null });
    expect(screen.queryByRole("button", { name: "Registro" })).toBeNull();
    expect(screen.getByRole("button", { name: "Datos" })).toBeInTheDocument();
  });

  it("sin equipo entrega el espécimen plano y NO tapa la ficha", async () => {
    /*
      §9 / O7: en `flat` o sin WebGL2 hay espécimen SVG y ficha completa.

      Las dos mitades importan y la segunda es la que se olvida. El visor normal
      es `position: fixed; inset: 0` y TAPA el HTML servido —título, resumen y
      vuelta al índice—, cosa que da igual cuando encima hay un espécimen en 3D
      porque ésa es la experiencia. En `flat` no: taparlo dejaría a alguien con
      un equipo modesto mirando un rectángulo negro en vez de la página.

      De ahí que el respaldo no sea «el visor apagado» sino otro árbol, en
      flujo. Este test fija justamente eso: que el contenedor a pantalla
      completa NO se monta.
    */
    sinEquipo();
    const { container } = await mount();

    expect(container.querySelector(".observatory")).toBeNull();
    expect(container.querySelector(".observatory__canvas")).toBeNull();
    expect(container.querySelector(".observatory__flat")).not.toBeNull();
    expect(container.querySelector("[data-flat-world='tesseract']")).not.toBeNull();

    // Y sin instrumentos: no hay modelo del que medir nada, así que un banco
    // de INSPECCIONAR aquí prometería lecturas que no existen.
    expect(screen.queryByRole("button", { name: "Bloom" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Datos" })).toBeNull();
  });

  /* ── V1.5 · observar, comparar, sondar ─────────────────────────────────── */

  it("las vistas son un grupo de opciones y llegan del instrumento", async () => {
    /*
      No son cinco botones sueltos: son un `radiogroup`, porque elegir una vista
      EXCLUYE a las otras y quien navega con teclado espera que las flechas se
      muevan dentro del grupo. Y llegan del handle de la escena, no de la ruta:
      es el instrumento quien sabe qué puede hacer con el cuerpo que construyó.
    */
    await mount();
    const grupo = screen.getByRole("radiogroup", {
      name: "Vistas de observación",
    });
    const vistas = within(grupo).getAllByRole("radio");
    expect(vistas).toHaveLength(2);
    expect(vistas[0]).toHaveAttribute("aria-checked", "true");

    await act(async () => {
      fireEvent.click(vistas[1]);
    });
    expect(escena.setView).toHaveBeenCalledWith(1);
    expect(vistas[1]).toHaveAttribute("aria-checked", "true");
    // La frase que convierte un encuadre en un instrumento acompaña a la vista.
    expect(document.querySelector(".observatory__study")?.textContent).toContain(
      "facetas",
    );
  });

  it("mantener un mando compara, y soltarlo NO deja el instrumento al revés", async () => {
    /*
      La diferencia entre un interruptor y una comparación. Mantener apaga el
      halo mientras se sostiene; soltar lo devuelve y —esto es lo que costó una
      captura— NO conmuta el pestillo. `preventDefault` en `pointerup` no
      cancela el `click` de un botón, así que el estado se decide en el propio
      `click` midiendo cuánto duró la pulsación.
    */
    await mount();
    const bloom = screen.getByRole("button", { name: "Bloom" });
    escena.setBloom.mockClear();
    // El reloj del gesto, bajo control: `event.timeStamp` es de sólo lectura en
    // un evento sintético y no se puede fijar desde aquí.
    const reloj = vi.spyOn(performance, "now");

    reloj.mockReturnValue(1000);
    await act(async () => {
      fireEvent.pointerDown(bloom);
    });
    expect(escena.setBloom).toHaveBeenLastCalledWith(false);
    expect(bloom).toHaveAttribute("aria-pressed", "true");

    reloj.mockReturnValue(1600);
    await act(async () => {
      fireEvent.pointerUp(bloom);
      fireEvent.click(bloom);
    });
    expect(escena.setBloom).toHaveBeenLastCalledWith(true);
    expect(bloom).toHaveAttribute("aria-pressed", "false");
    reloj.mockRestore();
  });

  it("un clic corto sigue conmutando el pestillo", async () => {
    // Es lo que mantiene el mando utilizable con teclado, donde «mantener» no
    // existe como gesto, y para quien quiera dejarlo apagado y orbitar.
    await mount();
    const bloom = screen.getByRole("button", { name: "Bloom" });
    escena.setBloom.mockClear();
    const reloj = vi.spyOn(performance, "now");

    reloj.mockReturnValue(2000);
    await act(async () => {
      fireEvent.pointerDown(bloom);
    });
    reloj.mockReturnValue(2060);
    await act(async () => {
      fireEvent.pointerUp(bloom);
      fireEvent.click(bloom);
    });
    expect(bloom).toHaveAttribute("aria-pressed", "true");
    expect(escena.setBloom).toHaveBeenLastCalledWith(false);
    reloj.mockRestore();
  });

  it("la sonda sólo aparece donde se puede nombrar lo que se señala", async () => {
    await mount();
    const sonda = screen.getByRole("button", { name: "Sonda" });
    await act(async () => {
      fireEvent.click(sonda);
    });
    expect(escena.setProbe).toHaveBeenLastCalledWith(true);
    expect(sonda).toHaveAttribute("aria-pressed", "true");
  });

  it("DATOS se lee en tres familias y en este orden", async () => {
    /*
      Qué estoy viendo → cómo lo estoy observando → cómo está construido. El
      orden ES la lectura: abrir por las llamadas de dibujo contaba primero lo
      que le cuesta a la GPU, que es el orden de un profiler y no el de un
      laboratorio.
    */
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Datos" }));
    });
    const panel = document.querySelector(".observatory__data")!;
    const familias = [...panel.querySelectorAll("section h2")].map(
      (node) => node.textContent,
    );
    expect(familias).toEqual(["Objeto", "Observación", "Render"]);

    // Y la observación publica el campo de visión que dice el instrumento, no
    // un número escrito aquí.
    expect(panel.textContent).toContain(`${escena.fov}°`);
  });
});
