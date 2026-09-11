import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { EdmundsGallery } from "./edmunds-gallery";
import { EdmundsPage } from "./edmunds-page";

const world = getWorld("edmunds", "es");
const { artworks, collections, heroLine } = world.prose.creativity!;
const galleryProps = { artworks, collections, heroLine, title: "Creatividad", intro: world.prose.introduction };
const caption = () => document.querySelector(".edmunds-gallery__caption")!;

describe("Edmunds · cubierta de observación", () => {
  it("conserva el significado, el hobby y los destinos narrativos", () => {
    render(<EdmundsPage world={world} locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Creatividad");
    expect(screen.getByText(/también son mi hobby/)).toBeInTheDocument();
    const neighbours = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(neighbours).getByRole("link", { name: /Endurance/ })).toHaveAttribute("href", "/es/proyectos");
    expect(within(neighbours).getByRole("link", { name: /Tesseracto/ })).toHaveAttribute("href", "/es/experimentos");
  });

  it("publica una selección única en siete sectores, Diseño primero, con leyenda, medio y tres WebP por obra", () => {
    expect(artworks).toHaveLength(90);
    expect(collections).toHaveLength(7);
    expect(collections[0].id).toBe("disenos");
    expect(artworks.filter((art) => art.collection === "disenos")).toHaveLength(12);
    expect(artworks.filter((art) => art.medium === "photo")).toHaveLength(78);
    expect(new Set(artworks.map((art) => art.id)).size).toBe(artworks.length);
    expect(new Set(artworks.map((art) => art.source)).size).toBe(artworks.length);
    // The archive is ordered sector by sector so the deck reads as one journey;
    // it opens on an original piece and keeps the homage for the end of Diseño.
    const order = artworks.map((art) => collections.findIndex((collection) => collection.id === art.collection));
    expect([...order]).toEqual([...order].sort((a, b) => a - b));
    expect(artworks[0].id).toBe("diseno-fantasia");
    expect(artworks.filter((art) => art.collection === "disenos").at(-1)?.id).toBe("diseno-mas-alla");
    for (const art of artworks) {
      expect(collections.some((collection) => collection.id === art.collection), art.id).toBe(true);
      expect(art.alt.length).toBeGreaterThan(20);
      expect(art.caption.length).toBeGreaterThan(12);
      expect(art.medium === "photo").toBe(art.source.startsWith("Fotos/"));
      for (const size of [480, 960, 1920]) {
        const path = join(process.cwd(), "public/art/edmunds", `${art.id}-${size}.webp`);
        expect(existsSync(path), art.id).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      }
    }
  });

  it("filtra por sector, recorre por teclado y publica registro, sector y medio", () => {
    render(<EdmundsGallery {...galleryProps} />);
    expect(caption().querySelector("h2")).toHaveTextContent("Fantasía");
    expect(caption().querySelector("span")).toHaveTextContent("01.01 · Diseño · Fotomontaje");
    fireEvent.click(screen.getByRole("button", { name: "Diseño 12" }));
    expect(screen.getByRole("status")).toHaveTextContent("12 piezas");
    const stage = screen.getByRole("region", { name: "Galería de obras" });
    fireEvent.keyDown(stage, { key: "End" });
    expect(caption().querySelector("h2")).toHaveTextContent("Más allá");
    expect(caption().querySelector("span")).toHaveTextContent("01.12 · Diseño · Cartel");
    fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
    expect(caption().querySelector("h2")).toHaveTextContent("Fantasía");
    fireEvent.click(screen.getByRole("button", { name: "Horizontes 21" }));
    expect(caption().querySelector("h2")).toHaveTextContent("Entre montañas");
    expect(caption().querySelector("span")).toHaveTextContent("02.01 · Horizontes · Fotografía");
    fireEvent.click(screen.getByRole("button", { name: "Todo 90" }));
    expect(screen.getByRole("status")).toHaveTextContent("90 piezas");
    // Page keys jump sector by sector and wrap around the archive.
    fireEvent.keyDown(stage, { key: "PageDown" });
    expect(caption().querySelector("h2")).toHaveTextContent("Entre montañas");
    fireEvent.keyDown(stage, { key: "PageUp" });
    fireEvent.keyDown(stage, { key: "PageUp" });
    expect(caption().querySelector("h2")).toHaveTextContent("Aurora");
  });

  it("en la cubierta una obra lateral se centra antes de abrirse y la bitácora filtra por sector", () => {
    // jsdom knows <dialog> but not its modal API; the native call is stubbed
    // so the open/close contract can still be asserted.
    const proto = HTMLDialogElement.prototype;
    const original = { showModal: proto.showModal, close: proto.close };
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
    proto.showModal = showModal;
    proto.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
    try {
      render(<EdmundsGallery {...galleryProps} />);
      fireEvent.click(screen.getByRole("link", { name: "Ampliar: Hoy se come" }));
      expect(caption().querySelector("h2")).toHaveTextContent("Hoy se come");
      expect(showModal).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Ampliar: Hoy se come" })).toHaveAttribute("aria-current", "true");
      fireEvent.click(screen.getByRole("link", { name: "Ampliar: Hoy se come" }));
      expect(showModal).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "Visor de obras" })).toHaveTextContent("Hoy se come");
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      const sectors = screen.getByRole("navigation", { name: "Sectores del archivo" });
      fireEvent.click(within(sectors).getByRole("button", { name: /Invierno/ }));
      expect(screen.getByRole("status")).toHaveTextContent("16 piezas");
      expect(caption().querySelector("h2")).toHaveTextContent("Túnel de hielo");
      expect(screen.getByRole("button", { name: "Invierno 16" })).toHaveAttribute("aria-pressed", "true");
    } finally {
      proto.showModal = original.showModal;
      proto.close = original.close;
    }
  });

  it("modo cine: la instrumentación se atenúa tras unos segundos quietos y vuelve con cualquier entrada", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<EdmundsGallery {...galleryProps} />);
      const gallery = container.querySelector(".edmunds-gallery")!;
      expect(gallery).toHaveAttribute("data-idle", "false");
      act(() => { vi.advanceTimersByTime(4000); });
      expect(gallery).toHaveAttribute("data-idle", "true");
      fireEvent.pointerMove(gallery);
      expect(gallery).toHaveAttribute("data-idle", "false");
      // Changing work restarts the countdown; the mosaic never dims.
      fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
      act(() => { vi.advanceTimersByTime(4000); });
      expect(gallery).toHaveAttribute("data-idle", "true");
      fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
      act(() => { vi.advanceTimersByTime(4000); });
      expect(gallery).toHaveAttribute("data-idle", "false");
    } finally { vi.useRealTimers(); }
  });

  it("el mosaico agrupa por sector y muestra leyenda y medio de cada obra", () => {
    render(<EdmundsGallery {...galleryProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
    const groups = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(groups).toEqual(["Diseño", "Horizontes", "De cerca", "Criaturas", "Retratos", "Invierno", "Después del sol", "Siete sectores, una misma curiosidad."]);
    expect(screen.getAllByRole("link", { name: /^Ampliar:/ })).toHaveLength(90);
    expect(screen.getByText("Un valle de roca y nieve vieja bajo un techo de nubes bajas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("A14: admite un archivo vacío", () => {
    render(<EdmundsGallery {...galleryProps} artworks={[]} />);
    expect(screen.getByText(/Todavía no hay piezas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ampliar" })).not.toBeInTheDocument();
  });

  it("A14: una sola obra sigue siendo accesible y no ofrece avance", () => {
    render(<EdmundsGallery {...galleryProps} artworks={[artworks[0]]} />);
    expect(screen.getByRole("link", { name: `Ampliar: ${artworks[0].title}` })).toHaveAttribute("href", `/art/edmunds/${artworks[0].id}-1920.webp`);
    expect(screen.getByRole("button", { name: "Obra anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Obra siguiente" })).toBeDisabled();
  });

  it("A14: una imagen fallida conserva el enlace y el texto", () => {
    render(<EdmundsGallery {...galleryProps} artworks={[artworks[0]]} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("La imagen no se ha podido cargar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Ampliar: ${artworks[0].title}` })).toBeInTheDocument();
  });

  it("A16: reduced-motion empieza en mosaico y permite elegir profundidad sin animación", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    try {
      const { container } = render(<EdmundsGallery {...galleryProps} />);
      expect(screen.getByRole("button", { name: "Mosaico" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Galería 3D" }));
      expect(screen.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "true");
      expect(container.querySelector(".edmunds-gallery")).toHaveAttribute("data-reduced", "true");
    } finally { vi.unstubAllGlobals(); }
  });
});
