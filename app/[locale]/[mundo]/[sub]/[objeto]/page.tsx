import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/intent-link";
import { notFound } from "next/navigation";
import { FlatWorldBody } from "@/components/flat-world-body";
import { ObservatoryViewer } from "@/components/observatory-viewer";
import { StructuredData } from "@/components/structured-data";
import { PUBLISHED_LOCALES, isPublishedLocale, type Locale } from "@/content/site.data";
import { worldsData, type WorldId } from "@/content/worlds.data";
import { getArticles } from "@/lib/articles";
import { defineCopy } from "@/lib/i18n";
import { instrumentsFor } from "@/lib/observatory";
import { observatoryCatalog } from "@/lib/observatory-catalog";
import { specimenImage } from "@/lib/observatory-images";
import { OBSERVATORY_IDS, observatoryIdBySlug, observatorySlug } from "@/lib/observatory-slugs";
import { articlePath, observatoryPath, pageAlternatesMetadata, worldPath } from "@/lib/page-paths";
import { PATH_SEGMENTS } from "@/lib/path-segments";
import { siteOpenGraph } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld, getWorldBySlug } from "@/lib/worlds";

/**
 * El Observatorio: un espécimen, pantalla completa.
 *
 * Ruta anidada bajo `/es/experimentos` (`/en/experiments/observatory/…` en
 * inglés), que desde este pase es la RECEPCIÓN del
 * laboratorio y no la ficha editorial de la sección. `findWorldRoute` casa por
 * prefijo, de modo que esta ruta ya se resuelve al mundo `tesseract`: con él en
 * `COVERED_WORLDS` y con `isObservatoryPath`, la escena persistente ni dibuja
 * ni retiene su contexto mientras el visitante está aquí.
 *
 * ── Rule 7 ──────────────────────────────────────────────────────────────────
 *
 * El canvas es la representación visual principal, nunca la única
 * representación semántica. El HTML servido trae nombre, ficha, esquema del
 * cuerpo y salida sin una línea de JavaScript.
 *
 * ── Y la cara servida ya no es un respaldo ──────────────────────────────────
 *
 * Hasta este pase el visor TAPABA ese HTML con un rectángulo negro
 * `fixed; inset: 0` en cuanto hidrataba, que es la definición de un modal. Ahora
 * la cara servida entra DENTRO del instrumento como su estado en frío: sostiene
 * la pantalla mientras el contexto WebGL monta —`INSTRUMENTO · EN ESPERA`— y
 * cede el sitio al espécimen cuando hay primer fotograma. La misma pieza sirve
 * para el visitante sin JavaScript, para el equipo modesto y para el segundo y
 * medio que tarda cualquiera en encender el aparato.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_LOCALES.flatMap((locale) =>
    OBSERVATORY_IDS.map((id) => ({
      locale,
      mundo: getWorld("tesseract", locale).prose.slug,
      sub: PATH_SEGMENTS.observatory[locale],
      objeto: observatorySlug(id, locale),
    })),
  );
}

type Props = { params: Promise<{ locale: string; mundo: string; sub: string; objeto: string }> };

/** Dos dígitos: es tipografía de instrumento, no dato. */
const pad = (n: number) => String(n).padStart(2, "0");

const COPY = defineCopy({
  es: {
    title: (name: string) => `${name} en 3D · Observatorio`,
    description: (name: string) =>
      `${name} en 3D interactivo: un espécimen del observatorio de experimentos WebGL de Jonás Javier, para ver de cerca su geometría, material y luz.`,
    workName: (name: string) => `${name} en 3D`,
    genre: "Experimento interactivo en WebGL",
    observatory: "Observatorio",
    specimen: (index: number, total: number) => `Espécimen ${index} de ${total}`,
    instrument: "Instrumento",
    standby: "En espera",
    unavailable: "no disponible",
    back: "Volver a Experimentos",
    /** La entrada del blog que cuenta cómo está hecho, si la hay. */
    read: "Cómo está hecho",
    /** Los mandos del banco, en el orden en que los presenta el instrumento. */
    instruments: {
      bloom: "Bloom",
      material: "Material",
      datos: "Datos",
      // Los tres de Gargantúa: ramas reales del raymarch, no adornos.
      doppler: "Doppler",
      secundarias: "Secundarias",
      lente: "Lente",
      registro: "Registro",
    } as Record<string, string>,
  },
  en: {
    title: (name: string) => `${name} in 3D · Observatory`,
    description: (name: string) =>
      `${name} in interactive 3D: a specimen from Jonás Javier’s WebGL experiments observatory, built to study its geometry, material and light up close.`,
    workName: (name: string) => `${name} in 3D`,
    genre: "Interactive WebGL experiment",
    observatory: "Observatory",
    specimen: (index: number, total: number) => `Specimen ${index} of ${total}`,
    instrument: "Instrument",
    standby: "Standby",
    unavailable: "unavailable",
    back: "Back to Experiments",
    read: "How it’s built",
    instruments: {
      bloom: "Bloom",
      material: "Material",
      datos: "Data",
      doppler: "Doppler",
      secundarias: "Secondary images",
      lente: "Lens",
      registro: "Log",
    },
  },
});

