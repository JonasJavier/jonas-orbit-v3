import Image from "next/image";

/**
 * Logo de la institución que emite un certificado, como en el CV: una
 * baldosa blanca junto al nombre. Sólo las que tienen logo propio en
 * `public/education/logos/`; el resto se queda con el nombre.
 *
 * Decorativo: el nombre de la institución va escrito al lado.
 */
const LOGOS: { match: RegExp; src: string }[] = [
  { match: /^Harvard University/, src: "/education/logos/harvard.webp" },
  { match: /^EducaciónIT/, src: "/education/logos/educacion-it.webp" },
];

export function issuerLogo(issuer: string): string | undefined {
  return LOGOS.find((logo) => logo.match.test(issuer))?.src;
}

export function IssuerLogo({ issuer }: { issuer: string }) {
  const src = issuerLogo(issuer);
  if (!src) return null;
  return (
    <span className="miller-issuer-logo" aria-hidden="true">
      <Image src={src} alt="" width={48} height={48} unoptimized />
    </span>
  );
}
