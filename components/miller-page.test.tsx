import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorld } from "@/lib/worlds";
import { MillerCertificates } from "./miller-certificates";
import { MillerPage } from "./miller-page";
import { MillerWater } from "./miller-water";

const world = getWorld("miller", "es");
const certificates = world.prose.education!.certificates;

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Miller · formación documentada", () => {
  it("conserva el contenido real y distingue ITLA de una titulación", () => {
    render(<MillerPage world={world} locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Formación");
    expect(screen.getByText(/Cursé ocho meses/)).toHaveTextContent("sin titulación ni certificación");
    expect(screen.getByText(/Educación secundaria completada/)).toHaveTextContent("2018–2022");
    expect(screen.getByRole("navigation", { name: "Destinos contiguos" })).toHaveTextContent("Sobre mí");
    expect(certificates.some((certificate) => /ITLA|MINERD/.test(certificate.issuer))).toBe(false);
  });

  it("presenta la formación en curso como en marcha, sin documentos ni fechas de cierre", () => {
    render(<MillerPage world={world} locale="es" />);
    const list = screen.getByRole("list", { name: "Aprendizaje en curso" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(list).getAllByText("En curso")).toHaveLength(3);
    expect(within(list).queryAllByRole("link")).toHaveLength(0);
    expect(within(list).getByRole("heading", { level: 4, name: /Inteligencia Artificial/ })).toBeInTheDocument();
    expect(within(list).getByText("Harvard University · CS50 AI")).toBeInTheDocument();
    expect(within(list).getByText("Conquer Languages")).toBeInTheDocument();
    expect(within(list).getByRole("heading", { level: 4, name: "Francés" })).toBeInTheDocument();
    const inProgress = world.prose.education!.inProgress!;
    expect(new Set(inProgress.map((course) => course.id)).size).toBe(3);
    expect(inProgress.some((course) => certificates.some((certificate) => certificate.id === course.id))).toBe(false);
    expect(inProgress.some((course) => /completad|terminad|finalizad/i.test(course.detail))).toBe(false);
  });

  it("ofrece el CV en español e inglés y cierra el selector con Escape", () => {
    const { container } = render(<MillerPage world={world} locale="es" />);
    const details = container.querySelector<HTMLDetailsElement>(".miller-cv")!;
    const summary = details.querySelector("summary")!;
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    const links = within(details).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.hasAttribute("download")])).toEqual([
      ["EspañolPDF · ES", "/cv/jonas-javier-cv-es.pdf", true],
      ["EnglishPDF · EN", "/cv/jonas-javier-cv-en-ats.pdf", true],
    ]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("publica 23 documentos únicos y sus recursos existen", () => {
    expect(certificates).toHaveLength(23);
    expect(certificates.filter((certificate) => certificate.kind === "course")).toHaveLength(15);
    expect(certificates.filter((certificate) => certificate.kind === "role")).toHaveLength(5);
    expect(new Set(certificates.map((certificate) => certificate.href)).size).toBe(23);
    for (const certificate of certificates) {
      const pdf = readFileSync(join(process.cwd(), "public", certificate.href));
      expect(pdf.subarray(0, 5).toString(), certificate.title).toBe("%PDF-");
      expect(certificate.preview, certificate.title).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", certificate.preview))).toBe(true);
    }
  });

  it("filtra por área, anuncia el total y permite volver al archivo completo", () => {
    const { container } = render(<MillerWater><MillerCertificates certificates={certificates} /></MillerWater>);
    expect(container.querySelectorAll('a[href$=".pdf"]')).toHaveLength(23);
    expect(container.querySelectorAll('details:not([open]) .miller-certificate')).toHaveLength(17);
    expect(container.querySelectorAll('.miller-archive > .miller-certificates .miller-certificate')).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Diseño y UX" }));
    expect(screen.getByText("6 documentos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver certificado: UX Designer/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver certificado: CS50x/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Código" }));
    expect(screen.getByText("4 documentos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todo" }));
    expect(container.querySelectorAll('a[href$=".pdf"]')).toHaveLength(23);
    expect(screen.getByText("23 documentos")).toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});