/** El espécimen detrás de la URL, si la URL es de verdad el Observatorio. */
function resolveSpecimen(locale: Locale, mundo: string, sub: string, objeto: string): WorldId | undefined {
  if (getWorldBySlug(mundo, locale)?.id !== "tesseract") return undefined;
  if (sub !== PATH_SEGMENTS.observatory[locale]) return undefined;
  return observatoryIdBySlug(objeto, locale);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, mundo, sub, objeto } = await params;
  if (!isPublishedLocale(locale)) return {};
  const id = resolveSpecimen(locale, mundo, sub, objeto);
  if (!id) return {};
  const copy = COPY[locale];
  const world = getWorld(id, locale);
  const title = world.prose.observatory?.seoTitle ?? copy.title(world.cosmicName);
  const description = world.prose.observatory?.seoDescription ?? copy.description(world.cosmicName);
  return {
    title,
    description,
    // El §1.3 vende «mira la Endurance» como enlace compartible dentro de una
    // candidatura. Un enlace compartible que ningún buscador conoce y que no
    // declara su canónica es sólo una URL que funciona por casualidad.
    alternates: pageAlternatesMetadata({ kind: "observatory", id }, locale),
    openGraph: {
      ...siteOpenGraph(locale),
      title,
      description,
      url: observatoryPath(id, locale),
      // La captura real del espécimen, no la tarjeta genérica de la portada:
      // quien comparte «mira la Endurance» tiene que ver la Endurance.
      images: [{ url: specimenImage(id, "og"), width: 1200, height: 630, type: "image/jpeg", alt: copy.workName(world.cosmicName) }],
    },
  };
}

