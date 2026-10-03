import { IntentLink as Link } from "@/components/intent-link";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { DEFAULT_LOCALE, isPublishedLocale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";
import { BlogSky } from "@/components/blog-sky";
import "@/components/blog.css";

const COPY = defineCopy({
  es: {
    title: "Misión no encontrada",
    description: "La coordenada solicitada no forma parte de Jonás Orbit.",
    kicker: "ERROR DE NAVEGACIÓN / 404",
    heading: "Esta misión salió de la órbita.",
    body: "La coordenada solicitada no existe o todavía no forma parte del mapa público.",
    back: "Volver a Jonás Orbit",
  },
  en: {
    title: "Mission not found",
    description: "The requested coordinate is not part of Jonás Orbit.",
    kicker: "NAVIGATION ERROR / 404",
    heading: "This mission drifted out of orbit.",
    body: "The coordinate you asked for doesn’t exist, or it isn’t on the public map yet.",
    back: "Back to Jonás Orbit",
  },
});

async function currentLocale() {
  const value = await rootLocale();
  return value && isPublishedLocale(value) ? value : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = COPY[await currentLocale()];
  return { title: copy.title, description: copy.description };
}

export default async function NotFound() {
  const locale = await currentLocale();
  const copy = COPY[locale];
  return (
    <main className="not-found" id="main-content">
      <BlogSky />
      <div className="not-found__orbit" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">{copy.kicker}</p>
      <h1>{copy.heading}</h1>
      <p>{copy.body}</p>
      <Link className="button button--primary" href={`/${locale}`}>
        {copy.back} <span aria-hidden="true">↖</span>
      </Link>
    </main>
  );
}
