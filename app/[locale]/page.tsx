import { notFound } from "next/navigation";
import { WorldSection } from "@/components/world-section";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { getWorlds } from "@/lib/worlds";

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

/**
 * Página narrativa única: los 7 mundos como secciones ancladas.
 * Versión mínima de setup — la coreografía de scroll, el starfield y el
 * contrato scroll→escena llegan con el trabajo de F1A.
 */
export default async function NarrativePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) {
    notFound();
  }
  const worlds = getWorlds(locale as Locale);

  return (
    <main id="main-content" className="flex-1">
      <header className="mx-auto w-full max-w-3xl px-6 pb-8 pt-24 text-center">
        <h1 className="text-4xl font-semibold text-star-amber">
          Jonás Javier Encarnación
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          Desarrollador full-stack · Diseñador UX/UI · Fotógrafo
        </p>
        <nav aria-label="CTAs principales" className="mt-8 flex justify-center gap-4">
          <a
            className="rounded border border-star-amber px-5 py-2 font-medium text-star-amber"
            href="#proyectos"
          >
            Ver proyectos
          </a>
          <a
            className="rounded border border-nebula-cyan px-5 py-2 font-medium text-nebula-cyan"
            href="#contacto"
          >
            Trabajemos juntos
          </a>
        </nav>
      </header>
      {worlds.map((world) => (
        <WorldSection key={world.id} world={world} />
      ))}
    </main>
  );
}