export default async function ObservatoryRoute({ params }: Props) {
  const { locale, mundo, sub, objeto } = await params;
  if (!isPublishedLocale(locale)) notFound();

  const id = resolveSpecimen(locale, mundo, sub, objeto);
  if (!id) notFound();

  const typedLocale: Locale = locale;
  const copy = COPY[typedLocale];
  const world = getWorld(id, typedLocale);
  const structure = worldsData[id];
  const indexHref = worldPath("tesseract", typedLocale);

  /*
    El catálogo sale del módulo compartido y ya no se arma aquí.

    La recepción y el raíl del instrumento tienen que numerar igual: si la fila
    `03` de `/es/experimentos` llevara a «Espécimen 4 de 6», la lectura mentiría
    y nadie lo vería hasta montar el tercer espécimen. Una sola composición y
    una sola regla, que es lo que dejó llegar a las seis sin renumerar nada por
    el camino.
  */
  const catalog = observatoryCatalog(typedLocale);
  const rail = catalog.map(({ id: slot, index, name, href }) => ({
    id: slot,
    index,
    name,
    href,
  }));

  const entry = catalog.find((slot) => slot.id === id)!;
  const observatory = world.prose.observatory;
  const descriptor = observatory?.descriptor ?? world.prose.eyebrow;

  /*
    Los mandos que TENDRÁ esta muestra, dichos en frío.

    Salen de `instrumentsFor` —que cubre los SEIS— más `Registro`, que no es una
    capacidad de la escena sino contenido escrito. No se listan mandos que luego
    no aparezcan: un aparato que promete en frío lo que no da encendido es peor
    que uno mudo.

    Antes esto leía `preset.instruments`, y ahí estaba el defecto que la sexta
    muestra destapó: `OBSERVATION_PRESETS` excluye a Gargantúa a propósito —no
    recibe ninguna luz añadida— así que montarla habría reventado esta línea en
    el build. La salida no era darle un preset, era separar «cómo se ilumina»
    de «qué se puede hacer con ella».
  */
  const bank = [
    ...instrumentsFor(id).map((key) => copy.instruments[key] ?? key),
    ...(observatory?.registro ? [copy.instruments.registro] : []),
  ];

  const path = observatoryPath(id, typedLocale);
  // La entrada del blog que explica este espécimen (`specimen` en
  // `articles.data.ts`): el enlace de ida para quien quiere saber cómo se hizo.
  const articles = getArticles(typedLocale).filter((entry) => entry.specimen === id);
  const article = articles.find((entry) => entry.topic === "webgl") ?? articles[0];
  const articleHref = article ? articlePath(article.id, typedLocale) : null;

  return (
    <main className="observatory-route" id="main-content">
      <StructuredData
        locale={typedLocale}
        breadcrumb={[
          { path: indexHref, name: getWorld("tesseract", typedLocale).prose.title },
          { path, name: world.cosmicName },
        ]}
        work={{
          "@type": "CreativeWork",
          "@id": `${absoluteUrl(path)}#especimen`,
          name: copy.workName(world.cosmicName),
          genre: copy.genre,
          description: observatory?.seoDescription ?? copy.description(world.cosmicName),
          url: absoluteUrl(path),
          image: absoluteUrl(specimenImage(id, "1600")),
          ...(articleHref ? { subjectOf: { "@id": `${absoluteUrl(articleHref)}#entrada` } } : {}),
        }}
      />
      <ObservatoryViewer
        key={id}
        descriptor={descriptor}
        indexHref={indexHref}
        articleHref={articleHref}
        name={world.cosmicName}
        rail={rail}
        record={observatory?.registro ?? null}
        world={{
          id,
          visual: structure.visual,
          accent: structure.accent,
          secondary: structure.secondary,
          placement: structure.placement,
        }}
      >
        {/*
          LA CARA SERVIDA — el instrumento antes de encenderse.

          Va como `children` porque esto es un componente de servidor y es el
          único sitio donde se puede leer contenido. El visor recibe una pieza
          ya resuelta y no sabe ni qué es un MDX ni cómo se compone un catálogo.
        */}
        <div className="observatory-face">
          <div className="observatory-face__head">
            <p className="observatory-face__eyebrow">
              {copy.observatory}
              <span aria-hidden="true" className="observatory-face__sep">
                ·
              </span>
              <span className="sr-only">
                {copy.specimen(entry.index, catalog.length)}
              </span>
              <span aria-hidden="true">
                {pad(entry.index)} / {pad(catalog.length)}
              </span>
            </p>
            <h1 className="observatory-route__title">{world.cosmicName}</h1>
            <p className="observatory-face__descriptor">{descriptor}</p>
            {entry.pair ? (
              <p className="observatory-face__pair">{entry.pair}</p>
            ) : null}
          </div>

          {/*
            EL ESQUEMA, y es la misma figura de los dos extremos del salto: la
            que dibuja la fila del índice en la recepción y la que dibuja aquí
            el espécimen mientras no hay imagen.

            No es un marcador de carga. Es la otra representación del mismo
            cuerpo —la que existe sin GPU, sin WebGL y sin JavaScript— y por eso
            la continuidad al encender el instrumento es «representación →
            observación» y no «página → cargando → aplicación 3D».
          */}
          <div className="observatory-face__figure" aria-hidden="true">
            <FlatWorldBody
              world={{
                id,
                visual: structure.visual,
                accent: structure.accent,
                secondary: structure.secondary,
              }}
            />
          </div>

          <div className="observatory-face__foot">
            <p className="observatory-face__state">
              <span aria-hidden="true" className="observatory-face__dot" />
              {copy.instrument}
              <span aria-hidden="true" className="observatory-face__sep">
                ·
              </span>
              {copy.standby}
            </p>
            <p className="observatory-route__summary">
              {observatory?.summary ?? world.prose.summary}
            </p>

            <ul className="observatory-face__bank">
              {bank.map((label) => (
                <li key={label}>
                  <span className="observatory-face__mando">{label}</span>
                  <span className="observatory-face__estado">
                    {copy.unavailable}
                  </span>
                </li>
              ))}
            </ul>

            <p className="observatory-face__exit">
              <Link href={indexHref}>{copy.back}</Link>
            </p>
            {articleHref ? (
              <p className="observatory-face__read">
                <Link href={articleHref}>{copy.read}</Link>
              </p>
            ) : null}
          </div>
        </div>
      </ObservatoryViewer>
    </main>
  );
}
