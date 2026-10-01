import Link from "next/link";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";

const COPY = defineCopy({
  es: {
    role: "Desarrollador full-stack · Diseñador de producto digital",
    actions: "Acciones principales",
    projects: "Proyectos",
    contact: "Contacto",
    cv: "/cv/jonas-javier-cv-es.pdf",
  },
  en: {
    role: "Full-stack developer · Digital product designer",
    actions: "Main actions",
    projects: "Projects",
    contact: "Contact",
    cv: "/cv/jonas-javier-cv-en-ats.pdf",
  },
});

/**
 * Respaldo semántico de identidad y conversión de la home.
 *
 * El System Map ya no muestra un bloque de presentación personal: su trabajo es
 * sistema, navegación y exploración. Este encabezado permanece en el HTML
 * servido para que la identidad, el rol y los accesos principales no dependan
 * de JavaScript ni del canvas, pero se retira del plano visual. La marca visible
 * mínima vive en el HUD como `JONAS ORBIT`, con la placa del operador —nombre
 * corto y rol— colgada debajo (`system-hud.tsx`).
 */
export function Hero({
  locale,
  projectsHref,
  contactHref,
}: {
  locale: Locale;
  projectsHref: string;
  contactHref: string;
}) {
  const copy = COPY[locale];
  return (
    <header className="hero-semantic visually-hidden" aria-labelledby="hero-title">
      <h1 id="hero-title">
        Jonás Javier Encarnación
      </h1>
      <p>{copy.role}</p>
      {/* El raíl ya ofrece Proyectos y Contacto de forma accesible. Esta copia
          contractual permanece en el HTML de origen para el fallback, pero no
          añade tres paradas invisibles al recorrido de teclado. */}
      <nav aria-label={copy.actions} hidden>
        <Link href={projectsHref}>
          {copy.projects}
        </Link>
        <Link href={contactHref}>
          {copy.contact}
        </Link>
        <a download href={copy.cv}>
          CV
        </a>
      </nav>
    </header>
  );
}
