/* Server-rendered artwork references. The drift is pure CSS (about-page.css):
   a second, hidden copy of the list closes the loop, and without JavaScript or
   with movement off the row is an ordinary horizontal scroller. */
/* eslint-disable @next/next/no-img-element */
import tastes from "@/content/about-tastes.data.json";
import type { Locale } from "@/content/site.data";
import { defineCopy } from "@/lib/i18n";

type Taste = (typeof tastes)[number];

/*
  Los datos (`about-tastes.data.json`) están escritos en español: el texto
  alternativo es «Portada: <título de la obra>» y la nota, el formato. Aquí se
  dicen en inglés sin duplicar la lista, porque lo único que cambia es la
  palabra delante del título, que es un nombre propio.
*/
const NOTES_EN: Record<string, string> = {
  Cine: "Film",
  "Mi serie favorita": "My favorite series",
  Serie: "Series",
  "Cine · Henry Cavill": "Film · Henry Cavill",
  "Serie · Grant Gustin": "Series · Grant Gustin",
};

const COPY = defineCopy({
  es: {
    music: "Selección de música",
    stories: "Selección de cine, series y anime",
    reference: "Ver referencia (nueva pestaña)",
    alt: (item: Taste) => item.alt,
    note: (note: string) => note,
  },
  en: {
    music: "Music picks",
    stories: "Film, TV and anime picks",
    reference: "View reference (opens in a new tab)",
    alt: (item: Taste) => `Cover: ${item.artworkTitle}`,
    note: (note: string) => NOTES_EN[note] ?? note,
  },
});

function Cover({ item, copy, locale }: { item: Taste; copy?: boolean; locale: Locale }) {
  const t = COPY[locale];
  const note = "note" in item && item.note ? t.note(item.note) : undefined;
  return (
    <li>
      <a
        href={item.source}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copy ? -1 : undefined}
        aria-label={`${item.title}${note ? ` · ${note}` : ""}. ${t.reference}`}
      >
        <span className="about-cover">
          <img
            src={item.src}
            alt={copy ? "" : t.alt(item)}
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

export function AboutShelf({ group, locale }: { group: "music" | "stories"; locale: Locale }) {
  const label = COPY[locale][group];
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
              <Cover key={item.id} item={item} locale={locale} />
            ))}
          </ul>
          <ul className="about-shelf-track about-shelf-copy" aria-hidden="true">
            {items.map((item) => (
              <Cover key={item.id} item={item} locale={locale} copy />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
