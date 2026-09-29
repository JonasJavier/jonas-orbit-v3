/* The photographs are responsive files prepared by tools/prepare-about.mjs. */
import Link from "next/link";
import { preload } from "react-dom";
import type { Locale } from "@/content/site.data";
import { homePath, worldPath } from "@/lib/page-paths";
import { WORLD_COPY } from "@/lib/world-copy";
import type { World } from "@/lib/worlds";
import { getWorld, getWorldPath } from "@/lib/worlds";
import { ABOUT_COPY, type AboutPhoto } from "./about-page.copy";
import { StructuredData } from "./structured-data";
import { AboutExperience } from "./about-experience";
import { AboutImage, aboutPhotoPath, type PhotoId } from "./about-image";
import { AboutShelf } from "./about-shelf";
import "./about-page.css";

const WIDE = "(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw";
// Lo que la constelación pinta de verdad (medido 2026-09-29): en el teléfono
// cada nodo mide ~114 px y el retrato ~174 px. Declarar 43vw y 480px hacía
// bajar la versión de 640 y la de 960 —~700 KB de más en móvil—.
const NODE = "(max-width: 700px) 120px, 240px";
const PORTRAIT = "(max-width: 700px) 180px, 480px";

/** Una foto que se amplía en el visor de la página (`about-experience.tsx`). */
function PhotoButton({
  id,
  photo,
  sizes,
  className = "about-photo-button",
}: {
  id: PhotoId;
  photo: AboutPhoto;
  sizes?: string;
  className?: string;
}) {
  return (
    <a
      className={className}
      data-photo={id}
      data-title={photo.title}
      data-caption={photo.caption}
      aria-label={photo.label}
      href={aboutPhotoPath(id)}
    >
      <AboutImage id={id} alt={photo.alt} sizes={sizes} />
    </a>
  );
}

