import type { World } from "@/lib/worlds";

export function WorldGlyph({ world }: { world: World }) {
  return (
    <div
      className="world-glyph"
      data-visual={world.visual}
      style={
        {
          "--world-accent": world.accent,
          "--world-secondary": world.secondary,
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
