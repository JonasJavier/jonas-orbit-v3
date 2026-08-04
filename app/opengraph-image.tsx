import { ImageResponse } from "next/og";
import { SITE_PROFILE } from "@/content/site.data";

/**
 * Imagen Open Graph por defecto del sitio.
 *
 * Se genera en BUILD (Next la optimiza estáticamente al no usar APIs de
 * request), así que no añade coste de runtime al Worker de Cloudflare.
 * Los casos de estudio la sobrescriben con su propia captura destacada.
 *
 * Paleta del contrato visual WP0: fondo `#05070f`, ámbar `#f2c879` para la
 * prueba/acción y cian `#7fe5ff` para navegación y sistemas.
 */

export const alt =
  "Jonás Javier Encarnación — Desarrollador full-stack y creador visual";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(120% 120% at 78% 12%, #151c2e 0%, #090d19 42%, #05070f 100%)",
          padding: "72px 80px",
          color: "#eef3ff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Cabecera: mismo lenguaje de "instrumentación orbital" del HUD. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 24,
            letterSpacing: 6,
            color: "#7fe5ff",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#f2c879",
            }}
          />
          <div style={{ display: "flex" }}>JONÁS ORBIT</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", color: "#9ba8c3" }}>
            {SITE_PROFILE.locality.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {SITE_PROFILE.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              color: "#f2c879",
            }}
          >
            {SITE_PROFILE.jobTitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontSize: 24,
            color: "#9ba8c3",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 3,
              width: 120,
              background: "#7fe5ff",
            }}
          />
          <div style={{ display: "flex" }}>
            Python · Django · React · TypeScript · UX/UI · Fotografía
          </div>
        </div>
      </div>
    ),
    size,
  );
}