export function AboutPage({ world, locale }: { world: World; locale: Locale }) {
  const t = ABOUT_COPY[locale];
  const next = getWorld("miller", locale);
  // El paisaje es el LCP: se pide desde el <head>, una precarga por versión.
  preload("/images/sobre-mi/cielo-montanas-movil.webp", { as: "image", fetchPriority: "high", media: "(max-width: 700px)" });
  preload("/images/sobre-mi/cielo-montanas-1536.webp", { as: "image", fetchPriority: "high", media: "(min-width: 701px)" });
  return (
    <AboutExperience>
      <StructuredData
        locale={locale}
        breadcrumb={[{ path: getWorldPath(world, locale), name: world.prose.title }]}
      />
      <header className="about-hero" id="constelacion" data-about-sky="">
        <picture className="about-landscape">
          <source
            media="(max-width: 700px)"
            srcSet="/images/sobre-mi/cielo-montanas-movil.webp"
            width={720}
            height={1024}
          />
          <img
            src="/images/sobre-mi/cielo-montanas-1536.webp"
            alt=""
            width={1536}
            height={1024}
            fetchPriority="high"
          />
        </picture>
        <div className="about-stars" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37.17 + 7) % 100}%`,
                top: `${(i * 23.71 + 11) % 100}%`,
                animationDelay: `${i * -0.73}s`,
              }}
            />
          ))}
        </div>
        <div className="about-wrap">
          <div className="about-intro">
            <span className="about-eyebrow">{t.heroEyebrow}</span>
            <h1 tabIndex={-1}>
              <span className="visually-hidden">{t.heroHidden}</span>
              {t.heroTitle}
            </h1>
            <p className="about-intro-note">
              {t.heroNote[0]} <br />
              {t.heroNote[1]}
            </p>
          </div>
          <nav className="about-constellation" aria-label={t.constellation}>
            <svg
              className="about-connections"
              viewBox="0 0 1100 615"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <ellipse cx="550" cy="289" rx="335" ry="236"></ellipse>
              <ellipse cx="550" cy="289" rx="140" ry="140"></ellipse>
              <path data-for="raices" d="M550 289 L400 192 L253 117"></path>
              <path data-for="gente" d="M550 289 L696 185 L847 117"></path>
              <path data-for="soy" d="M550 289 L355 350 L176 320"></path>
              <path data-for="disfruto" d="M550 289 L742 345 L924 320"></path>
              <path data-for="camino" d="M550 289 L455 435 L319 517"></path>
              <path data-for="sueno" d="M550 289 L650 440 L781 517"></path>
              <circle cx="400" cy="192" r="2.4"></circle>
              <circle cx="696" cy="185" r="2.4"></circle>
              <circle cx="355" cy="350" r="2.4"></circle>
              <circle cx="742" cy="345" r="2.4"></circle>
              <circle cx="455" cy="435" r="2.4"></circle>
              <circle cx="650" cy="440" r="2.4"></circle>
            </svg>
            <div className="about-portrait">
              <div className="about-portrait-ring">
                <div className="about-portrait-crop">
                  <AboutImage id="F40" alt={t.portraitAlt} sizes={PORTRAIT} eager />
                </div>
              </div>
              <h2>Jonás</h2>
              <small>{t.place}</small>
            </div>
            {(
              [
                ["roots", "about-node-roots", "#mis-raices", "F23"],
                ["people", "about-node-people", "#mi-gente", "F50"],
                ["self", "about-node-self", "#como-soy", "F28"],
                ["enjoy", "about-node-enjoy", "#lo-que-disfruto", "F44"],
                ["path", "about-node-path", "#mi-camino", "F11"],
                ["dream", "about-node-dream", "#lo-que-sueno", "F45"],
              ] as const
            ).map(([key, className, href, photo]) => (
              <a key={key} className={`about-node ${className}`} href={href}>
                <div className="about-node-image">
                  <AboutImage id={photo} alt={t.nodes[key].alt} sizes={NODE} eager />
                </div>
                <h3>{t.nodes[key].title}</h3>
                <p>{t.nodes[key].lead}</p>
              </a>
            ))}
          </nav>
          <div className="about-hero-bottom">
            <p className="about-invitation">
              <span aria-hidden="true">✧</span> {t.invitation}
              <span className="about-invitation-line" aria-hidden="true" />
            </p>
          </div>
        </div>
      </header>
      <div className="about-detail">
        <nav className="about-journey-nav" aria-label={t.journeyNav}>
          <div className="about-wrap">
            <a className="about-back-map" href="#constelacion" aria-label={t.backToMap}>
              ✧
            </a>
            {(
              [
                ["roots", "#mis-raices"],
                ["people", "#mi-gente"],
                ["self", "#como-soy"],
                ["enjoy", "#lo-que-disfruto"],
                ["path", "#mi-camino"],
                ["dream", "#lo-que-sueno"],
              ] as const
            ).map(([key, href], index) => (
              <a key={key} href={href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {t.nodes[key].title}
              </a>
            ))}
          </div>
        </nav>
        <div className="about-slot">
          <section
            className="about-chapter about-roots about-wrap"
            id="mis-raices"
            aria-labelledby="roots-title"
          >
            <div className="about-roots-layout">
              <div className="about-roots-copy">
                <span className="about-eyebrow">{t.rootsEyebrow}</span>
                <h2 tabIndex={-1} id="roots-title">
                  {t.rootsTitle}
                </h2>
                <p className="about-place">
                  <span>{t.rootsPlace}</span>
                  <span className="about-coordinates">{t.rootsCoordinates}</span>
                </p>
                <h3 className="about-roots-words">{t.rootsWords}</h3>
                <p className="about-roots-story">{t.rootsStory}</p>
              </div>
              <figure className="about-roots-landscape">
                <PhotoButton
                  id="F23"
                  photo={t.rootsPhoto}
                  sizes="(max-width: 700px) 92vw, (min-width: 1400px) 780px, 58vw"
                />
              </figure>
            </div>
            <a className="about-section-end" href="#mi-gente">
              {t.rootsNext}
            </a>
          </section>
          <section
            className="about-chapter about-people"
            id="mi-gente"
            aria-labelledby="people-title"
            data-about-sky=""
          >
            <div className="about-wrap">
              <div className="about-people-opening">
                <div className="about-people-copy">
                  <span className="about-eyebrow">{t.peopleEyebrow}</span>
                  <h2 tabIndex={-1} id="people-title">
                    {t.peopleTitle}
                  </h2>
                  <p className="about-section-lead">{t.peopleLead}</p>
                  <p className="about-people-sub">{t.peopleSub}</p>
                </div>
                <figure className="about-paper">
                  <PhotoButton id="F50" photo={t.familyPhoto} sizes={WIDE} />
                  <figcaption className="about-caption">{t.familyPhoto.caption}</figcaption>
                </figure>
              </div>
              <div className="about-people-stories">
                <article className="about-story">
                  <div className="about-friend-pair">
                    <PhotoButton
                      id="F09"
                      photo={t.childhoodPhoto}
                      sizes={WIDE}
                      className="about-photo-button about-childhood"
                    />
                    <PhotoButton
                      id="F29"
                      photo={t.bethelPhoto}
                      sizes={WIDE}
                      className="about-photo-button about-betel"
                    />
                  </div>
                  <p className="about-memory-line">{t.friendsLine}</p>
                </article>
                <article className="about-story about-grandparents">
                  <figure>
                    <PhotoButton id="F04" photo={t.grandparentsPhoto} sizes={WIDE} />
                  </figure>
                  <div>
                    <span className="about-eyebrow">{t.grandparentsEyebrow}</span>
                    <p className="about-memory-line">{t.grandparentsLine}</p>
                  </div>
                </article>
              </div>
              <div className="about-chosen-family">
                <div>
                  <span className="about-eyebrow">{t.chosenEyebrow}</span>
                  <h3>{t.chosenTitle}</h3>
                </div>
                <div className="about-friends-album">
                  <figure className="about-paper">
                    <PhotoButton id="F34" photo={t.friendsPhoto} />
                    <figcaption className="about-caption">{t.friendsPhoto.caption}</figcaption>
                  </figure>
                  <figure className="about-paper about-collage">
                    <PhotoButton id="F15" photo={t.callsPhoto} />
                    <figcaption className="about-caption">{t.callsPhoto.caption}</figcaption>
                  </figure>
                </div>
              </div>
              <a className="about-section-end" href="#como-soy">
                {t.peopleNext}
              </a>
            </div>
          </section>
          <section
            className="about-chapter about-wrap"
            id="como-soy"
            aria-labelledby="self-title"
          >
            <div className="about-self-layout">
              <figure className="about-self-photo">
                <PhotoButton id="F28" photo={t.selfPhoto} sizes={WIDE} />
              </figure>
              <div className="about-self-copy">
                <span className="about-eyebrow">{t.selfEyebrow}</span>
                <h2 tabIndex={-1} id="self-title">
                  {t.selfTitle}
                </h2>
                <p className="about-section-lead">{t.selfLead}</p>
                <p>{t.selfStory}</p>
                <div className="about-traits">
                  <span className="about-eyebrow">{t.traitsEyebrow}</span>
                  <ul>
                    {t.traits.map((trait) => (
                      <li key={trait}>{trait}</li>
                    ))}
                  </ul>
                </div>
                <p>{t.faith}</p>
                <p className="about-script">{t.selfScript}</p>
              </div>
            </div>
            <a className="about-section-end" href="#lo-que-disfruto">
              {t.selfNext}
            </a>
          </section>
          <section
            className="about-chapter about-enjoy"
            id="lo-que-disfruto"
            aria-labelledby="enjoy-title"
          >
            <div className="about-wrap">
              <div className="about-enjoy-head">
                <span className="about-eyebrow">{t.enjoyEyebrow}</span>
                <h2 tabIndex={-1} id="enjoy-title">
                  {t.enjoyTitle}
                </h2>
                <p className="about-section-lead">{t.enjoyLead}</p>
              </div>
              <div className="about-enjoy-grid">
                <figure className="about-waterfall">
                  <PhotoButton id="F44" photo={t.waterfallPhoto} sizes={WIDE} />
                </figure>
                <div className="about-enjoy-side">
                  <div className="about-photography-copy">
                    <div>
                      <span className="about-eyebrow">{t.photographyEyebrow}</span>
                      <h3>
                        {t.photographyTitle[0]}
                        <br />
                        {t.photographyTitle[1]}
                      </h3>
                      <p>{t.photographyBody}</p>
                    </div>
                  </div>
                  <div className="about-adventures">
                    <div>
                      <span className="about-eyebrow">{t.companyEyebrow}</span>
                      <h3>{t.companyTitle}</h3>
                    </div>
                    <div className="about-adventure-photos">
                      <figure className="">
                        <PhotoButton id="F20" photo={t.dayPhoto} />
                        <figcaption className="about-caption">{t.dayPhoto.caption}</figcaption>
                      </figure>
                      <figure className="">
                        <PhotoButton id="F07" photo={t.waterPhoto} />
                        <figcaption className="about-caption">{t.waterPhoto.caption}</figcaption>
                      </figure>
                    </div>
                  </div>
                </div>
              </div>
              <div className="about-plans">
                <div>
                  <span className="about-eyebrow">{t.plansEyebrow}</span>
                  <h3>{t.plansTitle}</h3>
                </div>
                <p>{t.plansBody}</p>
              </div>
              <div className="about-listening-room">
                <article className="about-taste">
                  <span className="about-eyebrow">{t.musicEyebrow}</span>
                  <h3>{t.musicTitle}</h3>
                  <p>{t.musicBody}</p>
                  <AboutShelf group="music" locale={locale} />
                </article>
                <article className="about-taste">
                  <span className="about-eyebrow">{t.storiesEyebrow}</span>
                  <h3>{t.storiesTitle}</h3>
                  <p>{t.storiesBody}</p>
                  <AboutShelf group="stories" locale={locale} />
                </article>
              </div>
              <a className="about-section-end" href="#mi-camino">
                {t.enjoyNext}
              </a>
            </div>
          </section>
          <section
            className="about-chapter about-wrap"
            id="mi-camino"
            aria-labelledby="path-title"
          >
            <div className="about-path-head">
              <div>
                <span className="about-eyebrow">{t.pathEyebrow}</span>
                <h2 tabIndex={-1} id="path-title">
                  {t.pathTitle}
                </h2>
                <p className="about-section-lead">{t.pathLead}</p>
              </div>
            </div>
            <article className="about-service-story">
              <div className="about-service-copy">
                <span className="about-eyebrow">{t.preachingEyebrow}</span>
                <h3>{t.preachingTitle}</h3>
                <p>{t.preachingBody}</p>
              </div>
              <div className="about-preaching-photos">
                <figure className="">
                  <PhotoButton id="F02" photo={t.preachingPhoto} />
                  <figcaption className="about-caption">{t.preachingPhoto.caption}</figcaption>
                </figure>
                <figure className="about-preaching-memory">
                  <PhotoButton id="F16" photo={t.littlePhoto} />
                  <figcaption className="about-caption">{t.littlePhoto.caption}</figcaption>
                </figure>
              </div>
            </article>
            <article className="about-service-story about-betel-story">
              <div className="about-service-copy">
                <span className="about-eyebrow">{t.bethelEyebrow}</span>
                <h3>{t.bethelTitle}</h3>
                <p>{t.bethelBody}</p>
              </div>
              <div className="about-volunteer-album">
                <span className="about-eyebrow">{t.volunteerEyebrow}</span>
                <div className="about-path-photos">
                  <figure className="">
                    <PhotoButton id="F11" photo={t.volunteerPhoto} />
                    <figcaption className="about-caption">{t.volunteerPhoto.caption}</figcaption>
                  </figure>
                  <figure className="">
                    <PhotoButton id="F36" photo={t.workPhoto} />
                    <figcaption className="about-caption">{t.workPhoto.caption}</figcaption>
                  </figure>
                </div>
              </div>
            </article>
            <a className="about-section-end" href="#lo-que-sueno">
              {t.pathNext}
            </a>
          </section>
          <section
            className="about-chapter about-wrap"
            id="lo-que-sueno"
            aria-labelledby="dream-title"
          >
            <div className="about-dream-layout">
              <div className="about-dream-copy">
                <span className="about-eyebrow">{t.dreamEyebrow}</span>
                <h2 tabIndex={-1} id="dream-title">
                  {t.dreamTitle}
                </h2>
                <p>{t.dreamBody}</p>
                <p className="about-script">
                  {t.dreamScript[0]}
                  <br />
                  {t.dreamScript[1]}
                </p>
              </div>
              <figure>
                <PhotoButton id="F45" photo={t.dreamPhoto} sizes={WIDE} />
              </figure>
            </div>
          </section>
        </div>
      </div>
      <footer className="about-ending">
        <span className="about-eyebrow">{t.endingEyebrow}</span>
        <h2>
          {t.endingTitle[0]}
          <br />
          {t.endingTitle[1]}
        </h2>
        <a href="#constelacion">{t.endingBack}</a>
        <Link className="about-system-return" href={homePath(locale)}>
          {t.endingOrbit}
        </Link>
        <nav className="about-neighbours" aria-label={WORLD_COPY[locale].neighbours}>
          <Link href={worldPath("miller", locale)}>
            {t.nextDestination} · {next.prose.title} / {next.cosmicName} →
          </Link>
        </nav>
      </footer>
    </AboutExperience>
  );
}
