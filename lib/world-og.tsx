import { ImageResponse } from "next/og";
import type { World } from "./worlds";

/**
 * Tarjeta Open Graph de una página de mundo.
 *
 * Ocho rutas indexables que compartieran la MISMA imagen serían ocho enlaces
 * indistinguibles en LinkedIn o WhatsApp — justo el problema que el pivote
 * quería resolver al convertir las anclas en páginas. Cada mundo lleva su
 * nombre cósmico, su título y su acento.
 *
 * Se genera en BUILD (no usa APIs de request), así que no añade coste de
 * runtime al Worker de Cloudflare.
 */

export const WORLD_OG_SIZE = { width: 1200, height: 630 };
export const WORLD_OG_CONTENT_TYPE = "image/png";

export function renderWorldOgImage(world: World) {
  const { accent, secondary, cosmicName, order, prose } = world;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `radial-gradient(120% 120% at 82% 10%, ${accent}22 0%, #090d19 44%, #05070f 100%)`,
          padding: "72px 80px",
          color: "#eef3ff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 24,
            letterSpacing: 6,
            color: secondary,
          }}
        >
          <div
            style={{ width: 14, height: 14, borderRadius: 999, background: accent }}
          />
          <div style={{ display: "flex" }}>JONÁS ORBIT</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", color: "#9ba8c3" }}>
            {`DESTINO ${String(order).padStart(2, "0")} / 07`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: accent }}>
            {cosmicName.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {prose.title}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 900,
              fontSize: 28,
              lineHeight: 1.35,
              color: "#c9d2e5",
            }}
          >
            {prose.summary}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", height: 3, width: 120, background: accent }} />
          <div style={{ display: "flex", fontSize: 24, color: "#9ba8c3" }}>
            Jonás Javier Encarnación · Santo Domingo
          </div>
        </div>
      </div>
    ),
    WORLD_OG_SIZE,
  );
}
