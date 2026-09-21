import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getWorldNavItems } from "@/lib/worlds";
import { FlatWorldBody } from "./flat-world-body";

const worlds = getWorldNavItems("es");

describe("FlatWorldBody", () => {
  /*
    LOS SEIS, y Gargantúa es la que cambió.

    Este test decía «los cinco periféricos, y Gargantúa al backdrop», y era
    correcto mientras el único consumidor era el atlas plano del System Map: allí
    su figura la pinta `SiteBackdrop` a pantalla completa y dibujarla otra vez en
    su slot habría puesto dos agujeros negros en el cuadro.

    Lo que cambió no es esa regla, es de quién es. Al montar Gargantúa en el
    Observatorio apareció un segundo consumidor —la cara servida del laboratorio
    usa esta misma figura como esquema del espécimen— y ahí no hay backdrop que
    la pinte: sin dibujo, la ruta salía sin cuerpo justo para quien no tiene
    JavaScript ni equipo, que es a quien O7 y O8 protegen.

    Así que el dibujo existe y la exclusión se mudó a `system-map.tsx`, que es
    donde está el motivo. Una regla sostenida por un hueco en otro archivo no es
    una regla: es una coincidencia que aguanta hasta el siguiente consumidor.
  */
  it("dibuja los seis destinos, incluida Gargantúa", () => {
    for (const world of worlds) {
      const { container, unmount } = render(<FlatWorldBody world={world} />);
      const body = container.querySelector(`[data-flat-world="${world.id}"]`);

      expect(body, world.id).not.toBeNull();
      expect(body).toHaveAttribute("aria-hidden", "true");
      expect(body?.querySelector("svg")).not.toBeNull();
      expect(body).toHaveStyle({
        "--flat-accent": world.accent,
        "--flat-secondary": world.secondary,
      });

      unmount();
    }
  });

  /*
    Y el agujero negro dibuja lo que es cierto sin integrar nada.

    No es una miniatura del raymarch: sin integrador no hay arcos lensados ni
    anillo de fotones, y fingirlos con elipses sería el dato inventado que este
    proyecto persigue. Lo que sí se puede afirmar son las proporciones, y de ahí
    sale la única comprobación que tiene sentido aquí: **la sombra tiene que ser
    mucho más pequeña que el disco**, porque 2.6 rs contra 17 lo son. Un dibujo
    que las pintara parecidas estaría contando otro objeto.
  */
  it("el agujero negro respeta la proporción entre sombra y disco", () => {
    const gargantua = worlds.find((world) => world.id === "gargantua");
    expect(gargantua).toBeDefined();
    const { container } = render(
      <FlatWorldBody world={gargantua as NonNullable<typeof gargantua>} />,
    );

    const shadow = container.querySelector('[data-flat-part="shadow"]')!;
    const rings = [
      ...container.querySelectorAll('[data-flat-part="disk"] ellipse'),
    ];
    expect(rings.length).toBeGreaterThan(1);

    const shadowRadius = Number(shadow.getAttribute("r"));
    const outer = Math.max(
      ...rings.map((ring) => Number(ring.getAttribute("rx"))),
    );
    // 17 rs contra 2.6: el disco mide seis veces y media la sombra, como poco.
    expect(outer / shadowRadius).toBeGreaterThan(5);
  });

  it("mantiene la arquitectura legible de Endurance en el frame estático", () => {
    const endurance = worlds.find((world) => world.id === "endurance");
    expect(endurance).toBeDefined();

    const { container } = render(
      <FlatWorldBody world={endurance as NonNullable<typeof endurance>} />,
    );

    /*
      La misma arquitectura que el modelo 3D, y por el mismo motivo que allí:
      dos brazos, doce módulos y paneles térmicos integrados. En un equipo con movimiento reducido este
      dibujo es la ÚNICA Endurance que se ve; si divergiera del modelo, el
      mismo destino contaría dos cosas distintas según el equipo del visitante.
    */
    expect(container.querySelectorAll('[data-flat-part="module"]')).toHaveLength(
      12,
    );
    expect(
      container.querySelectorAll('[data-flat-module="primary"]'),
    ).toHaveLength(4);
    expect(container.querySelectorAll('[data-flat-part="arm"]')).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-flat-part="thermal-panel"]'),
    ).toHaveLength(8);
    expect(container.querySelectorAll('[data-flat-module="cargo"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-flat-module="habitat"]')).toHaveLength(4);
    expect(container.querySelector('[data-flat-part="radiator"]')).toBeNull();
    expect(container.querySelector('[data-flat-part="docking-cavity"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-flat-part="docked-craft"]')).toHaveLength(2);
    expect(container.querySelector('[data-flat-part="engine-bank"]')).not.toBeNull();
  });

  it("dibuja la Ranger con proa, cabina y toberas, no una mancha", () => {
    const ranger = worlds.find((world) => world.id === "ranger");
    expect(ranger).toBeDefined();

    const { container } = render(
      <FlatWorldBody world={ranger as NonNullable<typeof ranger>} />,
    );

    // Las cuatro piezas que la hacen reconocible como nave y no como icono.
    for (const part of ["fuselage", "cockpit", "wing", "engines"]) {
      expect(
        container.querySelector(`[data-flat-part="${part}"]`),
        part,
      ).not.toBeNull();
    }
  });

  it("representa las 32 aristas del cristal sin animación ni corredor", () => {
    const tesseract = worlds.find((world) => world.id === "tesseract")!;
    const { container } = render(<FlatWorldBody world={tesseract} />);
    /*
      La misma topología del modelo 3D: treinta y dos aristas, seis membranas y
      el arranque del trazo. En un equipo con movimiento reducido este dibujo es
      el ÚNICO Tesseracto que se ve; si enseñara el corredor de marcos, el mismo
      destino contaría dos cosas distintas según el perfil.
    */
    expect(container.querySelectorAll('[data-flat-part="crystal-edge"]')).toHaveLength(32);
    expect(container.querySelectorAll('[data-flat-part="crystal-facet"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-flat-part="drawing-light"]').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-flat-part="outer-frame"]')).toBeNull();
    // Congelado de verdad: el perfil plano no anima ni ejecuta nada.
    expect(container.querySelector("animate, animateTransform, script")).toBeNull();
  });

  it("es puramente decorativo y no introduce movimiento ni copy duplicado", () => {
    const { container } = render(
      <>
        {worlds.map((world) => (
          <FlatWorldBody key={world.id} world={world} />
        ))}
      </>,
    );

    expect(container.querySelector("animate, animateMotion, animateTransform")).toBeNull();
    expect(container.querySelectorAll("a, button")).toHaveLength(0);
    expect(container).toHaveTextContent("");
  });
});
