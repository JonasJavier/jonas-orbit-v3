/* Server-rendered artwork references. The drift is pure CSS (about-page.css):
   a second, hidden copy of the list closes the loop, and without JavaScript or
   with movement off the row is an ordinary horizontal scroller. */
/* eslint-disable @next/next/no-img-element */
import tastes from "@/content/about-tastes.data.json";

type Taste = (typeof tastes)[number];

function Cover({ item, copy }: { item: Taste; copy?: boolean }) {
  const note = "note" in item ? item.note : undefined;
  return (
    <li>
      <a
        href={item.source}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copy ? -1 : undefined}
        aria-label={`${item.title}${note ? ` · ${note}` : ""}. Ver referencia (nueva pestaña)`}
      >
        <span className="about-cover">
          <img
            src={item.src}
            alt={copy ? "" : item.alt}
            width={item.width}
            height={item.height}
            loading="lazy"
            decoding="async"
          />
        </span>
        <strong>{item.title}</strong>
        {note ? <span className="about-shelf-note">{note}</span> : null}
      </a>
    </li>
  );
}

export function AboutShelf({ group }: { group: "music" | "stories" }) {
  const label =
    group === "music"
      ? "Selección de música"
      : "Selección de cine, series y anime";
  const items = tastes.filter((item) => item.group === group);
  return (
    <div
      className="about-shelf"
      role="group"
      aria-label={label}
      data-group={group}
    >
      <div className="about-shelf-viewport">
        <div className="about-marquee">
          <ul id={`about-shelf-${group}`} className="about-shelf-track">
            {items.map((item) => (
              <Cover key={item.id} item={item} />
            ))}
          </ul>
          <ul className="about-shelf-track about-shelf-copy" aria-hidden="true">
            {items.map((item) => (
              <Cover key={item.id} item={item} copy />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
