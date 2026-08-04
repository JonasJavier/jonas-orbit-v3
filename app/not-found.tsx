import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Misión no encontrada",
  description: "La coordenada solicitada no forma parte de Jonás Orbit.",
};

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__orbit" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">ERROR DE NAVEGACIÓN / 404</p>
      <h1>Esta misión salió de la órbita.</h1>
      <p>
        La coordenada solicitada no existe o todavía no forma parte del mapa
        público.
      </p>
      <Link className="button button--primary" href="/es">
        Volver a Jonás Orbit <span aria-hidden="true">↖</span>
      </Link>
    </main>
  );
}
