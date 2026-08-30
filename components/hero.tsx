import Link from "next/link";

/**
 * Respaldo semántico de identidad y conversión de la home.
 *
 * El System Map ya no muestra un bloque de presentación personal: su trabajo es
 * sistema, navegación y exploración. Este encabezado permanece en el HTML
 * servido para que la identidad, el rol y los accesos principales no dependan
 * de JavaScript ni del canvas, pero se retira del plano visual. La marca visible
 * mínima vive en el HUD como `JONAS ORBIT`.
 */
export function Hero({
  projectsHref,
  contactHref,
}: {
  projectsHref: string;
  contactHref: string;
}) {
  return (
    <header className="hero-semantic visually-hidden" aria-labelledby="hero-title">
      <h1 id="hero-title">
        Jonás Javier Encarnación
      </h1>
      <p>Desarrollador full-stack · Diseñador de producto digital</p>
      {/* El raíl ya ofrece Proyectos y Contacto de forma accesible. Esta copia
          contractual permanece en el HTML de origen para el fallback, pero no
          añade tres paradas invisibles al recorrido de teclado. */}
      <nav aria-label="Acciones principales" hidden>
        <Link href={projectsHref}>
          Proyectos
        </Link>
        <Link href={contactHref}>
          Contacto
        </Link>
        <a download href="/cv/jonas-javier-cv-es.pdf">
          CV
        </a>
      </nav>
    </header>
  );
}
