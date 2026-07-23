import type { World } from "@/lib/worlds";

/**
 * Sección semántica de un mundo dentro de la página narrativa única.
 * Versión mínima de setup: estructura y anclas correctas, sin diseño final.
 * El ancla usa el slug localizado de la prosa (p. ej. /es#proyectos).
 */
export function WorldSection({ world }: { world: World }) {
  const { prose } = world;
  return (
    <section
      id={prose.slug}
      aria-labelledby={`${world.id}-title`}
      className="world-section mx-auto w-full max-w-3xl scroll-mt-8 px-6 py-16"
      style={{ "--world-accent": world.accent } as React.CSSProperties}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
        {String(world.order).padStart(2, "0")} · {world.cosmicName} ·{" "}
        {prose.eyebrow}
      </p>
      <h2
        id={`${world.id}-title`}
        className="mt-2 text-3xl font-semibold"
        style={{ color: "var(--world-accent)" }}
      >
        {prose.title}
      </h2>
      <p className="mt-4 text-lg text-ink">{prose.introduction}</p>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {prose.facts.map((fact) => (
          <div key={fact.label} className="rounded border border-space-haze p-3">
            <dt className="text-xs uppercase tracking-wide text-ink-muted">
              {fact.label}
            </dt>
            <dd className="mt-1 font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-8 space-y-6">
        {prose.panels.map((panel) => (
          <li key={panel.title}>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              {panel.eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-medium">{panel.title}</h3>
            <p className="mt-2 text-ink-muted">{panel.description}</p>
            {panel.tags && panel.tags.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {panel.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-space-haze px-3 py-1 text-xs text-ink-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-8 italic text-ink-muted">{prose.closing}</p>
    </section>
  );
}
