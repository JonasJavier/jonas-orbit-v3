import type { MetadataRoute } from "next";
import { PUBLISHED_LOCALES } from "@/content/site.data";
import { thanksPath } from "@/lib/page-paths";
import { absoluteUrl } from "@/lib/site-url";

/**
 * F1A se publica para ser encontrada: todo indexable salvo el endpoint de
 * contacto y las confirmaciones privadas de envío.
 *
 * La confirmación del contacto (`/es/contacto/gracias`, `/en/contact/thanks`)
 * se bloquea aquí ADEMÁS del `noindex` de la propia
 * página: el meta tag depende de que el crawler renderice la ruta, y esta regla
 * la mantiene fuera del rastreo desde el principio.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...PUBLISHED_LOCALES.map(thanksPath)],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
