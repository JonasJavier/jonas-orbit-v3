/**
 * La tarjeta para compartir del sitio (`og:image` por defecto): el render
 * real de Gargantúa a sangre con el nombre abajo, en JPG de 1200 × 630.
 *
 * Existe porque la tarjeta dibujada en `ImageResponse` (un disco plano) no
 * enseñaba el trabajo 3D, y la misma composición con la foto pesa ~700 KB en
 * PNG —el único formato de `ImageResponse`—, por encima de los 300 KB que
 * aguantan WhatsApp y compañía. Aquí `next/og` pone el texto y `sharp` lo
 * comprime a JPG (~60 KB); `app/[locale]/opengraph-image.tsx` sirve el
 * archivo del idioma.
 *
 * Fuente: `gargantua-interstellar-wallpaper-4k-lens.jpg` de los fondos
 * (`wallpaper-shots.mjs`), capturado con GPU real.
 *
 * Uso: node tools/prepare-share-card.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(
  root,
  "public/images/articulos/fondos-gargantua/gargantua-interstellar-wallpaper-4k-lens.jpg",
);
const OUT_DIR = path.join(root, "public/brand");

const W = 1200;
const H = 630;

const COPY = {
  es: { threeD: "3D en tiempo real con Three.js" },
  en: { threeD: "Real-time 3D with Three.js" },
};

/**
 * El render 4K escalado para que la sombra (centro en 1920, 960 del original)
 * quede arriba y a la izquierda del centro, y el anillo inferior deje sitio
 * al nombre.
 */
async function plate() {
  const scale = 0.36;
  const [cx, cy] = [1920, 960];
  const [tx, ty] = [600, 238];
  const left = Math.round(cx - tx / scale);
  const top = Math.round(cy - ty / scale);
  const jpg = await sharp(SOURCE)
    .extract({ left, top, width: Math.round(W / scale), height: Math.round(H / scale) })
    .resize(W, H)
    .jpeg({ quality: 90 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

const row = { display: "flex" };

function card(background, copy) {
  return h(
    "div",
    {
      style: {
        ...row,
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#05070f",
        color: "#eef3ff",
        fontFamily: "sans-serif",
      },
    },
    h("img", { src: background, width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }),
    // Oscurece arriba (rótulos) y abajo (nombre) sin tocar la sombra.
    h("div", {
      style: {
        ...row,
        position: "absolute",
        left: 0,
        top: 0,
        width: W,
        height: H,
        background:
          "linear-gradient(180deg, rgba(5,7,15,0.55) 0%, rgba(5,7,15,0) 22%, rgba(5,7,15,0) 52%, rgba(5,7,15,0.82) 78%, rgba(5,7,15,0.97) 100%)",
      },
    }),
    h(
      "div",
      {
        style: {
          ...row,
          position: "absolute",
          left: 56,
          top: 44,
          alignItems: "center",
          gap: 16,
          fontSize: 20,
          letterSpacing: 6,
          color: "#7fe5ff",
        },
      },
      h("div", { style: { width: 10, height: 10, borderRadius: 999, background: "#f2c879" } }),
      h("div", { style: row }, "JONÁS ORBIT"),
    ),
    h(
      "div",
      { style: { ...row, position: "absolute", right: 56, top: 44, fontSize: 20, letterSpacing: 2 } },
      "jonasjavier.dev",
    ),
    h(
      "div",
      {
        style: {
          ...row,
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 48,
          alignItems: "flex-end",
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        { style: { ...row, flexDirection: "column" } },
        h("div", { style: { ...row, fontSize: 76, lineHeight: 1, fontWeight: 700, letterSpacing: 2 } }, "JONÁS JAVIER"),
        h("div", { style: { ...row, marginTop: 14, fontSize: 36, color: "#f2c879" } }, "Full-Stack Developer"),
      ),
      h(
        "div",
        {
          style: {
            ...row,
            flexDirection: "column",
            alignItems: "flex-end",
            fontSize: 24,
            lineHeight: 1.4,
            color: "#c9d2e5",
          },
        },
        h("div", { style: row }, "Django · React · TypeScript"),
        h("div", { style: { ...row, color: "#7fe5ff" } }, copy.threeD),
      ),
    ),
  );
}

const background = await plate();
for (const [locale, copy] of Object.entries(COPY)) {
  const png = Buffer.from(await new ImageResponse(card(background, copy), { width: W, height: H }).arrayBuffer());
  const output = path.join(OUT_DIR, `tarjeta-compartir-${locale}.jpg`);
  const jpg = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  writeFileSync(output, jpg);
  console.log(`public/brand/tarjeta-compartir-${locale}.jpg · ${Math.round(jpg.length / 1024)} KB`);
}
