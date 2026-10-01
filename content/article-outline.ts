/**
 * El índice de una entrada del blog y su tiempo de lectura, calculados al
 * compilar el contenido (Velite) a partir del MDX en bruto.
 *
 * Los ids de los `<h2>` y los enlaces del índice salen de la MISMA función
 * (`createSlugger`): el plugin de rehype escribe el id en el HTML y
 * `articleHeadings` lo calcula desde el texto del `##`. Si uno cambia, cambian
 * los dos, y el índice nunca apunta a un ancla que no existe.
 *
 * Módulo puro y sin alias `@/`: lo importa `velite.config.ts`.
 */

export interface ArticleHeading {
  id: string;
  title: string;
}

/** Ids legibles y únicos dentro de una entrada: «Disco de Kepler» → `disco-de-kepler`. */
function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base =
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/['\u2019]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "seccion";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

/** El MDX sin bloques de código: ni sus `##` son títulos ni sus palabras se leen igual. */
function withoutCode(raw: string): string {
  return raw.replace(/^```[\s\S]*?^```/gm, "");
}

/** Texto plano de una línea de Markdown: sin `código`, énfasis ni enlaces. */
function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

export function articleHeadings(raw: string): ArticleHeading[] {
  const slug = createSlugger();
  return [...withoutCode(raw).matchAll(/^## (.+)$/gm)].map(([, heading]) => {
    const title = plainText(heading);
    return { id: slug(title), title };
  });
}

/** Minutos a 220 palabras por minuto, más medio minuto por bloque de código. */
export function readingMinutes(raw: string): number {
  const prose = withoutCode(raw).replace(/<[^>]+>/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  const codeBlocks = (raw.match(/^```/gm)?.length ?? 0) / 2;
  return Math.max(1, Math.round(words / 220 + codeBlocks * 0.5));
}

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** Plugin de rehype: un id en cada `<h2>`, el mismo que calcula `articleHeadings`. */
export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const slug = createSlugger();
    const visit = (node: HastNode) => {
      if (node.type === "element" && node.tagName === "h2") {
        node.properties = { ...node.properties, id: slug(textOf(node).trim()) };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
