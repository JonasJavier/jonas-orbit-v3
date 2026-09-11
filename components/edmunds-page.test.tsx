import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { EdmundsGallery } from "./edmunds-gallery";
import { EdmundsPage } from "./edmunds-page";

const world = getWorld("edmunds", "es");
const { artworks, collections } = world.prose.creativity!;

describe("Edmunds · archivo personal", () => {
  it("conserva el significado, el hobby y los destinos narrativos", () => {
    render(<EdmundsPage world={world} locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Creatividad");
    expect(screen.getByText(/también son mi hobby/)).toBeInTheDocument();
    const neighbours = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(neighbours).getByRole("link", { name: /Endurance/ })).toHaveAttribute("href", "/es/proyectos");
    expect(within(neighbours).getByRole("link", { name: /Tesseracto/ })).toHaveAttribute("href", "/es/experimentos");
  });

  it("publica una selección única con temas válidos y tres WebP por obra", () => {
    expect(artworks).toHaveLength(60);
    expect(artworks.filter((art) => art.collection === "disenos")).toHaveLength(12);
    expect(new Set(artworks.map((art) => art.id)).size).toBe(artworks.length);
    expect(new Set(artworks.map((art) => art.source)).size).toBe(artworks.length);
    for (const art of artworks) {
      expect(collections.some((collection) => collection.id === art.collection), art.id).toBe(true);
      expect(art.alt.length).toBeGreaterThan(20);
      for (const size of [480, 960, 1920]) {
        const path = join(process.cwd(), "public/art/edmunds", `${art.id}-${size}.webp`);
        expect(existsSync(path), art.id).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      }
    }
  });

  it("filtra, recorre por teclado y vuelve al catálogo sin índices obsoletos", () => {
    render(<EdmundsGallery artworks={artworks} collections={collections} />);
    fireEvent.click(screen.getByRole("button", { name: "Diseño y composición" }));
    expect(screen.getByRole("status")).toHaveTextContent("12 piezas");
    fireEvent.keyDown(screen.getByRole("region", { name: "Galería de obras" }), { key: "End" });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("X Tecno");
    fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Más allá");
    fireEvent.click(screen.getByRole("button", { name: "Horizontes" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Entre montañas");
    fireEvent.click(screen.getByRole("button", { name: "Todo 60" }));
    expect(screen.getByRole("status")).toHaveTextContent("60 piezas");
  });

  it("A14: admite un archivo vacío", () => {
    render(<EdmundsGallery artworks={[]} collections={collections} />);
    expect(screen.getByText(/Todavía no hay piezas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ampliar" })).not.toBeInTheDocument();
  });

  it("A14: una sola obra sigue siendo accesible y no ofrece avance", () => {
    render(<EdmundsGallery artworks={[artworks[0]]} collections={collections} />);
    expect(screen.getByRole("link", { name: `Ampliar: ${artworks[0].title}` })).toHaveAttribute("href", `/art/edmunds/${artworks[0].id}-1920.webp`);
    expect(screen.getByRole("button", { name: "Obra anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Obra siguiente" })).toBeDisabled();
  });

  it("A14: una imagen fallida conserva el enlace y el texto", () => {
    render(<EdmundsGallery artworks={[artworks[0]]} collections={collections} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("La imagen no se ha podido cargar.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Ampliar: ${artworks[0].title}` })).toBeInTheDocument();
  });

  it("A16: reduced-motion empieza en mosaico y permite elegir profundidad sin animación", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    try {
      const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
      expect(screen.getByRole("button", { name: "Mosaico" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Galería 3D" }));
      expect(screen.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "true");
      expect(container.querySelector(".edmunds-gallery")).toHaveAttribute("data-reduced", "true");
    } finally { vi.unstubAllGlobals(); }
  });
});
