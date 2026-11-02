import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { OBSERVATORY_IDS } from "@/lib/observatory-slugs";
import { observatoryPath, pageAlternates, projectPath, servicePath, servicesPath, worldPath } from "@/lib/page-paths";
import { getF1AProjects } from "@/lib/projects";
import { SERVICE_IDS, serviceIdBySlug, serviceSlug } from "@/lib/service-slugs";
import { SERVICE_DETAIL } from "./service-detail.copy";
import { ServiceDetailPage, serviceMetadata } from "./service-detail-page";

// El marco (cabecera, pie, cielo) tiene sus propios tests: aquí sólo el contenido.
vi.mock("./site-shell", () => ({ SiteShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));

const cases = PUBLISHED_LOCALES.flatMap((locale) => SERVICE_IDS.map((id) => [locale, id] as const));

describe("Páginas de servicio", () => {
  it("cada servicio tiene su slug en cada idioma, cuelga de Servicios y se encuentra por él", () => {
    for (const locale of PUBLISHED_LOCALES) {
      const slugs = SERVICE_IDS.map((id) => serviceSlug(id, locale));
      expect(new Set(slugs).size).toBe(SERVICE_IDS.length);
      for (const id of SERVICE_IDS) {
        expect(servicePath(id, locale)).toBe(`${servicesPath(locale)}/${serviceSlug(id, locale)}`);
        expect(serviceIdBySlug(serviceSlug(id, locale), locale)).toBe(id);
      }
    }
    // El inglés no reutiliza el slug español.
    for (const id of SERVICE_IDS) expect(serviceSlug(id, "es")).not.toBe(serviceSlug(id, "en"));
  });

  it.each(cases)("%s/%s: un h1, cada prueba enlaza a algo publicado y las llamadas van al formulario", (locale, id) => {
    const { container } = render(<ServiceDetailPage id={id} locale={locale} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    // Pruebas: casos de Proyectos o especímenes del Observatorio, nada más.
    const published = new Set([
      ...getF1AProjects(locale).map((project) => projectPath(project.id, locale)),
      ...OBSERVATORY_IDS.map((specimen) => observatoryPath(specimen, locale)),
    ]);
    const proofs = [...container.querySelectorAll(".svc-card h3 a")].map((a) => a.getAttribute("href")!);
    expect(proofs.length).toBe(SERVICE_DETAIL[locale][id].proofs.length);
    for (const href of proofs) expect(published.has(href), href).toBe(true);

    const ctas = [...container.querySelectorAll("a.button--primary")].map((a) => a.getAttribute("href"));
    expect(ctas).toEqual([`${worldPath("ranger", locale)}#transmision`, `${worldPath("ranger", locale)}#transmision`]);

    // Enlaza a los otros tres servicios y a la página que los reúne.
    const others = [...container.querySelectorAll(".svc-others a")].map((a) => a.getAttribute("href"));
    expect(others).toEqual([
      ...SERVICE_IDS.filter((other) => other !== id).map((other) => servicePath(other, locale)),
      servicesPath(locale),
    ]);

    // Un solo Service, con la página como @id y la misma Person como proveedor.
    const graph = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!)["@graph"];
    const services = graph.filter((node: { "@type": string }) => node["@type"] === "Service");
    expect(services).toHaveLength(1);
    expect(services[0]["@id"]).toMatch(new RegExp(`${servicePath(id, locale)}#servicio$`));
    expect(services[0].provider["@id"]).toMatch(/#jonas$/);
  });

  it.each(cases)("%s/%s: metadata propia, canónica, hreflang y longitudes de buscador", (locale, id) => {
    const metadata = serviceMetadata(id, locale);
    expect(metadata.alternates?.canonical).toBe(servicePath(id, locale));
    expect(metadata.alternates?.languages).toMatchObject(pageAlternates({ kind: "service", id }));
    // Con « · Jonás Javier» de la plantilla, el título se corta hacia los 70.
    expect(String(metadata.title).length).toBeLessThanOrEqual(56);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(110);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("los dos idiomas cuentan lo mismo: mismas pruebas, puntos y preguntas", () => {
    for (const id of SERVICE_IDS) {
      const [es, en] = [SERVICE_DETAIL.es[id], SERVICE_DETAIL.en[id]];
      expect(es.builds.length).toBe(en.builds.length);
      expect(es.proofs.length).toBe(en.proofs.length);
      expect(es.approach.length).toBe(en.approach.length);
      expect(es.questions.length).toBe(en.questions.length);
    }
  });
});
