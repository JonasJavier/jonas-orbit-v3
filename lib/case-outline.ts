import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";

/**
 * EL ÍNDICE DEL CASO COMPLETO — la parte pura.
 *
 * El cuerpo de un proyecto llega compilado por Velite (una función de MDX, no
 * Markdown), y sus `h2` salen sin `id`. El índice lateral del caso necesita
 * los títulos y un ancla estable para cada uno EN EL HTML SERVIDO —sin
 * JavaScript el índice son enlaces normales—, así que se leen del árbol que
 * devuelve la propia función: el mismo contenido que se pinta, sin un segundo
 * parser ni un campo nuevo en el frontmatter.
 */

export interface CaseHeading {
  /** El ancla: el título sin su numeral, en minúsculas y sin acentos. */
  id: string;
  /** El título tal cual lo escribió su autor («1. Contexto»). */
  text: string;
  /** El título sin el numeral con el que lo abre el MDX («Contexto»). */
  label: string;
}

export interface CaseOutline {
  headings: CaseHeading[];
  /** Minutos de lectura del cuerpo, redondeados hacia arriba (mínimo 1). */
  minutes: number;
}

/** Palabras por minuto de lectura en pantalla: la cifra habitual para español. */
const WORDS_PER_MINUTE = 200;

/** «1. Contexto» → «Contexto». Un título sin numeral se queda como está. */
function stripNumeral(text: string): string {
  return text.replace(/^\s*\d+[.)]\s+/, "").trim();
}

export function headingSlug(text: string): string {
  return stripNumeral(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** El texto plano de un nodo de React: cadenas, listas y elementos anidados. */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

type MdxBody = (props: { components?: Record<string, unknown> }) => ReactNode;

/**
 * Títulos y tiempo de lectura de un cuerpo compilado. `reserved` son los ids
 * que la página ya usa (las secciones del caso): un apartado del MDX que se
 * llamase igual se desambigua con un sufijo, nunca pisa un ancla de la página.
 */
export function caseOutline(code: string, reserved: readonly string[] = []): CaseOutline {
  const factory = new Function(code);
  const Body = factory({ ...runtime }).default as MdxBody;
  // Sin `wrapper`, la función de MDX devuelve el árbol de su contenido tal
  // cual: los `h2` son elementos de tipo "h2" con su texto dentro.
  const tree = Body({});

  const taken = new Set(reserved);
  const headings: CaseHeading[] = [];
  let words = 0;

  const visit = (node: ReactNode) => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      words += String(node).split(/\s+/).filter(Boolean).length;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isValidElement<{ children?: ReactNode }>(node)) return;
    if (node.type === "h2") {
      const text = nodeText(node.props.children).trim();
      const base = headingSlug(text) || "apartado";
      let id = base;
      for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
      taken.add(id);
      headings.push({ id, text, label: stripNumeral(text) });
    }
    visit(node.props.children);
  };
  visit(tree);

  return { headings, minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) };
}
