import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { EdmundsGallery } from "./edmunds-gallery";
import { EdmundsPage } from "./edmunds-page";

const world = getWorld("edmunds", "es");
const { artworks, collections } = world.prose.creativity!;
const caption = () => document.querySelector<HTMLElement>(".edmunds-gallery__caption")!;

describe("Edmunds · cubierta de observación", () => {
  it("conserva el significado, el hobby, la cabecera y los destinos narrativos", () => {
    render(<EdmundsPage world={world} locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Creatividad");
    expect(screen.getByText("Otra forma de mirar.")).toBeInTheDocument();
    expect(screen.getByText(/El código es una parte de mí/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Entrar en la galería/ })).toHaveAttribute("href", "#galeria");
    expect(screen.getByText(/también son mi hobby/)).toBeInTheDocument();
    const neighbours = screen.getByRole("navigation", { name: "Destinos contiguos" });
    expect(within(neighbours).getByRole("link", { name: /Endurance/ })).toHaveAttribute("href", "/es/proyectos");
    expect(within(neighbours).getByRole("link", { name: /Tesseracto/ })).toHaveAttribute("href", "/es/experimentos");
  });

  it("publica una selección única en siete sectores, Diseño primero, con medio y seis WebP por obra", () => {
    expect(artworks).toHaveLength(90);
    expect(collections).toHaveLength(7);
    expect(collections[0].id).toBe("disenos");
    expect(artworks.filter((art) => art.collection === "disenos")).toHaveLength(12);
    expect(Object.fromEntries(collections.map(({ id }) => [id, artworks.filter((art) => art.collection === id).length]))).toEqual({
      disenos: 12,
      horizontes: 25,
      cerca: 5,
      criaturas: 15,
      retratos: 8,
      invierno: 14,
      noche: 11,
    });
    expect(Object.fromEntries([
      "frente-al-horizonte",
      "de-pie-en-el-lago",
      "caminar-sin-prisa",
      "la-ultima-luz",
      "mirar-hacia-arriba",
      "suelo-de-pinar",
      "un-instante-en-el-aire",
      "encuentro-de-invierno",
      "desayuno-en-la-nieve",
    ].map((id) => [id, artworks.find((art) => art.id === id)?.collection]))).toEqual({
      "frente-al-horizonte": "horizontes",
      "de-pie-en-el-lago": "horizontes",
      "caminar-sin-prisa": "horizontes",
      "la-ultima-luz": "noche",
      "mirar-hacia-arriba": "horizontes",
      "suelo-de-pinar": "horizontes",
      "un-instante-en-el-aire": "criaturas",
      "encuentro-de-invierno": "criaturas",
      "desayuno-en-la-nieve": "criaturas",
    });
    expect(artworks.filter((art) => art.medium === "photo")).toHaveLength(78);
    const xTecno = artworks.find((art) => art.id === "diseno-x-tecno");
    expect(xTecno?.prototypeHref).toMatch(/^https:\/\/www\.figma\.com\/proto\//);
    expect(artworks.filter((art) => art.prototypeHref)).toHaveLength(1);
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
      expect(art.medium === "photo").toBe(art.source.startsWith("Fotos/"));
      for (const size of [320, 480, 640, 960, 1280, 1920]) {
        const path = join(process.cwd(), "public/art/edmunds", `${art.id}-${size}.webp`);
        expect(existsSync(path), art.id).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      }
    }
  });

  it("filtra por sector, recorre por teclado y muestra sólo sector, posición y título", () => {
    render(<EdmundsGallery artworks={artworks} collections={collections} />);
    expect(caption().querySelector("h2")).toHaveTextContent("Fantasía");
    expect(caption().querySelector("span")).toHaveTextContent("Diseño · 01 / 90");
    expect(caption().textContent).not.toContain("Fotomontaje");
    fireEvent.click(screen.getByRole("button", { name: "Diseño" }));
    expect(screen.getByRole("status")).toHaveTextContent("12 piezas");
    const stage = screen.getByRole("region", { name: "Galería de obras" });
    fireEvent.keyDown(stage, { key: "End" });
    expect(caption().querySelector("h2")).toHaveTextContent("Más allá");
    expect(caption().querySelector("span")).toHaveTextContent("Diseño · 12 / 12");
    fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
    expect(caption().querySelector("h2")).toHaveTextContent("Fantasía");
    fireEvent.click(screen.getByRole("button", { name: "Horizontes" }));
    expect(caption().querySelector("h2")).toHaveTextContent("Entre montañas");
    fireEvent.click(screen.getByRole("button", { name: "Todo" }));
    expect(screen.getByRole("status")).toHaveTextContent("90 piezas");
    // Page keys jump sector by sector and wrap around the archive.
    fireEvent.keyDown(stage, { key: "PageDown" });
    expect(caption().querySelector("h2")).toHaveTextContent("Entre montañas");
    fireEvent.keyDown(stage, { key: "PageUp" });
    fireEvent.keyDown(stage, { key: "PageUp" });
    expect(caption().querySelector("h2")).toHaveTextContent("Aurora");
  });

  it("pide a cada contexto más píxeles de los que pinta y anuncia los seis peldaños", () => {
    const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
    const active = container.querySelector<HTMLImageElement>('.edmunds-artwork[data-offset="0"] img')!;
    expect(active.srcset.split(",")).toHaveLength(6);
    expect(active.srcset).toContain("-1280.webp 1280w");
    // The deck's sizes mirror the stylesheet: aspect ratio × art height, capped,
    // times the oversampling factor; the mosaic derives its own from the height
    // of a justified row, which is the width left over divided by the aspect
    // ratios the row carries.
    expect(active.sizes).toContain("calc(1.5 * min(");
    expect(active.sizes).toContain("clamp(260px, 56vh, 620px)");
    expect(active.sizes).toContain("(max-width: 700px)");
    fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
    const tile = container.querySelector<HTMLImageElement>(".edmunds-artwork img")!;
    expect(tile.sizes).toContain("/ 4.4)");
    expect(tile.sizes).toContain("(max-width: 480px)");
    expect(tile.sizes).toContain("(max-width: 700px)");
  });

  it("mueve el anillo como un solo número y funde la luz ambiente sin apagarla", () => {
    const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
    const stage = container.querySelector<HTMLElement>(".edmunds-stage")!;
    fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
    expect(caption().querySelector("h2")).toHaveTextContent("Hoy se come");
    // After a step the stage has been told to ease `--drag` back to rest.
    expect(stage.style.getPropertyValue("--drag")).toBe("0");
    expect(stage.dataset.dragging).toBe("false");
    // Two ambient lights coexist until the newer one finishes fading in. They
    // are blurred 28–46 px at 30 % opacity: the smallest rung is plenty.
    const lights = () => container.querySelectorAll(".edmunds-deck__ambient");
    expect(lights()).toHaveLength(2);
    expect(lights()[1]).toHaveClass("edmunds-deck__ambient--in");
    expect(lights()[0]).toHaveAttribute("src", "/art/edmunds/diseno-fantasia-320.webp");
    expect(lights()[1]).toHaveAttribute("src", "/art/edmunds/diseno-hot-summer-320.webp");
    // The older light leaves when the fade ends; jsdom has no AnimationEvent, so
    // React never hears `animationend` here — the E2E suite covers the removal.
    // The sky carries stars and two aurora curtains, all decorative.
    expect(container.querySelectorAll(".edmunds-deck__aurora")).toHaveLength(2);
    expect(container.querySelector(".edmunds-deck__sky")).toHaveAttribute("aria-hidden", "true");
  });

  it("en la cubierta una obra lateral se centra antes de abrirse", () => {
    // jsdom knows <dialog> but not its modal API; the native call is stubbed
    // so the open/close contract can still be asserted.
    const proto = HTMLDialogElement.prototype;
    const original = { showModal: proto.showModal, close: proto.close };
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
    proto.showModal = showModal;
    proto.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
    try {
      render(<EdmundsGallery artworks={artworks} collections={collections} />);
      fireEvent.click(screen.getByRole("link", { name: "Ampliar: Hoy se come" }));
      expect(caption().querySelector("h2")).toHaveTextContent("Hoy se come");
      expect(showModal).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Ampliar: Hoy se come" })).toHaveAttribute("aria-current", "true");
      fireEvent.click(screen.getByRole("link", { name: "Ampliar: Hoy se come" }));
      expect(showModal).toHaveBeenCalledTimes(1);
      const dialog = screen.getByRole("dialog", { name: "Visor de obras" });
      expect(dialog).toHaveTextContent("Hoy se come");
      expect(dialog).not.toHaveTextContent("letras de neón");
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
      fireEvent.click(screen.getByRole("button", { name: "Invierno" }));
      expect(screen.getByRole("status")).toHaveTextContent("14 piezas");
      expect(caption().querySelector("h2")).toHaveTextContent("Túnel de hielo");
    } finally {
      proto.showModal = original.showModal;
      proto.close = original.close;
    }
  });

  it("ofrece el proyecto de X Tecno fuera de la captura y dentro del visor", () => {
    const proto = HTMLDialogElement.prototype;
    const original = { showModal: proto.showModal, close: proto.close };
    proto.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
    proto.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
    try {
      render(<EdmundsGallery artworks={artworks} collections={collections} />);

      fireEvent.click(screen.getByRole("button", { name: "Diseño" }));
      for (let index = 0; index < 6; index += 1) {
        fireEvent.click(screen.getByRole("button", { name: "Obra siguiente" }));
      }
      expect(caption().querySelector("h2")).toHaveTextContent("X Tecno");
      expect(within(caption()).getByRole("link", { name: /Ver proyecto en Figma/ })).toHaveAttribute(
        "href",
        expect.stringMatching(/^https:\/\/www\.figma\.com\/proto\//),
      );

      fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
      const card = screen.getByRole("link", { name: "Ampliar: X Tecno" });
      const figure = card.closest<HTMLElement>("figure");
      expect(figure).not.toBeNull();
      expect(within(figure!).getByRole("link", { name: /Ver proyecto en Figma/ })).toHaveAttribute(
        "href",
        expect.stringMatching(/^https:\/\/www\.figma\.com\/proto\//),
      );
      fireEvent.click(card);
      const dialog = screen.getByRole("dialog", { name: "Visor de obras" });
      expect(within(dialog).getByRole("link", { name: /Ver proyecto en Figma/ })).toHaveAttribute(
        "href",
        expect.stringMatching(/^https:\/\/www\.figma\.com\/proto\//),
      );
      expect(within(dialog).queryByRole("link", { name: /Abrir imagen/ })).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    } finally {
      proto.showModal = original.showModal;
      proto.close = original.close;
    }
  });

  it("modo cine: los controles se atenúan tras unos segundos quietos y vuelven con cualquier entrada", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
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

  it("el mosaico agrupa por sector con una etiqueta mínima y sin descripciones", () => {
    render(<EdmundsGallery artworks={artworks} collections={collections} />);
    fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
    const groups = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(groups).toEqual(["Diseño", "Horizontes", "De cerca", "Criaturas", "Retratos", "Invierno", "Después del sol"]);
    expect(screen.getAllByRole("link", { name: /^Ampliar:/ })).toHaveLength(90);
    expect(screen.queryByText(/Ejercicios personales/)).not.toBeInTheDocument();
    expect(screen.queryByText("Un valle de roca y nieve vieja bajo un techo de nubes bajas.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("el mosaico corta cada sector en filas y ningún corte queda suelto", () => {
    const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
    fireEvent.click(screen.getByRole("button", { name: "Mosaico" }));
    const lists = [...container.querySelectorAll(".edmunds-gallery[data-view='grid'] .edmunds-artworks")];
    expect(lists).toHaveLength(7);
    let cuts = 0;
    for (const list of lists) {
      const children = [...list.children];
      const isCut = (node: Element | undefined) => node?.classList.contains("edmunds-mosaic-cut") ?? false;
      // Un corte al principio, al final o pegado a otro sería una fila vacía.
      expect(isCut(children[0])).toBe(false);
      expect(isCut(children[children.length - 1])).toBe(false);
      children.forEach((node, index) => {
        if (!isCut(node)) return;
        cuts += 1;
        expect(isCut(children[index + 1])).toBe(false);
        expect(node.getAttribute("data-at")?.split(" ").every((band) => ["xl", "lg", "md", "sm", "xs"].includes(band))).toBe(true);
      });
    }
    expect(cuts).toBeGreaterThan(lists.length);
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

  it("A16: con el movimiento apagado empieza en mosaico y permite elegir profundidad sin animación", () => {
    // El interruptor único de movimiento, apagado por el visitante (misma clave que el perfil ligero).
    window.localStorage.setItem("jonas-orbit:reducir-efectos", "true");
    try {
      const { container } = render(<EdmundsGallery artworks={artworks} collections={collections} />);
      expect(screen.getByRole("button", { name: "Mosaico" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Galería 3D" }));
      expect(screen.getByRole("button", { name: "Galería 3D" })).toHaveAttribute("aria-pressed", "true");
      expect(container.querySelector(".edmunds-gallery")).toHaveAttribute("data-reduced", "true");
    } finally { window.localStorage.removeItem("jonas-orbit:reducir-efectos"); }
  });
});
