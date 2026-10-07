import type { ArticleTopic } from "@/content/articles.data";
import { defineCopy } from "@/lib/i18n";

const dateFormat = (locale: string) => (iso: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

/** Texto común del índice del blog y de cada entrada. */
export const BLOG_COPY = defineCopy<{
  name: string;
  kicker: string;
  topics: Record<ArticleTopic, string>;
  minutes: (n: number) => string;
  date: (iso: string) => string;
  read: string;
  live: string;
  simulator: string;
}>({
  es: {
    name: "Blog",
    kicker: "BITÁCORA DE A BORDO",
    topics: {
      webgl: "WebGL y Three.js",
      nextjs: "Next.js",
      performance: "Rendimiento y SEO",
      space: "Espacio y física",
      freelance: "Trabajo freelance",
    },
    minutes: (n) => `${n} min de lectura`,
    date: dateFormat("es-DO"),
    read: "Leer la entrada",
    live: "Simulador 3D · en vivo",
    simulator: "Con simulador 3D",
  },
  en: {
    name: "Blog",
    kicker: "SHIP’S LOG",
    topics: {
      webgl: "WebGL & Three.js",
      nextjs: "Next.js",
      performance: "Performance & SEO",
      space: "Space & physics",
      freelance: "Freelance work",
    },
    minutes: (n) => `${n} min read`,
    date: dateFormat("en-US"),
    read: "Read the post",
    live: "3D simulator · live",
    simulator: "With a 3D simulator",
  },
});
