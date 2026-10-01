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
}>({
  es: {
    name: "Blog",
    kicker: "BITÁCORA DE A BORDO",
    topics: { webgl: "WebGL y Three.js", nextjs: "Next.js", performance: "Rendimiento y SEO" },
    minutes: (n) => `${n} min de lectura`,
    date: dateFormat("es-DO"),
    read: "Leer la entrada",
  },
  en: {
    name: "Blog",
    kicker: "SHIP’S LOG",
    topics: { webgl: "WebGL & Three.js", nextjs: "Next.js", performance: "Performance & SEO" },
    minutes: (n) => `${n} min read`,
    date: dateFormat("en-US"),
    read: "Read the post",
  },
});
