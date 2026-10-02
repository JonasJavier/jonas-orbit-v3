/**
 * Las copias para dev.to de las entradas del blog, en inglés y con
 * `canonical_url` al original: dev.to da el enlace y el tráfico; el
 * posicionamiento se queda en jonasjavier.dev.
 *
 * Convierte `content/en/articles/*.mdx` en `docs/difusion/devto/<id>.md`:
 * front matter de dev.to (title, description, tags, cover_image,
 * canonical_url, series), `<Figure>` → imagen Markdown con su pie en cursiva,
 * enlaces relativos → absolutos, y una línea final que apunta al original.
 *
 *   node --experimental-strip-types tools/prepare-devto.mjs
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = "https://jonasjavier.dev";
const SERIES = "Building Jonás Orbit, a 3D portfolio";
/** Cuatro etiquetas como máximo, las que dev.to ya usa. */
const TAGS = {
  "gargantua-webgl": "webgl, threejs, glsl, graphics",
  "tesseract-4d": "threejs, webgl, math, javascript",
  "webgl-seo-performance": "webgl, performance, seo, nextjs",
  "nextjs-bilingual": "nextjs, i18n, seo, react",
  "interstellar-black-hole-physics": "science, physics, space, webgl",
  "hire-freelance-developer-dr": "freelance, career, webdev, business",
};
/** La guía para contratar no es parte de la serie técnica. */
const OUTSIDE_SERIES = new Set(["hire-freelance-developer-dr"]);

const { articlesData } = await import("../content/articles.data.ts");
const dir = path.join(process.cwd(), "content/en/articles");
const out = path.join(process.cwd(), "docs/difusion/devto");
await mkdir(out, { recursive: true });

/** El front matter del MDX como objeto: valores de una línea y bloques `>-`. */
function parseFrontMatter(text) {
  const fields = {};
  let current = null;
  for (const line of text.split("\n")) {
    const simple = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (simple && !/^\s/.test(line)) {
      const [, key, value] = simple;
      if (value === ">-") {
        current = key;
        fields[key] = "";
      } else {
        current = null;
        fields[key] = value.replace(/^"(.*)"$/, "$1").trim();
      }
    } else if (current && /^\s+\S/.test(line)) {
      fields[current] = `${fields[current]} ${line.trim()}`.trim();
    }
  }
  return fields;
}

const figure = (data) => (_, name, alt, caption) =>
  `![${alt}](${SITE}${data.images}/${name}-1600.webp)\n*${caption}*`;

for (const file of (await readdir(dir)).filter((f) => f.endsWith(".mdx"))) {
  const raw = await readFile(path.join(dir, file), "utf8");
  const [, fm, ...rest] = raw.split(/^---$/m);
  const body = rest.join("---").trim();
  const prose = parseFrontMatter(fm);
  const data = articlesData[prose.id];
  if (!data) throw new Error(`Sin datos estructurales: ${prose.id}`);
  const cover = typeof data.cover === "string" ? data.cover : data.cover.en;
  const canonical = `${SITE}/en/blog/${prose.slug}`;

  let md = body
    .replace(/<Figure\s+name="([^"]+)"\s+alt="([^"]*)"\s+caption="([^"]*)"\s*\/>/gs, figure(data))
    .replace(/\]\((\/[^)]*)\)/g, (_, href) => `](${SITE}${href})`);
  if (/<Figure/.test(md)) throw new Error(`Figura sin convertir en ${prose.id}`);

  const where = data.specimen
    ? `[Observatory](${SITE}/en/experiments/observatory/${data.specimen})`
    : `[blog](${SITE}/en/blog)`;
  const front = [
    "---",
    `title: ${prose.title}`,
    "published: true",
    `description: "${prose.summary.replace(/"/g, "'")}"`,
    `tags: ${TAGS[prose.id]}`,
    `cover_image: ${SITE}${data.images}/${cover}-1600.webp`,
    `canonical_url: ${canonical}`,
    ...(OUTSIDE_SERIES.has(prose.id) ? [] : [`series: ${SERIES}`]),
    "---",
  ].join("\n");
  const foot = `\n\n---\n\n*Originally published on [my portfolio](${canonical}), next to the ${where}. I'm Jonás Javier Encarnación, a full-stack developer and UX/UI designer in Santo Domingo, Dominican Republic: [how I work](${SITE}/en/contact/services).*\n`;
  await writeFile(path.join(out, `${prose.id}.md`), `${front}\n\n${md}${foot}`);
  console.log(prose.id, `(${md.split(/\s+/).length} words)`);
}
