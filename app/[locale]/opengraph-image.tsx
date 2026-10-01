import { ImageResponse } from "next/og";
import { PUBLISHED_LOCALES, isPublishedLocale } from "@/content/site.data";

/**
 * Imagen Open Graph por defecto del sitio (la tarjeta de la portada).
 *
 * Se genera en BUILD (Next la optimiza estáticamente al no usar APIs de
 * request): en Railway se sirve del prerender y en el preview de Cloudflare
 * desde la caché de assets, sin coste de runtime. Los casos de estudio la
 * sobrescriben con su propia captura destacada.
 *
 * Se lee en miniatura (Discord, LinkedIn, WhatsApp): pocas palabras y
 * grandes. Paleta del contrato visual WP0: fondo `#05070f`, ámbar `#f2c879`
 * para la prueba/acción y cian `#7fe5ff` para navegación y sistemas; el
 * anillo de la derecha es Gargantúa, la portada del sitio.
 */

// El archivo no conoce su ruta: un solo texto. Las páginas que declaran su
// `openGraph` llevan el alt de su idioma (`defaultOgImage` en
// `lib/site-metadata.ts`).
export const alt =
  "Jonás Javier, Full-Stack Developer — Django, React y TypeScript · Jonás Orbit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPY = {
  es: {
    role: "Full-Stack Developer",
    lines: ["Software real.", "Sistemas que llegan a producción."],
  },
  en: {
    role: "Full-Stack Developer",
    lines: ["Real software.", "Systems that reach production."],
  },
};

const STACK = "Django · React · TypeScript";

/** Estrellas fijas (x, y, diámetro, opacidad): sin azar, la tarjeta no cambia entre builds. */
const STARS: [number, number, number, number][] = [
  [612, 92, 3, 0.7],
  [748, 168, 2, 0.5],
  [1096, 76, 3, 0.8],
  [1150, 236, 2, 0.45],
  [688, 548, 2, 0.5],
  [1012, 572, 3, 0.6],
  [1160, 470, 2, 0.4],
  [560, 300, 2, 0.35],
];

export function generateStaticParams() {
  return PUBLISHED_LOCALES.map((locale) => ({ locale }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const copy = COPY[isPublishedLocale(raw) ? raw : "en"];
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(110% 120% at 80% 40%, #121a2c 0%, #080c17 46%, #05070f 100%)",
          color: "#eef3ff",
          fontFamily: "sans-serif",
        }}
      >
        {STARS.map(([x, y, d, o]) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: d,
              height: d,
              borderRadius: 999,
              background: "#dfe8ff",
              opacity: o,
            }}
          />
        ))}

        {/* Gargantúa: halo de lente, disco ámbar inclinado y la sombra encima. */}
        <div
          style={{
            position: "absolute",
            left: 760,
            top: 95,
            width: 440,
            height: 440,
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(242,200,121,0.22) 0%, rgba(242,200,121,0.08) 42%, rgba(5,7,15,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 735,
            top: 296,
            width: 490,
            height: 38,
            borderRadius: 999,
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,236,196,0.95) 0%, rgba(242,200,121,0.7) 34%, rgba(242,200,121,0.12) 72%, rgba(242,200,121,0) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 892,
            top: 227,
            width: 176,
            height: 176,
            borderRadius: 999,
            background: "#020308",
            boxShadow:
              "0 0 0 3px rgba(255,226,170,0.85), 0 0 26px 6px rgba(242,200,121,0.45)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 800,
            top: 312,
            width: 360,
            height: 6,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(242,200,121,0) 0%, rgba(255,236,196,0.9) 50%, rgba(242,200,121,0) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "68px 80px 72px",
          }}
        >
          {/* Cabecera: mismo lenguaje de "instrumentación orbital" del HUD. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 22,
              letterSpacing: 6,
              color: "#7fe5ff",
            }}
          >
            <div
              style={{ width: 12, height: 12, borderRadius: 999, background: "#f2c879" }}
            />
            <div style={{ display: "flex" }}>JONÁS ORBIT</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 92,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              JONÁS JAVIER
            </div>
            <div
              style={{ display: "flex", marginTop: 18, fontSize: 42, color: "#f2c879" }}
            >
              {copy.role}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 40,
                fontSize: 32,
                lineHeight: 1.3,
                color: "#c9d2e5",
              }}
            >
              {copy.lines.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontSize: 26,
              color: "#9ba8c3",
            }}
          >
            <div style={{ display: "flex", height: 3, width: 96, background: "#7fe5ff" }} />
            <div style={{ display: "flex" }}>{STACK}</div>
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 2 }}>
              jonasjavier.dev
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
