import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getWorld } from "@/lib/worlds";
import { MillerCertificates } from "./miller-certificates";
import { MillerPage } from "./miller-page";

const world = getWorld("miller", "es");
const certificates = world.prose.education!.certificates;

describe("Miller · formación documentada", () => {
  it("conserva el contenido real y distingue ITLA de una titulación", () => {
    render(<MillerPage world={world} locale="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Formación");
    expect(screen.getByText(/Cursé ocho meses/)).toHaveTextContent("sin titulación ni certificación");
    expect(screen.getByText(/Educación secundaria completada/)).toHaveTextContent("2021–2022");
    expect(screen.getByRole("navigation", { name: "Destinos contiguos" })).toHaveTextContent("Sobre mí");
    expect(certificates.some((certificate) => /ITLA|MINERD/.test(certificate.issuer))).toBe(false);
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
    const { container } = render(<MillerCertificates certificates={certificates} />);
    expect(container.querySelectorAll('a[href$=".pdf"]')).toHaveLength(23);
    expect(screen.getAllByRole("img", { name: /Vista previa de/ })).toHaveLength(23);
    fireEvent.click(screen.getByRole("button", { name: "Diseño y UX" }));
    expect(screen.getByText("6 documentos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver certificado: UX Designer/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver certificado: CS50x/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Código" }));
    expect(screen.getByText("4 documentos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todo" }));
    expect(container.querySelectorAll('a[href$=".pdf"]')).toHaveLength(23);
    expect(screen.getByText("23 documentos")).toBeInTheDocument();
  });
});
