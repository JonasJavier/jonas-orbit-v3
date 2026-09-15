/* The photographs are responsive files prepared by tools/prepare-about.mjs. */
import Link from "next/link";
import type { Locale } from "@/content/site.data";
import type { World } from "@/lib/worlds";
import { getWorldPath } from "@/lib/worlds";
import { StructuredData } from "./structured-data";
import { AboutExperience } from "./about-experience";
import { AboutImage, aboutPhotoPath } from "./about-image";
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
            <h1>
              <span className="visually-hidden">Sobre mí. </span>Mi pequeño
              universo.
            </h1>
            <p>
              Personas, lugares, ideas y momentos
              <br />
              que me hacen ser yo.
            </p>
            <p className="about-intro-note">
              Misma persona,
              <br />
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
            <a className="about-node about-node-roots" href="#raices">
              <div className="about-node-image">
                <AboutImage
                  id="E03"
                  alt="Río rodeado de vegetación en Bonao"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mis raíces</h3>
              <p>Entre ríos y montañas.</p>
            </a>
            <a className="about-node about-node-people" href="#gente">
              <div className="about-node-image">
                <AboutImage
                  id="F50"
                  alt="Jonás con su familia en una asamblea internacional"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mi gente</h3>
              <p>Con quienes comparto la vida.</p>
            </a>
            <a className="about-node about-node-self" href="#soy">
              <div className="about-node-image">
                <AboutImage
                  id="F28"
                  alt="Jonás junto al mar"
                  eager
                  sizes="(max-width: 700px) 43vw, 240px"
                />
              </div>
              <h3>Cómo soy</h3>
              <p>Curioso por naturaleza.</p>
            </a>
            <a className="about-node about-node-enjoy" href="#disfruto">
              <div className="about-node-image">
                <AboutImage
                  id="F44"
                  alt="Una gran cascada entre vegetación"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Lo que disfruto</h3>
              <p>Salir, observar y descubrir.</p>
            </a>
            <a className="about-node about-node-path" href="#camino">
              <div className="about-node-image">
                <AboutImage
                  id="F13"
                  alt="Equipo de voluntariado de mantenimiento"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Mi camino</h3>
              <p>Experiencias que llevo conmigo.</p>
            </a>
            <a className="about-node about-node-dream" href="#sueno">
              <div className="about-node-image">
                <AboutImage
                  id="F45"
                  alt="Una persona contemplando un lago entre montañas"
                  sizes="(max-width: 700px) 43vw, 240px"
                  eager
                />
              </div>
              <h3>Lo que sueño</h3>
              <p>Una vida sencilla. Mucho por explorar.</p>
            </a>
          </nav>
          <div className="about-hero-bottom">
            <a href="#raices">↓   Elige una estrella o sigue bajando</a>
            <small>
              SEIS CONSTELACIONES.
              <br />
              UNA MISMA PERSONA.
            </small>
          </div>
        </div>
      </header>
      <nav className="about-journey-nav" aria-label="Tu lugar en la historia">
        <div className="about-wrap">
          <a
            className="about-back-map"
            href="#constelacion"
            aria-label="Volver a la constelación"
          >
            ✧
          </a>
          <a href="#raices">
            <span>01</span>Mis raíces
          </a>
          <a href="#gente">
            <span>02</span>Mi gente
          </a>
          <a href="#soy">
            <span>03</span>Cómo soy
          </a>
          <a href="#disfruto">
            <span>04</span>Lo que disfruto
          </a>
          <a href="#camino">
            <span>05</span>Mi camino
          </a>
          <a href="#sueno">
            <span>06</span>Lo que sueño
          </a>
        </div>
      </nav>
      <section
        className="about-chapter about-roots about-wrap"
        id="raices"
        aria-labelledby="roots-title"
      >
        <div className="about-roots-head">
          <div>
            <span className="about-eyebrow">01 / EL PUNTO DE PARTIDA</span>
            <h2 id="roots-title">Mis raíces.</h2>
          </div>
          <p className="about-place">Bonao, República Dominicana.</p>
        </div>
        <div className="about-roots-landscape">
          <AboutImage
            id="E03"
            alt="Paisaje del río Yuna publicado por Bonao City"
            sizes="(max-width: 1400px) 94vw, 1400px"
          />
          <p className="about-roots-words">
            Crecí entre ríos
            <br />y montañas.
          </p>
        </div>
        <div className="about-roots-credit about-caption">
          <span>El paisaje de donde vengo.</span>
          <a
            href="https://bonaocity.com.do/bonao-monsenor-nouel-es-un-paraiso-para-disfrutar-a-plenitud-de-sus-rios/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Referencia fotográfica: Bonao City ↗
          </a>
        </div>
        <a className="about-section-end" href="#gente">
          Y LAS PERSONAS QUE ME ACOMPAÑAN
        </a>
      </section>
      <section
        className="about-chapter about-people"
        id="gente"
        aria-labelledby="people-title"
        data-about-sky=""
      >
        <div className="about-wrap">
          <div className="about-people-opening">
            <div className="about-people-copy">
              <span className="about-eyebrow">02 / MIS VÍNCULOS</span>
              <h2 id="people-title">Mi gente.</h2>
              <div className="about-section-lead">La vida, compartida.</div>
              <p>
                Mi madre, siempre alegre y positiva. Mi padre, trabajador y
                buena persona. Mi hermana, mi compañera y amiga.
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
              <span className="about-eyebrow">DE PEQUEÑOS → EN BETEL</span>
              <h3>
                De hablar de un sueño
                <br />a compartirlo.
              </h3>
              <p>
                De pequeños hablábamos de ir a Betel. Años después nos llamaron
                casi al mismo tiempo y terminamos compartiendo habitación. Mi
                mejor amigo, desde la infancia hasta hoy.
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
                <h3>
                  Lo que aprendí
                  <br />a su lado.
                </h3>
                <p>
                  Con mi abuelo aprendí a cultivar, cuidar animales y montar a
                  caballo. De mi abuela recuerdo su sabiduría y su humor.
                </p>
              </div>
            </article>
          </div>
          <a className="about-section-end" href="#soy">
            UN POCO MÁS DE MÍ
          </a>
        </div>
      </section>
      <section
        className="about-chapter about-wrap"
        id="soy"
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
            <h2 id="self-title">Cómo soy.</h2>
            <div className="about-section-lead">Todavía aprendiendo.</div>
            <p>
              Mis amigos me describen como alguien auténtico, tranquilo,
              humilde, amable y servicial.
            </p>
            <p>
              Soy testigo de Jehová; mi fe es una parte importante de mi vida.
              Me gusta ayudar y siempre tengo curiosidad por aprender algo
              nuevo.
            </p>
            <p className="about-script">
              También le doy muchas vueltas a las cosas. Estoy intentando
              sobrepensar menos.
            </p>
          </div>
        </div>
        <a className="about-section-end" href="#disfruto">
          LAS COSAS QUE DISFRUTO
        </a>
      </section>
      <section
        className="about-chapter about-enjoy"
        id="disfruto"
        aria-labelledby="enjoy-title"
      >
        <div className="about-wrap">
          <div className="about-enjoy-head">
            <span className="about-eyebrow">04 / FUERA DE LA RUTINA</span>
            <h2 id="enjoy-title">Lo que disfruto.</h2>
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
              <figcaption>
                <span className="about-eyebrow">EXPLORAR</span>
                <h3>Mis planes favoritos.</h3>
                <p className="about-muted" style={{ marginTop: 16 }}>
                  Caminar entre montañas, pasar el día en un río y compartir con
                  mis amigos.
                </p>
              </figcaption>
            </figure>
            <div className="about-enjoy-side">
              <div className="about-winter-row">
                <a
                  className="about-photo-button"
                  data-photo="F42"
                  data-title="Disfrutar del invierno"
                  data-caption="Otra forma de salir a descubrir."
                  aria-label="Ampliar fotografía del entorno de hielo"
                  href={aboutPhotoPath("F42")}
                >
                  <AboutImage
                    id="F42"
                    alt="Retrato en una entrada rodeada de hielo azul"
                    sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
                  />
                </a>
                <div>
                  <span className="about-eyebrow">OBSERVAR</span>
                  <h3>
                    Mirar. Detenerme.
                    <br />
                    Recordar.
                  </h3>
                  <p>
                    Me gusta fotografiar la naturaleza, fijarme en los detalles
                    y guardar un buen momento con las personas.
                  </p>
                </div>
              </div>
              <article className="about-taste">
                <span className="about-eyebrow">ESCUCHAR</span>
                <h3>La música que me acompaña.</h3>
                <p>
                  Entre lo cinematográfico, lo nostálgico y lo electrónico. Hans
                  Zimmer, Beach House y el synthwave comparten espacio en lo que
                  escucho.
                </p>
                <details>
                  <summary>Algunos nombres de mi música</summary>
                  <p>
                    Imagine Dragons · Coldplay · AURORA · Tom Odell · Narvent ·
                    Cigarettes After Sex · Kodaline · Goo Goo Dolls
                  </p>
                </details>
              </article>
              <article className="about-taste">
                <span className="about-eyebrow">HISTORIAS</span>
                <h3>Después de los créditos.</h3>
                <p>
                  Interstellar, Arrival, Batman y Spider-Man están entre mis
                  gustos. <strong>Smallville es mi serie favorita</strong>; Dark
                  me gusta mucho y también disfruto del anime.
                </p>
                <details>
                  <summary>Más historias que disfruto</summary>
                  <p>
                    Cine: Inception · The Lion King · The Dark Knight
                    <br />
                    <br />
                    Anime: Hunter × Hunter · Vinland Saga · Violet Evergarden ·
                    Psycho-Pass · Fullmetal Alchemist
                  </p>
                </details>
              </article>
            </div>
          </div>
          <a className="about-section-end" href="#camino">
            EXPERIENCIAS QUE ME HAN FORMADO
          </a>
        </div>
      </section>
      <section
        className="about-chapter about-wrap"
        id="camino"
        aria-labelledby="path-title"
      >
        <div className="about-path-head">
          <div>
            <span className="about-eyebrow">05 / EXPERIENCIAS COMPARTIDAS</span>
            <h2 id="path-title">Mi camino.</h2>
            <p className="about-section-lead">Servir. Conocer. Compartir.</p>
          </div>
          <p>
            El voluntariado en mantenimiento y el tiempo que viví en Betel son
            parte de mi historia. Recuerdo la alegría de trabajar para Jehová
            junto a los hermanos, conocer personas maravillosas y formar
            amistades que quiero conservar toda la vida.
          </p>
        </div>
        <div className="about-path-photos">
          <figure>
            <a
              className="about-photo-button"
              data-photo="F13"
              data-title="Voluntariado de mantenimiento"
              data-caption="Compartir el trabajo con los hermanos."
              aria-label="Ampliar fotografía del equipo de mantenimiento"
              href={aboutPhotoPath("F13")}
            >
              <AboutImage
                id="F13"
                alt="Grupo de voluntarios de mantenimiento reunidos en un salón"
                sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
              />
            </a>
            <figcaption className="about-caption">
              Voluntariado de mantenimiento · El equipo.
            </figcaption>
          </figure>
          <figure>
            <a
              className="about-photo-button"
              data-photo="F36"
              data-title="Voluntariado de mantenimiento"
              data-caption="Un momento de trabajo compartido."
              aria-label="Ampliar fotografía de la actividad de mantenimiento"
              href={aboutPhotoPath("F36")}
            >
              <AboutImage
                id="F36"
                alt="Voluntarios trabajando sobre una plataforma"
                sizes="(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw"
              />
            </a>
            <figcaption className="about-caption">
              Voluntariado de mantenimiento · En plena actividad.
            </figcaption>
          </figure>
        </div>
        <a className="about-section-end" href="#sueno">
          Y TODAVÍA QUEDA CAMINO
        </a>
      </section>
      <section
        className="about-chapter about-wrap"
        id="sueno"
        aria-labelledby="dream-title"
      >
        <div className="about-dream-layout">
          <div className="about-dream-copy">
            <span className="about-eyebrow">06 / HACIA DONDE MIRO</span>
            <h2 id="dream-title">Lo que sueño.</h2>
            <p>
              Una vida sencilla, cerca de la naturaleza, con tiempo para
              disfrutar de lo cotidiano y seguir explorando el mundo.
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
