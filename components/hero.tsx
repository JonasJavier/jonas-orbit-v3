import Link from "next/link";

/**
 * El bloque de identidad de la home.
 *
 * ── Por qué vuelve a decir algo ─────────────────────────────────────────────
 *
 * La versión anterior dejaba a la vista SOLO el nombre y escondía el rol y la
 * propuesta en texto para lectores de pantalla. Cumplía la regla 7 —el HTML
 * servido los contenía— pero fallaba en lo humano: alguien podía quedarse diez
 * segundos mirando un agujero negro precioso sin enterarse de a qué se dedica
 * la persona del portafolio. Impresionar sin explicar es la mitad del trabajo.
 *
 * Ahora se ven tres cosas y ni una más: nombre, qué hace, y una frase. Siguen
 * siendo tipografía de instrumento —mono, pequeña, muy espaciada— para que
 * informen sin competir con Gargantúa, que es quien manda en el cuadro.
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
      </h1>

      {/*
        El rol va en dos líneas cortas y no en una larga: a este tamaño y con
        este tracking, una sola línea cruzaría medio cuadro y se convertiría en
        un elemento de composición que compite con el sistema.
      */}
      <p className="hero__role">
        Desarrollador full-stack
        <span className="hero__role-break">Diseñador de producto digital</span>
      </p>

      <p className="hero__pitch">
        Construyo productos digitales donde ingeniería y diseño orbitan juntos.
      </p>

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
