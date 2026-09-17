import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlatWorldBody } from "@/components/flat-world-body";
import { ObservatoryViewer } from "@/components/observatory-viewer";
import { PUBLISHED_LOCALES, type Locale } from "@/content/site.data";
import { worldsData } from "@/content/worlds.data";
import { OBSERVATION_PRESETS } from "@/lib/observatory";
import {
  observatoryCatalog,
  OBSERVATORY_SLUGS,
} from "@/lib/observatory-catalog";
import { absoluteUrl } from "@/lib/site-url";
import { getWorld } from "@/lib/worlds";

/**
 * El Observatorio: un espécimen, pantalla completa.
 *
 * Ruta anidada bajo `/es/experimentos`, que desde este pase es la RECEPCIÓN del
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
    Object.keys(OBSERVATORY_SLUGS).map((objeto) => ({ locale, objeto })),
  );
}

type Props = { params: Promise<{ locale: string; objeto: string }> };

/** Dos dígitos: es tipografía de instrumento, no dato. */
const pad = (n: number) => String(n).padStart(2, "0");

/** Los mandos del banco, en el orden en que los presenta el instrumento. */
const INSTRUMENT_LABELS: Record<string, string> = {
  bloom: "Bloom",
  material: "Material",
  datos: "Datos",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, objeto } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) return {};
  const id = OBSERVATORY_SLUGS[objeto];
  if (!id) return { title: "Espécimen no encontrado" };
  const world = getWorld(id, locale as Locale);
  const path = `/${locale}/experimentos/observatorio/${objeto}`;
  return {
    title: `${world.cosmicName} · Observatorio`,
    description: `Observación de cerca de ${world.cosmicName}: geometría, material e iluminación.`,
    // El §1.3 vende «mira la Endurance» como enlace compartible dentro de una
    // candidatura. Un enlace compartible que ningún buscador conoce y que no
    // declara su canónica es sólo una URL que funciona por casualidad.
    alternates: { canonical: absoluteUrl(path) },
  };
}

export default async function ObservatoryRoute({ params }: Props) {
  const { locale, objeto } = await params;
  if (!PUBLISHED_LOCALES.includes(locale as Locale)) notFound();

  const id = OBSERVATORY_SLUGS[objeto];
  if (!id) notFound();

  const typedLocale = locale as Locale;
  const world = getWorld(id, typedLocale);
  const structure = worldsData[id];
  const indexHref = `/${typedLocale}/experimentos`;

  /*
    El catálogo sale del módulo compartido y ya no se arma aquí.

    La recepción y el raíl del instrumento tienen que numerar igual: si la fila
    `03` de `/es/experimentos` llevara a «Espécimen 4 de 6», la lectura mentiría
    y nadie lo vería hasta montar el tercer espécimen. Una sola composición,
    una sola regla honesta para las cuatro que aún no se observan.
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
  const preset = OBSERVATION_PRESETS[id as keyof typeof OBSERVATION_PRESETS];

  /*
    Los mandos que TENDRÁ esta muestra, dichos en frío.

    Salen de `preset.instruments` —la tabla del §6, que declara qué puede hacer
    la escena con cada cuerpo— más `Registro`, que no es una capacidad de la
    escena sino contenido escrito. No se listan mandos que luego no aparezcan:
    un aparato que promete en frío lo que no da encendido es peor que uno mudo.
  */
  const bank = [
    ...preset.instruments.map((key) => INSTRUMENT_LABELS[key] ?? key),
    ...(observatory?.registro ? ["Registro"] : []),
  ];

  return (
    <main className="observatory-route" id="main-content">
      <ObservatoryViewer
        key={id}
        descriptor={descriptor}
        indexHref={indexHref}
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
              Observatorio
              <span aria-hidden="true" className="observatory-face__sep">
                ·
              </span>
              <span className="sr-only">
                Espécimen {entry.index} de {catalog.length}
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
              Instrumento
              <span aria-hidden="true" className="observatory-face__sep">
                ·
              </span>
              En espera
            </p>
            <p className="observatory-route__summary">{world.prose.summary}</p>

            <ul className="observatory-face__bank">
              {bank.map((label) => (
                <li key={label}>
                  <span className="observatory-face__mando">{label}</span>
                  <span className="observatory-face__estado">
                    no disponible
                  </span>
                </li>
              ))}
            </ul>

            <p className="observatory-face__exit">
              <Link href={indexHref}>Volver a Experimentos</Link>
            </p>
          </div>
        </div>
      </ObservatoryViewer>
    </main>
  );
}
