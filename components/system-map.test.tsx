import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
  El raíl navega a través de `useWorldNavigation`, la costura que aísla al Hero
  de CÓMO se viaja a un mundo (hoy rutas, mañana scroll). Eso arrastra
  `useRouter`, que no existe fuera del App Router: aquí se sustituye por un
  doble. Lo que este archivo comprueba es el contrato del MARCADO, no el viaje.
*/
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), prefetch: vi.fn() }),
}));
import { VOYAGE_SHORT } from "@/lib/voyage";
import { cancelVoyage } from "@/lib/voyage-controller";
import { getWorldNavItems } from "@/lib/worlds";
import { SystemMap } from "./system-map";

const worlds = getWorldNavItems("es");
const languages = { en: "/en", es: "/es" };
const MAP_LABEL = "Destinos del Sistema Gargantúa";

/*
  El clic ya no navega en el mismo tick: arranca la travesía y el router
  recibe la ruta en el pico, por temporizador. Sin escena viva —que es el caso
  de jsdom— va la versión reducida, así que avanzar ese tiempo basta.
*/
const SHORT_PUSH_MS = Math.round(VOYAGE_SHORT.push * 1000) + 1;

describe("SystemMap — el contrato entre el HTML y la escena", () => {
  beforeEach(() => {
    routerPush.mockClear();
    cancelVoyage();
  });

  afterEach(() => {
    cancelVoyage();
    vi.useRealTimers();
  });

  it("expone la marca mínima y un TARGET en reposo sin copy personal", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);

    expect(container.querySelector(".hud__system")).toHaveTextContent(
      /Jonas Orbit/i,
    );
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "idle");
    expect(target).toHaveTextContent(/System map/i);
    expect(target).toHaveTextContent(/Select target/i);
    expect(container).not.toHaveTextContent(/Jonás Javier Encarnación/i);
    expect(container).not.toHaveTextContent(/ingeniería y diseño orbitan juntos/i);
  });

  it("sirve los 6 destinos como enlaces reales", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);

    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const links = within(map).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(container.querySelectorAll(".system-map__hit-target")).toHaveLength(
      6,
    );

    for (const world of worlds) {
      const link = links.find(
        (candidate) => candidate.getAttribute("href") === world.href,
      );
      expect(link, `falta el enlace a ${world.href}`).toBeDefined();
      // El rótulo visible es una palabra, pero el enlace lleva además el nombre
      // cósmico y el resumen en el documento: eso es lo que indexa Googlebot.
      // El título largo vive en la página del destino, no aquí.
      expect(link).toHaveTextContent(world.shortLabel);
      expect(link).toHaveTextContent(world.cosmicName);
      expect(link).toHaveTextContent(world.summary);
    }
  });

  it("pinta cinco cuerpos 2D en los mismos slots del fallback", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const bodies = container.querySelectorAll<HTMLElement>("[data-flat-world]");

    expect(bodies).toHaveLength(5);
    expect(container.querySelector('[data-flat-world="gargantua"]')).toBeNull();

    for (const world of worlds.filter((item) => item.id !== "gargantua")) {
      const body = container.querySelector<HTMLElement>(
        `[data-flat-world="${world.id}"]`,
      );
      const slot = body?.closest<HTMLElement>(".system-map__slot");

      expect(body, `falta el cuerpo plano de ${world.id}`).not.toBeNull();
      expect(body).toHaveAttribute("aria-hidden", "true");
      expect(slot).toHaveAttribute("data-flat-visual", world.visual);
      expect(slot).toHaveAttribute("data-map-world", world.id);
      expect(slot?.querySelector(`[data-system-body="${world.id}"]`)).not.toBeNull();
    }
  });

  it("cada destino se anuncia con su nombre cósmico y su función", () => {
    /*
      El nombre accesible pasó de «Formación» a «Formación Miller».

      La etiqueta visible ahora tiene dos líneas: el nombre del cuerpo manda y
      la función va debajo. Los dos entran en el nombre accesible, y eso es
      deliberado por dos motivos: es más informativo que cualquiera de los dos
      por separado, y cumple «Label in Name» (WCAG 2.5.3) — todo lo que se ve
      forma parte de lo que se anuncia.

      Lo que este test sigue vigilando es lo de antes: que el resumen NO se
      cuele en el nombre. Con él dentro, cada destino se anunciaba con una frase
      entera de más, que es justo el ruido del que la home se quitó de encima.
    */
    render(<SystemMap worlds={worlds} languages={languages} />);

    for (const world of worlds) {
      const esperado = new RegExp(
        "^" + world.shortLabel + " " + world.cosmicName + "$",
        "i",
      );
      const link = screen.getByRole("link", { name: esperado });
      expect(link).toHaveAttribute("href", world.href);
    }
  });

  it("el orden del DOM es el narrativo, no el espacial", () => {
    // Quien tabula recorre la historia de principio a fin; la posición la ponen
    // el CSS y, cuando existe, la escena. El orden es real aunque ya no se
    // imprima delante de cada destino.
    render(<SystemMap worlds={worlds} languages={languages} />);
    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const hrefs = within(map)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(worlds.map((world) => world.href));
  });

  it("cada destino lleva un proxy dedicado centrado en el radio de la escena", () => {
    // Es el contrato con G2: la escena NO crea nodos, solo escribe --map-x y
    // --map-y sobre estos. Si el atributo desapareciera, los cuerpos 3D
    // quedarían mudos y sin blanco de clic — y ningún test de la escena lo
    // notaría, porque la escena seguiría dibujando igual.
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);

    for (const world of worlds) {
      const proxy = container.querySelector<HTMLElement>(
        `[data-system-body="${world.id}"]`,
      );
      expect(
        proxy,
        `falta data-system-body="${world.id}"`,
      ).not.toBeNull();
      expect(proxy).toHaveClass("system-map__hit-target");
      expect(proxy).toHaveAttribute("data-hitbox-proxy", world.id);
      expect(proxy).toHaveAttribute("aria-hidden", "true");
      expect(proxy).toHaveAttribute("tabindex", "-1");

      const slot = proxy?.closest<HTMLElement>(".system-map__slot");
      const scale = Number(slot?.style.getPropertyValue("--hitbox-scale"));
      const fallbackRadius = Number.parseFloat(
        slot?.style.getPropertyValue("--map-fallback-radius") ?? "0",
      );
      expect(scale).toBeGreaterThanOrEqual(1.1);
      expect(scale).toBeLessThanOrEqual(1.35);
      expect(fallbackRadius).toBeGreaterThanOrEqual(22);
      expect(slot?.style.getPropertyValue("--hitbox-min")).toBe("44px");
      expect(slot?.querySelector(".system-map__body")).not.toContainElement(
        proxy,
      );
    }

    const slots = container.querySelectorAll<HTMLElement>(".system-map__slot");
    expect(slots).toHaveLength(6);
    // Sin escena, la posición la trae el servidor en %. Conserva además un par
    // estable que el teardown de WebGL nunca toca: es lo que permite volver a
    // flat sin recargar ni amontonar los seis destinos en la esquina 0,0.
    for (const slot of slots) {
      expect(slot.style.getPropertyValue("--map-x")).toMatch(/%$/);
      expect(slot.style.getPropertyValue("--map-y")).toMatch(/%$/);
      expect(slot.style.getPropertyValue("--map-flat-x")).toBe(
        slot.style.getPropertyValue("--map-x"),
      );
      expect(slot.style.getPropertyValue("--map-flat-y")).toBe(
        slot.style.getPropertyValue("--map-y"),
      );
    }
  });

  /*
    Timeout propio, y no por lentitud del código.

    Este test monta el mapa entero y dispara cinco puntos por cada uno de los
    seis destinos: setenta pares de pointerEnter/pointerLeave con sus
    aserciones, cada una recorriendo el DOM. En una máquina ociosa tarda ~1 s,
    muy por debajo de los 5 s por defecto de Vitest. Pero es el test más caro del
    archivo, así que es el primero que se cae cuando la máquina está cargada
    —con la suite en paralelo, o con un build compitiendo por CPU— y ahí se
    convierte en un rojo intermitente que no dice nada sobre el código.

    Quince segundos no esconden una regresión de rendimiento: si este test
    llegara a tardar de verdad quince segundos, seguiría fallando.
  */
  it("todo el volumen conceptual —centro y cuatro bordes— adquiere target", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />);
    const samplePoints = [
      { clientX: 50, clientY: 50 },
      { clientX: 0, clientY: 50 },
      { clientX: 100, clientY: 50 },
      { clientX: 50, clientY: 0 },
      { clientX: 50, clientY: 100 },
    ];

    for (const world of worlds) {
      const proxy = container.querySelector<HTMLElement>(
        `[data-hitbox-proxy="${world.id}"]`,
      );
      expect(proxy).not.toBeNull();

      for (const point of samplePoints) {
        fireEvent.pointerEnter(proxy as HTMLElement, point);
        expect(proxy).toHaveAttribute("data-target-state", "target");
        expect(container.querySelector(".hud__target")).toHaveTextContent(
          world.cosmicName,
        );
        fireEvent.pointerLeave(proxy as HTMLElement, point);
        expect(proxy).toHaveAttribute("data-target-state", "idle");
      }
    }
  }, 15_000);

  it("Gargantúa es el nodo central del sistema", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const centres = container.querySelectorAll('[data-centre="true"]');
    expect(centres).toHaveLength(1);
    expect(centres[0].querySelector('[data-world="gargantua"]')).not.toBeNull();
  });

  it("hover despierta HUD, raíl y brackets sólo para el destino apuntado", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />);
    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const endurance = within(map).getByRole("link", {
      name: /^Proyectos Endurance$/i,
    });

    fireEvent.pointerEnter(endurance);

    expect(endurance).toHaveAttribute("data-target-state", "target");
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "target");
    expect(target).toHaveTextContent(/Target lock/i);
    // Sin numeración: el NAV TARGET dice a dónde vas y para qué sirve, no en qué
    // posición de una lista está. El orden narrativo vive en el DOM, no pintado.
    expect(target).not.toHaveTextContent(/\d\d/);
    expect(target).toHaveTextContent(/Endurance/i);
    expect(target).toHaveTextContent(/Proyectos/i);
    expect(target).toHaveTextContent(/\[ Enter \]/i);

    const slot = container
      .querySelector('[data-system-body="endurance"]')
      ?.closest(".system-map__slot");
    expect(slot).toHaveAttribute("data-target-state", "target");
    expect(slot?.querySelector(".system-map__target-brackets")).not.toBeNull();

    const activeRailItems = container.querySelectorAll(
      '.nav-rail__item[data-target-state="target"]',
    );
    expect(activeRailItems).toHaveLength(1);

    fireEvent.pointerLeave(endurance);
    expect(endurance).toHaveAttribute("data-target-state", "idle");
    expect(target).toHaveAttribute("data-target-state", "idle");
  });

  it("focus de teclado produce el mismo TARGET sin depender de glow", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />);
    const miller = screen.getByRole("link", {
      name: /^Formación Miller$/i,
    });

    fireEvent.focus(miller);

    expect(miller).toHaveAttribute("data-active", "true");
    expect(miller).toHaveAttribute("data-target-state", "target");
    expect(container.querySelector(".hud__target")).toHaveTextContent(
      /Miller/i,
    );
    expect(
      container.querySelector(
        '[data-system-body="miller"][data-target-state="target"]',
      ),
    ).not.toBeNull();

    fireEvent.blur(miller);
    expect(miller).not.toHaveAttribute("data-active");
    expect(miller).toHaveAttribute("data-target-state", "idle");
  });

  it("clic principal bloquea el destino y navega por la abstracción", () => {
    vi.useFakeTimers();
    const { container } = render(<SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />);
    const endurance = screen.getByRole("link", {
      name: /^Proyectos Endurance$/i,
    });

    fireEvent.click(endurance, { button: 0 });

    // El bloqueo es inmediato; la travesía arranca en modo reducido (sin
    // escena viva) y el router recibe la ruta en su pico, no antes.
    expect(endurance).toHaveAttribute("data-target-state", "locked");
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "locked");
    expect(target).toHaveTextContent(/Target locked/i);
    expect(target).not.toHaveTextContent(/\[ Enter \]/i);
    expect(document.documentElement.dataset.voyage).toBe("depart");
    expect(document.documentElement.dataset.voyageMode).toBe("short");
    expect(document.documentElement.dataset.voyageWorld).toBe("endurance");
    expect(routerPush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SHORT_PUSH_MS);
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/es/proyectos");
  });

  /*
    EL MODO SENCILLO, que es el que corre por defecto desde el 2026-09-21.

    Estos cuatro no duplican los de arriba: comprueban lo CONTRARIO. Lo que un
    modo enciende, el otro tiene que dejar apagado, y la única forma de que eso
    no se rompa en silencio es que las dos listas estén escritas. Ver
    `lib/map-hover.ts`.
  */
  it("sencillo · apuntar marca el slot y no enciende el panel de adquisición", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const map = screen.getByRole("navigation", { name: MAP_LABEL });
    const endurance = within(map).getByRole("link", {
      name: /^Proyectos Endurance$/i,
    });

    fireEvent.pointerEnter(endurance);

    const slot = container.querySelector('[data-map-world="endurance"]');
    const proxy = container.querySelector('[data-hitbox-proxy="endurance"]');
    expect(slot).toHaveAttribute("data-map-hover", "true");
    expect(proxy).toHaveAttribute("data-map-hover", "true");

    // Y nada de lo del otro modo: ni escuadras, ni HUD, ni raíl.
    expect(proxy).toHaveAttribute("data-target-state", "idle");
    expect(slot?.querySelector(".system-map__target-brackets")).toBeNull();
    const target = container.querySelector(".hud__target");
    expect(target).toHaveAttribute("data-target-state", "idle");
    expect(target).not.toHaveTextContent(/Target lock/i);
    expect(
      container.querySelector('.nav-rail__item[data-target-state="target"]'),
    ).toBeNull();

    fireEvent.pointerLeave(endurance);
    expect(slot).not.toHaveAttribute("data-map-hover");
  });

  it("sencillo · el foco de teclado responde igual que el puntero", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const miller = screen.getByRole("link", { name: /^Formación Miller$/i });

    fireEvent.focus(miller);
    expect(container.querySelector('[data-map-world="miller"]')).toHaveAttribute(
      "data-map-hover",
      "true",
    );
    expect(
      container.querySelector('.nav-rail__item[data-map-hover="true"]'),
    ).not.toBeNull();

    fireEvent.blur(miller);
    expect(
      container.querySelector('[data-map-world="miller"][data-map-hover]'),
    ).toBeNull();
  });

  it("sencillo · el clic sigue navegando aunque el bloqueo no se pinte", () => {
    vi.useFakeTimers();
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const endurance = screen.getByRole("link", {
      name: /^Proyectos Endurance$/i,
    });

    fireEvent.click(endurance, { button: 0 });

    /* El estado bloqueado se sigue escribiendo —la travesía lo necesita— y lo
       único que cambia es que nadie lo pinta. Si algún día se borra el estado
       en vez de dejar de pintarlo, esto cae. */
    expect(endurance).toHaveAttribute("data-target-state", "idle");
    expect(container.querySelector(".hud__target")).not.toHaveTextContent(
      /Target locked/i,
    );
    expect(document.documentElement.dataset.voyageWorld).toBe("endurance");

    vi.advanceTimersByTime(SHORT_PUSH_MS);
    expect(routerPush).toHaveBeenCalledWith("/es/proyectos");
  });

  it("el modo sencillo no añade ni un nodo al cuadro", () => {
    /*
      Es la regla del pase y por eso se prueba: la respuesta sencilla NO dibuja
      nada encima del cuerpo —ni escuadras ni aro, que fue el primer intento y
      el dueño lo rechazó—. Lo único que usa es el trazo que ya cuelga del
      rótulo, que está en el marcado en los dos modos.
    */
    const sencillo = render(<SystemMap worlds={worlds} languages={languages} />);
    expect(
      sencillo.container.querySelectorAll(".system-map__target-brackets"),
    ).toHaveLength(0);
    expect(
      sencillo.container.querySelectorAll(".system-map__label"),
    ).toHaveLength(worlds.length);
    sencillo.unmount();

    const instrumento = render(
      <SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />,
    );
    expect(
      instrumento.container.querySelectorAll(".system-map__target-brackets"),
    ).toHaveLength(worlds.length);
  });

  it("G9 · una tecla durante la travesía pide la ruta al instante", () => {
    vi.useFakeTimers();
    render(<SystemMap worlds={worlds} languages={languages} />);
    const miller = screen.getByRole("link", { name: /^Formación Miller$/i });

    fireEvent.click(miller, { button: 0 });
    expect(routerPush).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/es/formacion");
    expect(document.documentElement.dataset.voyageSkipped).toBe("true");
  });

  it("un clic modificado conserva el comportamiento nativo del enlace", () => {
    const { container } = render(<SystemMap worlds={worlds} languages={languages} />);
    const endurance = screen.getByRole("link", {
      name: /^Proyectos Endurance$/i,
    });

    // El listener de document corre después del handler React delegado: deja
    // que la implementación vea el Ctrl-clic intacto, pero evita que JSDOM
    // intente abrir otra página una vez comprobado el contrato.
    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(endurance, { button: 0, ctrlKey: true });

    expect(routerPush).not.toHaveBeenCalled();
    expect(endurance).toHaveAttribute("href", "/es/proyectos");
    expect(endurance).toHaveAttribute("data-target-state", "idle");
    expect(container.querySelector(".hud__target")).toHaveAttribute(
      "data-target-state",
      "idle",
    );
  });

  it("el proxy visual comparte lock y respeta clicks modificados", () => {
    vi.useFakeTimers();
    const { container } = render(<SystemMap worlds={worlds} languages={languages} hoverMode="instrumento" />);
    const millerProxy = container.querySelector<HTMLElement>(
      '[data-hitbox-proxy="miller"]',
    );
    expect(millerProxy).not.toBeNull();

    document.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(millerProxy as HTMLElement, { button: 0, metaKey: true });
    vi.advanceTimersByTime(SHORT_PUSH_MS);
    expect(routerPush).not.toHaveBeenCalled();
    expect(millerProxy).toHaveAttribute("data-target-state", "idle");
    expect(document.documentElement.dataset.voyage).toBeUndefined();

    fireEvent.click(millerProxy as HTMLElement, { button: 0 });
    vi.advanceTimersByTime(SHORT_PUSH_MS);
    expect(routerPush).toHaveBeenCalledWith("/es/formacion");
    expect(millerProxy).toHaveAttribute("data-target-state", "locked");
    expect(container.querySelector(".hud__target")).toHaveTextContent(
      /Target locked/i,
    );
  });
  it("«toca para explorar» sale una vez y se retira con el primer destino", () => {
    /*
      Primera valoración del dueño (2026-09-29): en un móvil no es evidente
      que los cuerpos se puedan tocar. La indicación es visual (aria-hidden:
      el raíl ya es el índice accesible), se va al apuntar cualquier destino y
      no vuelve en la siguiente visita.
    */
    localStorage.removeItem("jonas-orbit:explorar-visto");
    const first = render(<SystemMap worlds={worlds} languages={languages} />);
    const hint = first.container.querySelector(".system-map__explore");
    expect(hint).toHaveAttribute("aria-hidden", "true");
    expect(hint).toHaveTextContent(/Toca para explorar/i);
    expect(
      screen.getByRole("navigation", { name: MAP_LABEL }),
    ).toHaveAttribute("data-explore-hint", "true");

    fireEvent.focus(first.container.querySelector('[data-rail-world="miller"]')!);
    expect(first.container.querySelector(".system-map__explore")).toBeNull();
    expect(localStorage.getItem("jonas-orbit:explorar-visto")).toBe("1");
    first.unmount();

    const again = render(<SystemMap worlds={worlds} languages={languages} />);
    expect(again.container.querySelector(".system-map__explore")).toBeNull();
    localStorage.removeItem("jonas-orbit:explorar-visto");
  });
});
