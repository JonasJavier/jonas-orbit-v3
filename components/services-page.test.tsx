import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { pageAlternates, projectPath, servicesPath, worldPath } from "@/lib/page-paths";
import { getF1AProjects } from "@/lib/projects";
import { ServicesPage, servicesMetadata } from "./services-page";

// El marco (cabecera, pie, cielo) tiene sus propios tests: aquí sólo el contenido.
vi.mock("./site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));

describe("Servicios", () => {
  it.each(PUBLISHED_LOCALES)("%s: cuatro servicios, cada uno con su prueba publicada", (locale) => {
    const { container } = render(<ServicesPage locale={locale} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(4);

    // Cada prueba enlaza a un caso que existe en Proyectos (o a Experimentos).
    const cases = new Set([
      ...getF1AProjects(locale).map((project) => projectPath(project.id, locale)),
      worldPath("tesseract", locale),
    ]);
    const proofs = [...container.querySelectorAll(".services-page__proof a")].map((a) => a.getAttribute("href"));
    expect(proofs.length).toBeGreaterThanOrEqual(4);
    for (const href of proofs) expect(cases.has(href!), href!).toBe(true);

    // Las dos llamadas a la acción llevan al formulario de Contacto.
    const ctas = [...container.querySelectorAll("a.button--primary")].map((a) => a.getAttribute("href"));
    expect(ctas).toEqual([`${worldPath("ranger", locale)}#transmision`, `${worldPath("ranger", locale)}#transmision`]);

    // Un nodo Service por tarjeta, con la misma Person como proveedor.
    const graph = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!)["@graph"];
    const services = graph.filter((node: { "@type": string }) => node["@type"] === "Service");
    expect(services).toHaveLength(4);
    for (const service of services) expect(service.provider["@id"]).toMatch(/#jonas$/);
  });

  it.each(PUBLISHED_LOCALES)("%s: metadata propia, canónica y hreflang hacia la otra lengua", (locale) => {
    const metadata = servicesMetadata(locale);
    expect(metadata.alternates?.canonical).toBe(servicesPath(locale));
    expect(metadata.alternates?.languages).toMatchObject(pageAlternates({ kind: "services" }));
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(110);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });
});
