import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { getProject } from "@/lib/projects";
import { caseOutline, headingSlug, nodeText } from "./case-outline";

/**
 * Un cuerpo compilado mínimo con la misma forma que los de Velite: una
 * función que recibe el runtime de JSX y devuelve `{ default }`.
 */
function compiled(headings: string[], paragraph = "una dos tres cuatro") {
  const children = headings
    .map((heading) => `a("h2",{children:${JSON.stringify(heading)}}),a("p",{children:${JSON.stringify(paragraph)}})`)
    .join(",");
  return `const{Fragment:e,jsx:a,jsxs:n}=arguments[0];return{default:function(){return n(e,{children:[${children}]})}};`;
}

describe("headingSlug", () => {
  it("quita el numeral, los acentos y todo lo que no es letra o cifra", () => {
    expect(headingSlug("1. Contexto")).toBe("contexto");
    expect(headingSlug("12. Diseño y UX")).toBe("diseno-y-ux");
    expect(headingSlug("Decisión relevante")).toBe("decision-relevante");
  });
});

describe("nodeText", () => {
  it("aplana cadenas, listas y elementos anidados", () => {
    expect(nodeText(["Arquitectura ", createElement("code", null, "ledger"), " y stack"])).toBe("Arquitectura ledger y stack");
    expect(nodeText(null)).toBe("");
  });
});

describe("caseOutline", () => {
  it("lee los títulos del cuerpo real con anclas estables y su rótulo sin numeral", () => {
    const outline = caseOutline(getProject("omsta", "es").prose.body);
    expect(outline.headings).toHaveLength(17);
    expect(outline.headings[0]).toEqual({ id: "contexto", text: "1. Contexto", label: "Contexto" });
    expect(outline.headings.at(-1)?.id).toBe("enlaces-y-siguiente-paso");
    expect(outline.minutes).toBeGreaterThanOrEqual(3);
  });

  it("un título que pisaría un ancla de la página o a otro se desambigua", () => {
    const outline = caseOutline(compiled(["Sistema", "Notas", "Notas"]), ["sistema"]);
    expect(outline.headings.map((heading) => heading.id)).toEqual(["sistema-2", "notas", "notas-2"]);
  });

  it("el tiempo de lectura sale de las palabras del cuerpo, nunca menos de un minuto", () => {
    expect(caseOutline(compiled(["Uno"])).minutes).toBe(1);
    const long = caseOutline(compiled(["Uno"], Array.from({ length: 450 }, () => "palabra").join(" ")));
    expect(long.minutes).toBe(3);
  });
});
