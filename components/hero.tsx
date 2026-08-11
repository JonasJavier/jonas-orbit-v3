import Link from "next/link";

/**
 * La capa de texto de la home, reducida al hueso.
 *
 * ── Por qué queda tan poco a la vista ───────────────────────────────────────
 *
 * La home es una experiencia inmersiva: cada palabra que no hace falta compite
 * con la escena. Aquí solo se VE el nombre y tres enlaces en tamaño de
 * instrumento — ni titular gigante, ni botones, ni navegación duplicada.
 *
 * Pero la regla 7 del repositorio no se negocia: el HTML servido tiene que
 * contener el nombre, el rol, los dos CTAs, el CV y los siete destinos, sin
 * JavaScript. La salida no es quitar contenido, es **quitarlo de la vista sin
 * quitarlo del documento**: la frase y el rol siguen en el marcado, los lee un
 * lector de pantalla y los indexa Googlebot. Lo que desaparece es el ruido
 * visual, no la información.
 *
 * Sigue siendo el candidato a LCP: llega en el HTML, sin esperar a la escena.
 */
export function Hero({
  projectsHref,
  contactHref,
}: {
  projectsHref: string;
  contactHref: string;
}) {
  return (
    <header className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="hero__name">
        Jonás Javier Encarnación
        {/* Rol y propuesta: presentes para quien lee el documento, invisibles
            para quien lo mira. */}
        <span className="visually-hidden">
          {" "}
          — desarrollador full-stack y creador visual. No separo creatividad y
          tecnología: las mantengo en la misma órbita.
        </span>
      </h1>

      <nav className="hero__actions" aria-label="Acciones principales">
        <Link className="hero__action" href={projectsHref}>
          Proyectos
        </Link>
        <Link className="hero__action" href={contactHref}>
          Contacto
        </Link>
        <a className="hero__action" download href="/cv/jonas-javier-cv-es.pdf">
          CV <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </header>
  );
}
