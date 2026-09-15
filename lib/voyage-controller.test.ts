import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VOYAGE_FULL, VOYAGE_SHORT } from "./voyage";
import {
  cancelVoyage,
  markVoyageArrived,
  readVoyageDeparture,
  readVoyageState,
  startVoyage,
  subscribeVoyage,
} from "./voyage-controller";

/**
 * G9 y G10 de la matriz del pivote, sin GPU: la travesía se corta con
 * tecla/clic y respeta su tope duro, y la navegación se completa aunque la
 * animación no llegue a dibujarse. Todo va por temporizadores, así que aquí
 * se avanzan.
 */
const root = () => document.documentElement;
const ms = (seconds: number) => Math.round(seconds * 1000);

describe("travesía · controlador", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    navigate.mockClear();
    cancelVoyage();
  });

  afterEach(() => {
    cancelVoyage();
    vi.useRealTimers();
  });

  it("publica el despegue en <html> y pide la ruta exactamente en el pico", () => {
    expect(
      startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate }),
    ).toBe(true);

    expect(root().dataset.voyage).toBe("depart");
    expect(root().dataset.voyageMode).toBe("full");
    expect(root().dataset.voyageWorld).toBe("miller");
    expect(root().style.getPropertyValue("--voyage-tint")).toBe("#55d9ff");
    expect(root().style.getPropertyValue("--voyage-x")).toMatch(/%$/);
    expect(readVoyageDeparture()?.id).toBe("miller");
    expect(navigate).not.toHaveBeenCalled();

    // La luz se enciende un poco antes del pico…
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push - VOYAGE_FULL.flashLead));
    expect(root().dataset.voyage).toBe("flash");
    expect(navigate).not.toHaveBeenCalled();
    // …y la escena sigue viendo el despegue (mismo objeto) hasta el pico.
    const departure = readVoyageDeparture();
    expect(departure?.id).toBe("miller");

    vi.advanceTimersByTime(ms(VOYAGE_FULL.flashLead));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/es/formacion");
    expect(readVoyageState().status).toBe("pushed");
    expect(root().dataset.voyage).toBe("flash");
    // Pedida la ruta, la escena deja de viajar: la pose de la ruta manda.
    expect(readVoyageDeparture()).toBeNull();
  });

  it("G10 · la ruta llega aunque nadie dibuje un fotograma", () => {
    // No hay requestAnimationFrame en esta prueba, y no hace falta: el
    // temporizador es el tope duro.
    startVoyage({ id: "endurance", href: "/es/proyectos", mode: "full", navigate });
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    expect(navigate).toHaveBeenCalledWith("/es/proyectos");
  });

  it("G9 · una tecla corta la travesía y pide la ruta al instante", () => {
    startVoyage({ id: "ranger", href: "/es/contacto", mode: "full", navigate });
    vi.advanceTimersByTime(150);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(root().dataset.voyage).toBe("flash");
    expect(root().dataset.voyageSkipped).toBe("true");
    expect(readVoyageDeparture()).toBeNull();

    // El temporizador del pico ya no vuelve a pedirla.
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it.each(["pointerdown", "wheel", "touchstart"])(
    "G9 · un gesto (%s) también la corta",
    (type) => {
      startVoyage({ id: "edmunds", href: "/es/creatividad", mode: "full", navigate });
      vi.advanceTimersByTime(50);
      window.dispatchEvent(new Event(type));
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(root().dataset.voyageSkipped).toBe("true");
    },
  );

  it("después de pedir la ruta, teclas y gestos ya no hacen nada", () => {
    startVoyage({ id: "tesseract", href: "/es/experimentos", mode: "full", navigate });
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    expect(navigate).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    window.dispatchEvent(new Event("pointerdown"));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(root().dataset.voyageSkipped).toBeUndefined();
  });

  it("la llegada empieza cuando cambia la ruta y termina limpiando <html>", () => {
    startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate });
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);

    markVoyageArrived();
    expect(root().dataset.voyage).toBe("arrive");
    expect(root().dataset.voyageMode).toBe("full");

    vi.advanceTimersByTime(ms(VOYAGE_FULL.arrive) + 100);
    expect(readVoyageState().status).toBe("idle");
    expect(root().dataset.voyage).toBeUndefined();
    expect(root().dataset.voyageMode).toBeUndefined();
    expect(root().dataset.voyageWorld).toBeUndefined();
    expect(root().style.getPropertyValue("--voyage-x")).toBe("");
    expect(root().style.getPropertyValue("--voyage-tint")).toBe("");
  });

  it("si la página nueva no llega, la luz se retira sola (tope duro)", () => {
    startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate });
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    expect(root().dataset.voyage).toBe("flash");

    vi.advanceTimersByTime(ms(VOYAGE_FULL.arriveCap));
    expect(root().dataset.voyage).toBe("arrive");
    vi.advanceTimersByTime(ms(VOYAGE_FULL.arrive) + 100);
    expect(readVoyageState().status).toBe("idle");
  });

  it("un cambio de ruta ajeno durante el despegue termina la travesía sin navegar", () => {
    startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate });
    vi.advanceTimersByTime(300);
    // El visitante pulsó atrás, o un enlace de fuera del mapa.
    markVoyageArrived();
    expect(root().dataset.voyage).toBe("arrive");
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + ms(VOYAGE_FULL.arrive) + 100);
    expect(navigate).not.toHaveBeenCalled();
    expect(readVoyageState().status).toBe("idle");
  });

  it("la versión reducida pide la ruta en menos de medio segundo", () => {
    startVoyage({ id: "ranger", href: "/es/contacto", mode: "short", navigate });
    expect(root().dataset.voyageMode).toBe("short");
    vi.advanceTimersByTime(ms(VOYAGE_SHORT.push) - 1);
    expect(navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(navigate).toHaveBeenCalledWith("/es/contacto");
    expect(VOYAGE_SHORT.push).toBeLessThan(0.5);
  });

  it("un viaje en curso no se sustituye por otro", () => {
    const second = vi.fn();
    expect(
      startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate }),
    ).toBe(true);
    expect(
      startVoyage({ id: "ranger", href: "/es/contacto", mode: "full", navigate: second }),
    ).toBe(false);
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    expect(navigate).toHaveBeenCalledWith("/es/formacion");
    expect(second).not.toHaveBeenCalled();
  });

  it("avisa a sus suscriptores en cada cambio de estado y deja de avisar al darse de baja", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVoyage(listener);
    startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate });
    expect(listener).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    // flash + pushed
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    markVoyageArrived();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("cancelar limpia temporizadores, listeners y <html>", () => {
    startVoyage({ id: "miller", href: "/es/formacion", mode: "full", navigate });
    cancelVoyage();
    expect(root().dataset.voyage).toBeUndefined();
    expect(readVoyageState().status).toBe("idle");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    vi.advanceTimersByTime(ms(VOYAGE_FULL.push) + 1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("en reposo, avisar de una llegada no hace nada", () => {
    markVoyageArrived();
    expect(readVoyageState().status).toBe("idle");
    expect(root().dataset.voyage).toBeUndefined();
  });
});
