/* The photographs are responsive files prepared by tools/prepare-about.mjs. */
import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { World } from "@/lib/worlds";
import { getWorldPath } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { AboutExperience } from "./about-experience";
import { AboutImage, aboutPhotoPath } from "./about-image";
import { AboutShelf } from "./about-shelf";
import "./about-page.css";

export function AboutPage({ world, locale }: { world: World; locale: Locale }) {
  return (
    <AboutExperience>
      <StructuredData
        locale={locale}
        breadcrumb={{
          path: getWorldPath(world, locale),
          name: world.prose.title,
        }}
      />
      <header className="about-hero" id="constelacion" data-about-sky="">
        <picture className="about-landscape">
          <source
            media="(max-width: 700px)"
            srcSet="/images/sobre-mi/cielo-montanas-1536.webp"
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
            <span className="about-eyebrow">01 / SOBRE MÍ</span>
            <h1 tabIndex={-1}>
              <span className="visually-hidden">Sobre mí. </span>Mi pequeño
              universo.
            </h1>
            <p className="about-intro-note">
              Misma persona, <br />
              distintos cielos.
            </p>
          </div>
          <nav
            className="about-constellation"
            aria-label="Explora las seis constelaciones"
          >
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
                  <AboutImage
                    id="F40"
                    alt="Jonás sonriendo, con abrigo y luces al fondo"
                    sizes="480px"
                    eager
                  />
                </div>
              </div>
              <h2>Jonás</h2>
              <small>BONAO · REPÚBLICA DOMINICANA</small>
            </div>
            <a className="about-node about-node-roots" href="#mis-raices">
              <div className="about-node-image">
                <AboutImage
                  id="F23"
                  alt="Río rodeado de vegetación en Bonao"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mis raíces</h3>
              <p>Donde empezó todo.</p>
            </a>
            <a className="about-node about-node-people" href="#mi-gente">
              <div className="about-node-image">
                <AboutImage
                  id="F50"
                  alt="Jonás con su familia en una asamblea internacional"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mi gente</h3>
              <p>Las personas que hacen hogar.</p>
            </a>
            <a className="about-node about-node-self" href="#como-soy">
              <div className="about-node-image">
                <AboutImage
                  id="F28"
                  alt="Jonás junto al mar"
                  eager
                  sizes="(max-width: 700px) 43vw, 240px"
                />
              </div>
              <h3>Cómo soy</h3>
              <p>Todavía aprendiendo.</p>
            </a>
            <a className="about-node about-node-enjoy" href="#lo-que-disfruto">
              <div className="about-node-image">
                <AboutImage
                  id="F44"
                  alt="Una gran cascada entre vegetación"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Lo que disfruto</h3>
              <p>Curiosidad, naturaleza y buenas historias.</p>
            </a>
            <a className="about-node about-node-path" href="#mi-camino">
              <div className="about-node-image">
                <AboutImage
                  id="F11"
                  alt="Un momento compartido durante el voluntariado de mantenimiento"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mi camino</h3>
              <p>Servir, aprender y compartir.</p>
            </a>
            <a className="about-node about-node-dream" href="#lo-que-sueno">
              <div className="about-node-image">
                <AboutImage
                  id="F45"
                  alt="Una persona contemplando un lago entre montañas"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Lo que sueño</h3>
              <p>Una vida sencilla. Mucho por descubrir.</p>
            </a>
          </nav>
          <div className="about-hero-bottom">
            <p className="about-invitation">
              <span aria-hidden="true">✧</span> Elige una constelación
              <span className="about-invitation-line" aria-hidden="true" />
            </p>
          </div>
        </div>
      </header>
      <div className="about-detail">
        <nav className="about-journey-nav" aria-label="Tu lugar en la historia">
          <div className="about-wrap">
            <a
              className="about-back-map"
              href="#constelacion"
              aria-label="Volver a la constelación"
            >
              ✧
            </a>
            <a href="#mis-raices">
              <span>01</span>Mis raíces
            </a>
            <a href="#mi-gente">
              <span>02</span>Mi gente
            </a>
            <a href="#como-soy">
              <span>03</span>Cómo soy
            </a>
            <a href="#lo-que-disfruto">
              <span>04</span>Lo que disfruto
            </a>
            <a href="#mi-camino">
              <span>05</span>Mi camino
            </a>
            <a href="#lo-que-sueno">
              <span>06</span>Lo que sueño
            </a>
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
                <span className="about-eyebrow">01 / EL PUNTO DE PARTIDA</span>
                <h2 tabIndex={-1} id="roots-title">
                  Mis raíces.
                </h2>
                <p className="about-place">
                  <span>Bonao · República Dominicana</span>
                  <span className="about-coordinates">18°56′ N · 70°25′ O</span>
                </p>
                <h3 className="about-roots-words">
                  Crecí entre ríos y montañas.
                </h3>
                <p className="about-roots-story">
                  Bonao es mi punto de partida. Crecer rodeado de montañas, ríos
                  y tanto verde dejó algo en mí: todavía busco esos lugares
                  cuando quiero desconectarme, pensar o simplemente mirar. De
                  ahí viene buena parte de mi gusto por explorar.
                </p>
              </div>
              <figure className="about-roots-landscape">
                <a
                  className="about-photo-button"
                  data-photo="F23"
                  data-title="Mis raíces"
                  data-caption="Entre ríos y montañas, con mis amigos."
                  aria-label="Ampliar fotografía de la cascada con mis amigos"
                  href={aboutPhotoPath("F23")}
                >
                  <AboutImage
                    id="F23"
                    alt="Jonás con sus amigos frente a una cascada rodeada de vegetación"
                    sizes="(max-width: 700px) 92vw, (min-width: 1400px) 780px, 58vw"
                  />
                </a>
              </figure>
            </div>
            <a className="about-section-end" href="#mi-gente">
              Y LAS PERSONAS QUE ME ACOMPAÑAN
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
                  <span className="about-eyebrow">02 / MIS VÍNCULOS</span>
                  <h2 tabIndex={-1} id="people-title">
                    Mi gente.
                  </h2>
                  <p className="about-section-lead">
                    Mi familia es mi primer hogar.
                  </p>
                  <p className="about-people-sub">
                    La alegría de mi madre, el esfuerzo de mi padre y la amistad
                    de mi hermana.
                  </p>
                </div>
                <figure className="about-paper">
                  <a
                    className="about-photo-button"
                    data-photo="F50"
                    data-title="Mi familia"
                    data-caption="Juntos en una asamblea internacional."
                    aria-label="Ampliar fotografía de mi familia"
                    href={aboutPhotoPath("F50")}
                  >
                    <AboutImage
                      id="F50"
                      alt="Jonás y su familia en el auditorio de una asamblea internacional"
                      sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                    />
                  </a>
                  <figcaption className="about-caption">
                    Juntos en una asamblea internacional.
                  </figcaption>
                </figure>
              </div>
              <div className="about-people-stories">
                <article className="about-story">
                  <div className="about-friend-pair">
                    <a
                      className="about-photo-button about-childhood"
                      data-photo="F09"
                      data-title="Desde pequeños"
                      data-caption="Aquí hablábamos de nuestras metas, entre ellas ir a Betel."
                      aria-label="Ampliar recuerdo de infancia con mi mejor amigo"
                      href={aboutPhotoPath("F09")}
                    >
                      <AboutImage
                        id="F09"
                        alt="Jonás y su mejor amigo de niños, frente a unas filas de asientos"
                        sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                      />
                    </a>
                    <a
                      className="about-photo-button about-betel"
                      data-photo="F29"
                      data-title="Un sueño compartido"
                      data-caption="Con mi mejor amigo durante nuestra etapa en Betel."
                      aria-label="Ampliar fotografía de los dos amigos en Betel"
                      href={aboutPhotoPath("F29")}
                    >
                      <AboutImage
                        id="F29"
                        alt="Jonás y su mejor amigo en Betel"
                        sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                      />
                    </a>
                  </div>
                  <p className="about-memory-line">
                    Mi mejor amigo y yo, cumpliendo metas y sueños juntos.
                  </p>
                </article>
                <article className="about-story about-grandparents">
                  <figure>
                    <a
                      className="about-photo-button"
                      data-photo="F04"
                      data-title="Mis abuelos"
                      data-caption="Lo que aprendí a su lado."
                      aria-label="Ampliar fotografía de mis abuelos maternos"
                      href={aboutPhotoPath("F04")}
                    >
                      <AboutImage
                        id="F04"
                        alt="Los abuelos maternos de Jonás juntos en una mesa"
                        sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                      />
                    </a>
                  </figure>
                  <div>
                    <span className="about-eyebrow">MIS ABUELOS</span>
                    <p className="about-memory-line">
                      Cariño, sabiduría y muchos recuerdos.
                    </p>
                  </div>
                </article>
              </div>
              <div className="about-chosen-family">
                <div>
                  <span className="about-eyebrow">AMIGOS, CASI FAMILIA</span>
                  <h3>También hacen hogar.</h3>
                </div>
                <div className="about-friends-album">
                  <figure className="about-paper">
                    <a
                      className="about-photo-button"
                      data-photo="F34"
                      data-title="Amigos, casi familia"
                      data-caption="Amigos que se sienten como familia."
                      aria-label="Ampliar fotografía: Amigos, casi familia"
                      href={aboutPhotoPath("F34")}
                    >
                      <AboutImage
                        id="F34"
                        alt="Amigos compartiendo un rato al aire libre, entre árboles y sillas de jardín"
                      />
                    </a>
                    <figcaption className="about-caption">
                      Amigos que se sienten como familia.
                    </figcaption>
                  </figure>
                  <figure className="about-paper about-collage">
                    <a
                      className="about-photo-button"
                      data-photo="F15"
                      data-title="Recuerdos compartidos"
                      data-caption="Cerca, también a través de una pantalla."
                      aria-label="Ampliar fotografía: Recuerdos compartidos"
                      href={aboutPhotoPath("F15")}
                    >
                      <AboutImage
                        id="F15"
                        alt="Collage de videollamadas con amigos, con un marco de hojas y mensajes"
                      />
                    </a>
                    <figcaption className="about-caption">
                      Cerca, también a través de una pantalla.
                    </figcaption>
                  </figure>
                </div>
              </div>
              <a className="about-section-end" href="#como-soy">
                UN POCO MÁS DE MÍ
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
                <a
                  className="about-photo-button"
                  data-photo="F28"
                  data-title="Junto al mar"
                  data-caption="Un momento al aire libre."
                  aria-label="Ampliar retrato junto al mar"
                  href={aboutPhotoPath("F28")}
                >
                  <AboutImage
                    id="F28"
                    alt="Retrato de Jonás de perfil junto al mar"
                    sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                  />
                </a>
              </figure>
              <div className="about-self-copy">
                <span className="about-eyebrow">03 / MI FORMA DE SER</span>
                <h2 tabIndex={-1} id="self-title">
                  Cómo soy.
                </h2>
                <p className="about-section-lead">Curioso por naturaleza.</p>
                <p>
                  Me gusta conocer personas, entender cómo funcionan las cosas y
                  aprender algo nuevo cada día. Antes era tímido; hoy me abro
                  más, aunque sigo disfrutando mis ratos a solas.
                </p>
                <div className="about-traits">
                  <span className="about-eyebrow">
                    Así me describen mis amigos
                  </span>
                  <ul>
                    <li>Tranquilo</li>
                    <li>Auténtico</li>
                    <li>Amable</li>
                    <li>Servicial</li>
                  </ul>
                </div>
                <p>
                  Mi fe ocupa un lugar importante en mi vida y orienta muchas de
                  mis decisiones.
                </p>
                <p className="about-script">
                  Le doy demasiadas vueltas a algunas cosas. Estoy trabajando en
                  eso.
                </p>
              </div>
            </div>
            <a className="about-section-end" href="#lo-que-disfruto">
              LAS COSAS QUE DISFRUTO
            </a>
          </section>
          <section
            className="about-chapter about-enjoy"
            id="lo-que-disfruto"
            aria-labelledby="enjoy-title"
          >
            <div className="about-wrap">
              <div className="about-enjoy-head">
                <span className="about-eyebrow">04 / LO QUE DISFRUTO</span>
                <h2 tabIndex={-1} id="enjoy-title">
                  Lo que disfruto.
                </h2>
                <p className="about-section-lead">
                  Siempre hay algo por descubrir.
                </p>
              </div>
              <div className="about-enjoy-grid">
                <figure className="about-waterfall">
                  <a
                    className="about-photo-button"
                    data-photo="F44"
                    data-title="Explorar"
                    data-caption="Montañas, ríos y tiempo al aire libre."
                    aria-label="Ampliar fotografía de la cascada"
                    href={aboutPhotoPath("F44")}
                  >
                    <AboutImage
                      id="F44"
                      alt="Una persona al pie de una gran cascada cubierta de vegetación"
                      sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                    />
                  </a>
                </figure>
                <div className="about-enjoy-side">
                  <div className="about-photography-copy">
                    <div>
                      <span className="about-eyebrow">FOTOGRAFÍA</span>
                      <h3>
                        Mirar. Detenerme.
                        <br />
                        Recordar.
                      </h3>
                      <p>
                        Fotografío para guardar paisajes, pequeños detalles y
                        buenos momentos.
                      </p>
                    </div>
                  </div>
                  <div className="about-adventures">
                    <div>
                      <span className="about-eyebrow">EN BUENA COMPAÑÍA</span>
                      <h3>Y si es con amigos, mejor.</h3>
                    </div>
                    <div className="about-adventure-photos">
                      <figure className="">
                        <a
                          className="about-photo-button"
                          data-photo="F20"
                          data-title="Un día con amigos"
                          data-caption="Buenos momentos con mis amigos."
                          aria-label="Ampliar fotografía: Un día con amigos"
                          href={aboutPhotoPath("F20")}
                        >
                          <AboutImage
                            id="F20"
                            alt="Amigos con chalecos salvavidas junto a una moto acuática"
                          />
                        </a>
                        <figcaption className="about-caption">
                          Buenos momentos con mis amigos.
                        </figcaption>
                      </figure>
                      <figure className="">
                        <a
                          className="about-photo-button"
                          data-photo="F07"
                          data-title="Dentro del agua"
                          data-caption="Salir a descubrir, juntos."
                          aria-label="Ampliar fotografía: Dentro del agua"
                          href={aboutPhotoPath("F07")}
                        >
                          <AboutImage
                            id="F07"
                            alt="Dos personas con casco y chaleco dentro del agua, entre paredes de roca"
                          />
                        </a>
                        <figcaption className="about-caption">
                          Salir a descubrir, juntos.
                        </figcaption>
                      </figure>
                    </div>
                  </div>
                </div>
              </div>
              <div className="about-plans">
                <div>
                  <span className="about-eyebrow">EXPLORAR</span>
                  <h3>Mis planes favoritos.</h3>
                </div>
                <p>Montañas, ríos, lugares nuevos y tiempo con amigos.</p>
              </div>
              <div className="about-listening-room">
                <article className="about-taste">
                  <span className="about-eyebrow">MÚSICA</span>
                  <h3>La música que me acompaña.</h3>
                  <p>
                    Bandas sonoras, baladas de siempre y canciones con un poco
                    de nostalgia.
                  </p>
                  <AboutShelf group="music" />
                </article>
                <article className="about-taste">
                  <span className="about-eyebrow">HISTORIAS</span>
                  <h3>Después de los créditos.</h3>
                  <p>Cine, anime y series para seguir pensando un rato más.</p>
                  <AboutShelf group="stories" />
                </article>
              </div>
              <a className="about-section-end" href="#mi-camino">
                EXPERIENCIAS QUE ME HAN FORMADO
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
                <span className="about-eyebrow">
                  05 / EXPERIENCIAS QUE ME HAN FORMADO
                </span>
                <h2 tabIndex={-1} id="path-title">
                  Mi camino.
                </h2>
                <p className="about-section-lead">
                  Servir. Aprender. Compartir.
                </p>
              </div>
            </div>
            <article className="about-service-story">
              <div className="about-service-copy">
                <span className="about-eyebrow">PREDICAR · UNA CONSTANTE</span>
                <h3>Aprender a escuchar.</h3>
                <p>
                  Predicar desde joven me ayudó a conocer personas muy distintas
                  y a dejar atrás parte de mi timidez.
                </p>
              </div>
              <div className="about-preaching-photos">
                <figure className="">
                  <a
                    className="about-photo-button"
                    data-photo="F02"
                    data-title="Predicar, en compañía"
                    data-caption="Predicar · En compañía."
                    aria-label="Ampliar fotografía: Predicar, en compañía"
                    href={aboutPhotoPath("F02")}
                  >
                    <AboutImage
                      id="F02"
                      alt="Un grupo de distintas edades al aire libre durante la predicación"
                    />
                  </a>
                  <figcaption className="about-caption">
                    Predicar · En compañía.
                  </figcaption>
                </figure>
                <figure className="about-preaching-memory">
                  <a
                    className="about-photo-button"
                    data-photo="F16"
                    data-title="Desde pequeño"
                    data-caption="Un recuerdo de cuando era pequeño."
                    aria-label="Ampliar fotografía: Desde pequeño"
                    href={aboutPhotoPath("F16")}
                  >
                    <AboutImage
                      id="F16"
                      alt="Un adulto y tres niños compartiendo un momento de la etapa de predicación"
                    />
                  </a>
                  <figcaption className="about-caption">
                    Un recuerdo de cuando era pequeño.
                  </figcaption>
                </figure>
              </div>
            </article>
            <article className="about-service-story about-betel-story">
              <div className="about-service-copy">
                <span className="about-eyebrow">
                  BETEL · UNA ETAPA ESPECIAL
                </span>
                <h3>Crecer junto a otros.</h3>
                <p>
                  En Betel, un centro de voluntarios de los testigos de Jehová,
                  compartí trabajo, aprendizajes y amistades que siguen conmigo.
                </p>
              </div>
              <div className="about-volunteer-album">
                <span className="about-eyebrow">
                  RECUERDOS DEL VOLUNTARIADO DE MANTENIMIENTO
                </span>
                <div className="about-path-photos">
                  <figure className="">
                    <a
                      className="about-photo-button"
                      data-photo="F11"
                      data-title="Voluntariado de mantenimiento"
                      data-caption="Voluntariado de mantenimiento · Un momento compartido."
                      aria-label="Ampliar fotografía: Voluntariado de mantenimiento"
                      href={aboutPhotoPath("F11")}
                    >
                      <AboutImage
                        id="F11"
                        alt="Voluntarios de mantenimiento junto a un muro, varios con chalecos de trabajo"
                      />
                    </a>
                    <figcaption className="about-caption">
                      Voluntariado de mantenimiento · Un momento compartido.
                    </figcaption>
                  </figure>
                  <figure className="">
                    <a
                      className="about-photo-button"
                      data-photo="F36"
                      data-title="En plena actividad"
                      data-caption="Voluntariado de mantenimiento · En plena actividad."
                      aria-label="Ampliar fotografía: En plena actividad"
                      href={aboutPhotoPath("F36")}
                    >
                      <AboutImage
                        id="F36"
                        alt="Tres voluntarios sobre una plataforma de trabajo"
                      />
                    </a>
                    <figcaption className="about-caption">
                      Voluntariado de mantenimiento · En plena actividad.
                    </figcaption>
                  </figure>
                </div>
              </div>
            </article>
            <a className="about-section-end" href="#lo-que-sueno">
              Y TODAVÍA QUEDA CAMINO
            </a>
          </section>
          <section
            className="about-chapter about-wrap"
            id="lo-que-sueno"
            aria-labelledby="dream-title"
          >
            <div className="about-dream-layout">
              <div className="about-dream-copy">
                <span className="about-eyebrow">06 / HACIA DONDE MIRO</span>
                <h2 tabIndex={-1} id="dream-title">
                  Lo que sueño.
                </h2>
                <p>
                  Una vida sencilla, cerca de la naturaleza, con tiempo para la
                  gente que quiero, trabajo que me entusiasme y lugares que
                  todavía no conozco.
                </p>
                <p className="about-script">
                  Todavía queda mucho
                  <br />
                  por descubrir.
                </p>
              </div>
              <figure>
                <a
                  className="about-photo-button"
                  data-photo="F45"
                  data-title="Lo que sueño"
                  data-caption="Una vida sencilla, cerca de la naturaleza."
                  aria-label="Ampliar fotografía junto al lago"
                  href={aboutPhotoPath("F45")}
                >
                  <AboutImage
                    id="F45"
                    alt="Una persona de espaldas mirando un lago y las montañas"
                    sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                  />
                </a>
              </figure>
            </div>
          </section>
        </div>
      </div>
      <footer className="about-ending">
        <span className="about-eyebrow">ESTO ES LO QUE LLEVO CONMIGO</span>
        <h2>
          Mi pequeño universo
          <br />
          sigue creciendo.
        </h2>
        <a href="#constelacion">VOLVER A LA CONSTELACIÓN ↑</a>
        <Link className="about-system-return" href={`/${locale}`}>
          VOLVER A ORBIT ↗
        </Link>
        <nav className="about-neighbours" aria-label="Destinos contiguos">
          <Link href={`/${locale}/formacion`}>
            Siguiente destino · Formación / Miller →
          </Link>
        </nav>
      </footer>
    </AboutExperience>
  );
}
