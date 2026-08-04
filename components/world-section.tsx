import type { World } from "@/lib/worlds";
import { WorldGlyph } from "./world-glyph";

export function WorldSection({
  world,
  children,
  showPanels = true,
}: {
  world: World;
  children?: React.ReactNode;
  showPanels?: boolean;
}) {
  const { prose } = world;
  return (
    <section
      id={prose.slug}
      aria-labelledby={`${world.id}-title`}
      className="world-section"
      data-world={world.id}
      style={
        {
          "--world-accent": world.accent,
          "--world-secondary": world.secondary,
        } as React.CSSProperties
      }
    >
      <div className="world-section__atmosphere" aria-hidden="true" />
      <div className="world-section__inner">
        <aside className="world-section__rail" aria-label={`Destino ${world.order} de 7`}>
          <span className="world-section__number">
            {String(world.order).padStart(2, "0")}
          </span>
          <span className="world-section__line" aria-hidden="true" />
          <span>07</span>
        </aside>

        <div className="world-section__content">
          <div className="world-section__masthead">
            <div>
              <p className="section-kicker">
                DESTINO {String(world.order).padStart(2, "0")} / {world.cosmicName}
              </p>
              <p className="world-section__eyebrow">{prose.eyebrow}</p>
              <h2 id={`${world.id}-title`}>{prose.title}</h2>
              <p className="world-section__intro">{prose.introduction}</p>
            </div>
            <WorldGlyph world={world} />
          </div>

          <dl className="fact-grid">
            {prose.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {children}

          {showPanels ? (
            <ul className="panel-grid">
              {prose.panels.map((panel, index) => (
                <li key={panel.title}>
                  <span className="panel-grid__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="panel-grid__eyebrow">{panel.eyebrow}</p>
                  <h3>{panel.title}</h3>
                  <p>{panel.description}</p>
                  {panel.tags && panel.tags.length > 0 ? (
                    <ul className="tag-list">
                      {panel.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="world-section__closing">
            <span aria-hidden="true">{"//"}</span> {prose.closing}
          </p>
        </div>
      </div>
    </section>
  );
}
