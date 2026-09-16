/* Server-rendered artwork references; the existing experience enhances scrolling. */
/* eslint-disable @next/next/no-img-element */
import tastes from "@/content/about-tastes.data.json";

export function AboutShelf({ group }: { group: "music" | "stories" }) {
  const label =
    group === "music"
      ? "Selección de música"
      : "Selección de cine, series y anime";
  const id = `about-shelf-${group}`;
  return (
    <div
      className="about-shelf"
      role="group"
      aria-label={label}
      data-group={group}
    >
      <div className="about-shelf-toolbar">
        <span>EN MI ÓRBITA</span>
        <div className="about-shelf-controls">
          <button
            type="button"
            data-shelf-step="-1"
            aria-controls={id}
            aria-label={`${label}: anteriores`}
          >
            ←
          </button>
          <button
            type="button"
            data-shelf-step="1"
            aria-controls={id}
            aria-label={`${label}: siguientes`}
          >
            →
          </button>
        </div>
      </div>
      <ul
        id={id}
        className="about-shelf-track"
        tabIndex={0}
        aria-label={`${label}, desplazar para explorar`}
      >
        {tastes
          .filter((item) => item.group === group)
          .map((item) => (
            <li key={item.id}>
              <a
                href={item.source}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.title} · ${item.note}. Ver referencia (nueva pestaña)`}
              >
                <span className="about-cover">
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <strong>
                  {item.title} <span aria-hidden="true">↗</span>
                </strong>
                <span className="about-shelf-note">{item.note}</span>
              </a>
            </li>
          ))}
      </ul>
      {group === "music" ? (
        <p className="about-shelf-credit">
          Retrato de Hans Zimmer:{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Hans-Zimmer-profile.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            ColliderVideo
          </a>
          {" · "}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 3.0
          </a>
          . Recorte y tamaño adaptados.
        </p>
      ) : null}
    </div>
  );
}
