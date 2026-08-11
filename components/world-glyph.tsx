import type { WorldStructuralData } from "@/content/worlds.data";

/**
 * Marca visual de un cuerpo. Puramente decorativa (`aria-hidden`): el nombre
 * del destino siempre está en texto al lado, nunca dentro del glifo.
 *
 * Recibe solo lo estructural y no el mundo entero para poder usarse tanto en el
 * mapa del sistema como en la cabecera de cada página de mundo.
 */
export function WorldGlyph({
  visual,
  accent,
  secondary,
}: Pick<WorldStructuralData, "visual" | "accent" | "secondary">) {
  return (
    <div
      className="world-glyph"
      data-visual={visual}
      style={
        {
          "--world-accent": accent,
          "--world-secondary": secondary,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span className="world-glyph__orbit world-glyph__orbit--a" />
      <span className="world-glyph__orbit world-glyph__orbit--b" />
      <span className="world-glyph__body" />
      <span className="world-glyph__signal" />
    </div>
  );
}
