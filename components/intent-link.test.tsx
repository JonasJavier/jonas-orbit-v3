import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntentLink } from "./intent-link";

describe("IntentLink — precarga por intención", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useRouter().prefetch).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("pasar por encima de camino a otro sitio no precarga", () => {
    // El cursor que cruza Gargantúa hacia otro planeta pedía Sobre mí con
    // ~390 KB de fotos que le quitaban red al destino pulsado (2026-10-07).
    render(<IntentLink href="/es/sobre-mi">Sobre mí</IntentLink>);
    fireEvent.pointerEnter(screen.getByRole("link"));
    act(() => vi.advanceTimersByTime(500));
    expect(useRouter().prefetch).not.toHaveBeenCalled();
  });

  it("quedarse en el enlace sí precarga", () => {
    render(<IntentLink href="/es/contacto">Contacto</IntentLink>);
    const link = screen.getByRole("link");
    act(() => link.focus());
    expect(useRouter().prefetch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(useRouter().prefetch).toHaveBeenCalledWith("/es/contacto");
  });

  it("no añade texto ni caja al enlace", () => {
    render(<IntentLink href="/es/formacion">Formación</IntentLink>);
    expect(screen.getByRole("link")).toHaveTextContent(/^Formación$/);
    expect(screen.getByRole("link").childElementCount).toBe(0);
  });
});
