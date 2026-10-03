import type { MetadataRoute } from "next";

/**
 * Manifiesto de la app web: nombre, icono y colores para «añadir a la
 * pantalla de inicio» y para la pestaña del navegador en Android. Sin
 * `start_url` por idioma: `/` ya redirige al idioma elegido.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jonás Orbit — Jonás Javier Encarnación",
    short_name: "Jonás Orbit",
    description:
      "Interactive 3D portfolio of Jonás Javier Encarnación, full-stack developer and UX/UI designer.",
    start_url: "/",
    display: "standalone",
    background_color: "#03050a",
    theme_color: "#03050a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
